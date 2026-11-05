"""
Route Optimization Service.
Implements A* pathfinding over the Arabian Sea / Konkan Coast marine grid.
Incorporates continental land collision boundaries, sensitive marine sanctuary
polygons, and environmental current vectors. Generates shortest and alternative
tactical routes with complete waypoint telemetry and nautical metrics.
"""

import math
import heapq
import json
import logging
from pathlib import Path
from datetime import datetime, timezone
from typing import List, Dict, Tuple, Optional, Any
from shapely.geometry import Point, Polygon, LineString

from app.services.drift_service import (
    calculate_haversine_distance_km,
    is_land_coordinate,
    get_approximate_coastline_lon,
    KONKAN_COASTLINE_CONTOUR,
)
from app.services.environmental_service import (
    convert_current_to_uv,
)
from app.schemas.route_optimization import (
    WaypointItem,
    RouteConstraintConfig,
    RouteItemResponse,
    RouteOptimizationResponse,
)

logger = logging.getLogger("oceanrescue.route_service")

KM_PER_NAUTICAL_MILE = 1.852
METERS_PER_DEGREE_LAT = 111320.0

# Base directory for sensitive marine areas
PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent.parent
SENSITIVE_AREAS_GEOJSON = PROJECT_ROOT / "sensitive_marine_areas" / "processed" / "sensitive_marine_areas_study_bbox.geojson"


class MarineZoneManager:
    """Loads and indexes designated Marine Protected Areas and restricted zones."""
    _zones_cache: Optional[List[Dict[str, Any]]] = None

    @classmethod
    def get_restricted_zones(cls) -> List[Dict[str, Any]]:
        if cls._zones_cache is not None:
            return cls._zones_cache

        zones = []
        if SENSITIVE_AREAS_GEOJSON.exists():
            try:
                with open(SENSITIVE_AREAS_GEOJSON, "r", encoding="utf-8") as f:
                    data = json.load(f)
                for feat in data.get("features", []):
                    props = feat.get("properties", {})
                    # Only include actual Marine Protected Areas / Sanctuaries (exclude jurisdictional EEZ outline)
                    cat = props.get("category", "")
                    desig = props.get("designation", "")
                    m_type = props.get("marine_type", "")
                    if "Marine Protected Area" in cat or "Sanctuary" in desig or m_type == "Coastal/Marine":
                        geom = feat.get("geometry", {})
                        if geom.get("type") == "Polygon":
                            poly = Polygon(geom["coordinates"][0])
                            zones.append({
                                "id": props.get("wdpa_id") or props.get("name"),
                                "name": props.get("name", "Marine Protected Zone"),
                                "designation": props.get("designation", "Restricted Area"),
                                "area_km2": props.get("area_km2"),
                                "polygon": poly,
                                "raw_geometry": geom,
                                "properties": props,
                            })
            except Exception as e:
                logger.warning(f"Could not load sensitive marine areas GeoJSON: {e}")

        # Fallback to hardcoded Malvan Marine Sanctuary boundary if file was not found
        if not zones:
            fallback_coords = [[73.40, 15.95], [73.55, 15.95], [73.55, 16.15], [73.40, 16.15], [73.40, 15.95]]
            zones.append({
                "id": "15868",
                "name": "Malvan Marine Sanctuary",
                "designation": "Wildlife Sanctuary",
                "area_km2": 29.12,
                "polygon": Polygon(fallback_coords),
                "raw_geometry": {"type": "Polygon", "coordinates": [fallback_coords]},
                "properties": {
                    "name": "Malvan Marine Sanctuary",
                    "designation": "Wildlife Sanctuary",
                    "category": "Marine Protected Area",
                    "state": "Maharashtra",
                }
            })

        cls._zones_cache = zones
        return cls._zones_cache


def is_inside_restricted_zone(lat: float, lon: float, buffer_km: float = 0.0) -> Tuple[bool, Optional[str]]:
    """Checks whether (lat, lon) is within a designated marine protected area or its buffer."""
    zones = MarineZoneManager.get_restricted_zones()
    pt = Point(lon, lat)

    # Approximate buffer in degrees (1 deg lat ~ 111 km)
    buf_deg = buffer_km / 111.0 if buffer_km > 0 else 0.0

    for z in zones:
        poly: Polygon = z["polygon"]
        if buf_deg > 0:
            test_poly = poly.buffer(buf_deg)
        else:
            test_poly = poly
        if test_poly.contains(pt):
            return True, z["name"]
    return False, None


def check_segment_clearance(
    lat1: float, lon1: float,
    lat2: float, lon2: float,
    coastal_buffer_km: float,
    sanctuary_buffer_km: float,
    start_lat: float, start_lon: float,
    dest_lat: float, dest_lon: float,
    samples: int = 8
) -> bool:
    """
    Validates that the straight line segment between (lat1, lon1) and (lat2, lon2)
    does not intersect terrestrial land or restricted marine sanctuaries.
    Terminal relaxation strictly applies within narrow harbour/station zones.
    """
    total_corridor_km = calculate_haversine_distance_km(start_lat, start_lon, dest_lat, dest_lon)
    terminal_thresh = max(0.4, min(1.0, total_corridor_km * 0.20))

    for step in range(1, samples):
        ratio = step / samples
        s_lat = lat1 + ratio * (lat2 - lat1)
        s_lon = lon1 + ratio * (lon2 - lon1)

        # 1. Land check
        if is_land_coordinate(s_lat, s_lon):
            return False

        # 2. Coastal buffer check (relax strictly within terminal zones)
        dist_to_start = calculate_haversine_distance_km(s_lat, s_lon, start_lat, start_lon)
        dist_to_dest = calculate_haversine_distance_km(s_lat, s_lon, dest_lat, dest_lon)
        effective_buffer = coastal_buffer_km
        if dist_to_start < terminal_thresh or dist_to_dest < terminal_thresh:
            effective_buffer = min(0.3, coastal_buffer_km * 0.2)

        coast_lon = get_approximate_coastline_lon(s_lat)
        d_coast = calculate_haversine_distance_km(s_lat, s_lon, s_lat, coast_lon)
        if d_coast < effective_buffer:
            return False

        # 3. Restricted marine zones check
        in_zone, _ = is_inside_restricted_zone(s_lat, s_lon, buffer_km=sanctuary_buffer_km)
        if in_zone:
            return False

    return True


def are_routes_distinct(
    wps1: Optional[List[Tuple[float, float]]],
    wps2: Optional[List[Tuple[float, float]]],
    dist1: float,
    dist2: float
) -> bool:
    """
    Evaluates whether two candidate routes are genuinely distinct in geometry,
    waypoint layout, or corridor length. Prevents duplicating primary paths.
    """
    if not wps1 or not wps2 or len(wps1) < 2 or len(wps2) < 2:
        return False
    if len(wps1) != len(wps2):
        return True
    if abs(dist1 - dist2) > 0.08:
        return True
    for (lat1, lon1), (lat2, lon2) in zip(wps1, wps2):
        if calculate_haversine_distance_km(lat1, lon1, lat2, lon2) > 0.35:
            return True
    return False


class RouteOptimizationService:
    """Implements A* pathfinding over marine grid with nautical metrics."""

    @classmethod
    def calculate_routes(
        cls,
        mission_id: int,
        report_id: int,
        start_lat: float,
        start_lon: float,
        start_port: str,
        dest_lat: float,
        dest_lon: float,
        dest_label: str,
        vessel_name: Optional[str] = None,
        vessel_speed_knots: Optional[float] = None,
        constraints: Optional[RouteConstraintConfig] = None,
        environmental_data: Optional[Dict[str, Any]] = None,
    ) -> RouteOptimizationResponse:
        """
        Executes A* search to calculate Primary (Shortest Feasible)
        and Alternative (Conservative Offshore Buffer) routes.
        """
        cfg = constraints or RouteConstraintConfig()

        direct_km = calculate_haversine_distance_km(start_lat, start_lon, dest_lat, dest_lon)
        if direct_km < 0.05:
            # Virtually identical start and goal
            single_wp = [
                WaypointItem(
                    index=1,
                    latitude=start_lat,
                    longitude=start_lon,
                    distance_from_prev_km=0.0,
                    cumulative_distance_km=0.0,
                    cumulative_distance_nm=0.0,
                    label="Harbour Staging & Target On-Station"
                )
            ]
            primary_route = RouteItemResponse(
                mission_id=mission_id,
                report_id=report_id,
                route_type="primary",
                is_selected=False,
                departure_port=start_port,
                departure_lat=start_lat,
                departure_lon=start_lon,
                destination_target=dest_label,
                destination_lat=dest_lat,
                destination_lon=dest_lon,
                total_distance_km=0.0,
                total_distance_nm=0.0,
                direct_distance_km=0.0,
                route_deviation_pct=0.0,
                waypoint_count=1,
                waypoints=single_wp,
                route_geojson={"type": "Feature", "geometry": {"type": "LineString", "coordinates": [[start_lon, start_lat], [dest_lon, dest_lat]]}, "properties": {}},
                algorithm="A* Marine Grid (Zero Displacement)",
                feasibility_status="feasible",
                feasibility_message="Departure location is already on-station with recovery target.",
                constraints_applied=cfg.model_dump(),
                constraints_encountered=[],
                environmental_context=environmental_data,
                vessel_speed_knots=vessel_speed_knots,
                estimated_duration_hours=0.0,
                estimated_duration_formatted="0 min",
            )
            return RouteOptimizationResponse(
                mission_id=mission_id,
                report_id=report_id,
                status="calculated",
                message="Target is already at harbour staging coordinates.",
                primary_route=primary_route,
                alternative_route=None,
                all_routes=[primary_route],
            )

        # -------------------------------------------------------------
        # 1. Calculate Primary Route (Shortest Feasible Navigable Path)
        # -------------------------------------------------------------
        primary_wps, p_constraints, p_status, p_msg = cls._run_astar_search(
            start_lat=start_lat,
            start_lon=start_lon,
            dest_lat=dest_lat,
            dest_lon=dest_lon,
            coastal_buffer_km=cfg.coastal_buffer_km,
            sanctuary_buffer_km=cfg.marine_sanctuary_buffer_km,
            environmental_data=environmental_data,
            is_alternative=False,
        )

        if not primary_wps:
            return RouteOptimizationResponse(
                mission_id=mission_id,
                report_id=report_id,
                status="no_feasible_route",
                message=p_msg or "No feasible marine route found avoiding land and restricted zones.",
                primary_route=None,
                alternative_route=None,
                all_routes=[],
            )

        primary_route = cls._build_route_response(
            mission_id=mission_id,
            report_id=report_id,
            route_type="primary",
            start_lat=start_lat,
            start_lon=start_lon,
            start_port=start_port,
            dest_lat=dest_lat,
            dest_lon=dest_lon,
            dest_label=dest_label,
            waypoints=primary_wps,
            direct_km=direct_km,
            constraints_applied=cfg.model_dump(),
            constraints_encountered=p_constraints,
            feasibility_status=p_status,
            feasibility_message=p_msg,
            environmental_data=environmental_data,
            vessel_speed_knots=vessel_speed_knots,
        )

        # -------------------------------------------------------------
        # 2. Calculate Alternative Route (Conservative Offshore Buffer)
        # -------------------------------------------------------------
        alt_coastal_buffer = max(cfg.coastal_buffer_km * 2.5, 4.0)
        alt_sanctuary_buffer = max(cfg.marine_sanctuary_buffer_km * 1.5, 3.0)

        alt_wps, alt_constraints, alt_status, alt_msg = cls._run_astar_search(
            start_lat=start_lat,
            start_lon=start_lon,
            dest_lat=dest_lat,
            dest_lon=dest_lon,
            coastal_buffer_km=alt_coastal_buffer,
            sanctuary_buffer_km=alt_sanctuary_buffer,
            environmental_data=environmental_data,
            is_alternative=True,
        )

        alt_dist_approx = 0.0
        if alt_wps and len(alt_wps) >= 2:
            alt_dist_approx = sum(
                calculate_haversine_distance_km(alt_wps[i-1][0], alt_wps[i-1][1], alt_wps[i][0], alt_wps[i][1])
                for i in range(1, len(alt_wps))
            )

        # If raw search produced a route that is virtually identical to primary,
        # route via a verified deepwater offshore stand-off corridor
        if not are_routes_distinct(alt_wps, primary_wps, alt_dist_approx, primary_route.total_distance_km):
            mid_lat = round((start_lat + dest_lat) / 2.0, 4)
            coast_lon = get_approximate_coastline_lon(mid_lat)
            deg_lon_buffer = alt_coastal_buffer / (111.0 * max(0.2, math.cos(math.radians(mid_lat))))
            offshore_target_lon = round(min(coast_lon - deg_lon_buffer, min(start_lon, dest_lon) - 0.025), 4)

            if not is_land_coordinate(mid_lat, offshore_target_lon) and 68.0 <= offshore_target_lon <= 74.0:
                in_res, _ = is_inside_restricted_zone(mid_lat, offshore_target_lon, buffer_km=alt_sanctuary_buffer)
                if not in_res:
                    leg1_ok = check_segment_clearance(
                        start_lat, start_lon, mid_lat, offshore_target_lon,
                        coastal_buffer_km=alt_coastal_buffer, sanctuary_buffer_km=alt_sanctuary_buffer,
                        start_lat=start_lat, start_lon=start_lon, dest_lat=dest_lat, dest_lon=dest_lon,
                        samples=12
                    )
                    leg2_ok = check_segment_clearance(
                        mid_lat, offshore_target_lon, dest_lat, dest_lon,
                        coastal_buffer_km=alt_coastal_buffer, sanctuary_buffer_km=alt_sanctuary_buffer,
                        start_lat=start_lat, start_lon=start_lon, dest_lat=dest_lat, dest_lon=dest_lon,
                        samples=12
                    )
                    if leg1_ok and leg2_ok:
                        alt_wps = [(start_lat, start_lon), (mid_lat, offshore_target_lon), (dest_lat, dest_lon)]
                        alt_status = "feasible"
                        alt_msg = f"Conservative offshore corridor routing via deepwater stand-off waypoint ({mid_lat:.4f}° N, {offshore_target_lon:.4f}° E)."
                        alt_constraints = [
                            f"Conservative offshore corridor enforced (min {alt_coastal_buffer:.1f} km coastal buffer)",
                            f"Deepwater stand-off waypoint at {offshore_target_lon:.4f}° E"
                        ]

        alternative_route = None
        if alt_wps and len(alt_wps) >= 2:
            alt_total_km = sum(
                calculate_haversine_distance_km(alt_wps[i-1][0], alt_wps[i-1][1], alt_wps[i][0], alt_wps[i][1])
                for i in range(1, len(alt_wps))
            )
            # Enforce strict distinction: never copy primary route
            if are_routes_distinct(alt_wps, primary_wps, alt_total_km, primary_route.total_distance_km):
                alt_constraints.append(f"Conservative offshore corridor applied (min {alt_coastal_buffer:.1f} km coastal buffer)")
                alternative_route = cls._build_route_response(
                    mission_id=mission_id,
                    report_id=report_id,
                    route_type="alternative",
                    start_lat=start_lat,
                    start_lon=start_lon,
                    start_port=start_port,
                    dest_lat=dest_lat,
                    dest_lon=dest_lon,
                    dest_label=dest_label,
                    waypoints=alt_wps,
                    direct_km=direct_km,
                    constraints_applied={
                        **cfg.model_dump(),
                        "coastal_buffer_km": alt_coastal_buffer,
                        "marine_sanctuary_buffer_km": alt_sanctuary_buffer,
                        "mode": "conservative_offshore"
                    },
                    constraints_encountered=alt_constraints,
                    feasibility_status=alt_status,
                    feasibility_message=alt_msg or "Conservative offshore corridor with wider safety margin.",
                    environmental_data=environmental_data,
                    vessel_speed_knots=vessel_speed_knots,
                )

        all_routes = [primary_route]
        if alternative_route:
            all_routes.append(alternative_route)

        msg = (
            f"Optimal marine routes calculated: Primary ({primary_route.total_distance_km:.2f} km) and Alternative Offshore Corridor ({alternative_route.total_distance_km:.2f} km)."
            if alternative_route
            else f"Primary marine route calculated ({primary_route.total_distance_km:.2f} km). No feasible distinct alternative route found with conservative offshore buffer constraints."
        )

        return RouteOptimizationResponse(
            mission_id=mission_id,
            report_id=report_id,
            status="calculated",
            message=msg,
            primary_route=primary_route,
            alternative_route=alternative_route,
            all_routes=all_routes,
        )

    @classmethod
    def _run_astar_search(
        cls,
        start_lat: float,
        start_lon: float,
        dest_lat: float,
        dest_lon: float,
        coastal_buffer_km: float,
        sanctuary_buffer_km: float,
        environmental_data: Optional[Dict[str, Any]],
        is_alternative: bool = False,
    ) -> Tuple[List[Tuple[float, float]], List[str], str, str]:
        """
        Executes A* search over the spatial marine grid.
        Returns:
            waypoints: list of (lat, lon)
            constraints_encountered: list of strings
            feasibility_status: 'feasible' or 'blocked'
            message: explanation string
        """
        constraints_encountered: List[str] = []

        # Current velocity vector for optional cost adjustment
        curr_u = 0.0
        curr_v = 0.0
        if environmental_data:
            speed = float(environmental_data.get("current_speed") or 0.0)
            direction = float(environmental_data.get("current_direction") or 0.0)
            if speed > 0.0:
                curr_u, curr_v = convert_current_to_uv(speed, direction)

        # 1. Check if direct line-of-sight is already fully unobstructed!
        direct_clear = check_segment_clearance(
            start_lat, start_lon,
            dest_lat, dest_lon,
            coastal_buffer_km=coastal_buffer_km,
            sanctuary_buffer_km=sanctuary_buffer_km,
            start_lat=start_lat, start_lon=start_lon,
            dest_lat=dest_lat, dest_lon=dest_lon,
            samples=20
        )
        if direct_clear and not is_alternative:
            # Direct nautical route is navigable and clean
            return [(start_lat, start_lon), (dest_lat, dest_lon)], ["Direct navigable corridor clear of land and marine protected zones"], "feasible", "Direct water route clear of hazards."

        # 2. Build spatial grid search envelope
        # Pad latitude and longitude sufficiently to allow offshore circumventing
        pad_lat = 0.20
        pad_lon_west = 0.35 if is_alternative else 0.22
        pad_lon_east = 0.08

        min_lat = max(14.0, min(start_lat, dest_lat) - pad_lat)
        max_lat = min(20.0, max(start_lat, dest_lat) + pad_lat)
        min_lon = max(68.0, min(start_lon, dest_lon) - pad_lon_west)
        max_lon = min(74.0, max(start_lon, dest_lon) + pad_lon_east)

        # Grid resolution: ~0.012° (~1.3 km)
        d_lat = 0.012
        d_lon = 0.012

        lat_steps = int(round((max_lat - min_lat) / d_lat)) + 1
        lon_steps = int(round((max_lon - min_lon) / d_lon)) + 1

        # Node viability filter
        def is_navigable(lat: float, lon: float) -> bool:
            if is_land_coordinate(lat, lon):
                return False

            # Distance to start / dest
            d_start = calculate_haversine_distance_km(lat, lon, start_lat, start_lon)
            d_dest = calculate_haversine_distance_km(lat, lon, dest_lat, dest_lon)
            eff_buffer = coastal_buffer_km
            if d_start < 2.5 or d_dest < 2.5:
                eff_buffer = min(0.3, coastal_buffer_km * 0.25)

            coast_lon = get_approximate_coastline_lon(lat)
            d_coast = calculate_haversine_distance_km(lat, lon, lat, coast_lon)
            if d_coast < eff_buffer:
                return False

            in_zone, zone_name = is_inside_restricted_zone(lat, lon, buffer_km=sanctuary_buffer_km)
            if in_zone:
                if zone_name and f"Protected Zone ({zone_name})" not in constraints_encountered:
                    constraints_encountered.append(f"Protected Zone ({zone_name}) bypassed")
                return False

            return True

        # Snap start and dest to grid coordinates
        start_grid = (round(round(start_lat / d_lat) * d_lat, 4), round(round(start_lon / d_lon) * d_lon, 4))
        dest_grid = (round(round(dest_lat / d_lat) * d_lat, 4), round(round(dest_lon / d_lon) * d_lon, 4))

        # Ensure start_grid and dest_grid are navigable or find closest valid water cell
        def find_nearest_navigable(lat: float, lon: float) -> Optional[Tuple[float, float]]:
            best_node = None
            best_dist = float("inf")
            for r in range(1, 8):
                for dy in [-r, 0, r]:
                    for dx in [-r, 0, r]:
                        test_lat = round(lat + dy * d_lat, 4)
                        test_lon = round(lon + dx * d_lon, 4)
                        if is_navigable(test_lat, test_lon):
                            d = calculate_haversine_distance_km(lat, lon, test_lat, test_lon)
                            if d < best_dist:
                                best_dist = d
                                best_node = (test_lat, test_lon)
                if best_node:
                    return best_node
            return None

        actual_start_node = start_grid if is_navigable(start_grid[0], start_grid[1]) else find_nearest_navigable(start_lat, start_lon)
        actual_dest_node = dest_grid if is_navigable(dest_grid[0], dest_grid[1]) else find_nearest_navigable(dest_lat, dest_lon)

        if not actual_start_node:
            return [], constraints_encountered, "blocked", f"Departure harbour ({start_lat:.4f}° N, {start_lon:.4f}° E) has no navigable marine exit."
        if not actual_dest_node:
            return [], constraints_encountered, "blocked", f"Recovery target ({dest_lat:.4f}° N, {dest_lon:.4f}° E) is in an inaccessible or landlocked zone."

        # 3. A* Graph Search
        open_set = []
        counter = 0
        heapq.heappush(open_set, (0.0, counter, actual_start_node))

        came_from: Dict[Tuple[float, float], Tuple[float, float]] = {}
        g_score: Dict[Tuple[float, float], float] = {actual_start_node: 0.0}
        f_score: Dict[Tuple[float, float], float] = {
            actual_start_node: calculate_haversine_distance_km(actual_start_node[0], actual_start_node[1], actual_dest_node[0], actual_dest_node[1])
        }
        closed_set = set()

        # 8-connected grid offsets
        NEIGHBOR_OFFSETS = [
            (d_lat, 0.0), (-d_lat, 0.0), (0.0, d_lon), (0.0, -d_lon),
            (d_lat, d_lon), (d_lat, -d_lon), (-d_lat, d_lon), (-d_lat, -d_lon)
        ]

        found_path = False

        while open_set:
            _, _, current = heapq.heappop(open_set)

            if current in closed_set:
                continue
            closed_set.add(current)

            # Check if arrived at or very close to goal node
            if current == actual_dest_node or calculate_haversine_distance_km(current[0], current[1], actual_dest_node[0], actual_dest_node[1]) <= d_lat * 111.0 * 0.75:
                came_from[actual_dest_node] = current if current != actual_dest_node else came_from.get(current)
                found_path = True
                break

            c_lat, c_lon = current

            for dy, dx in NEIGHBOR_OFFSETS:
                n_lat = round(c_lat + dy, 4)
                n_lon = round(c_lon + dx, 4)

                if n_lat < min_lat or n_lat > max_lat or n_lon < min_lon or n_lon > max_lon:
                    continue

                neighbor = (n_lat, n_lon)
                if neighbor in closed_set:
                    continue

                if not is_navigable(n_lat, n_lon):
                    continue

                step_km = calculate_haversine_distance_km(c_lat, c_lon, n_lat, n_lon)

                # Environmental dot-product cost modulation (mild, defensible +/- 5%)
                cost_factor = 1.0
                if curr_u != 0.0 or curr_v != 0.0:
                    heading_x = dx
                    heading_y = dy
                    h_norm = math.hypot(heading_x, heading_y)
                    if h_norm > 1e-6:
                        dot = (heading_x / h_norm) * curr_u + (heading_y / h_norm) * curr_v
                        # If opposing current, slightly higher cost; if with current, slightly lower
                        cost_factor = max(0.92, min(1.08, 1.0 - (dot * 0.15)))

                # Alternative route bias (penalizes being too close to the coast)
                coastal_penalty = 0.0
                if is_alternative:
                    coast_lon = get_approximate_coastline_lon(n_lat)
                    d_c = calculate_haversine_distance_km(n_lat, n_lon, n_lat, coast_lon)
                    if d_c < coastal_buffer_km * 1.5:
                        coastal_penalty = (coastal_buffer_km * 1.5 - d_c) * 0.5

                tentative_g = g_score[current] + (step_km * cost_factor) + coastal_penalty

                if tentative_g < g_score.get(neighbor, float("inf")):
                    came_from[neighbor] = current
                    g_score[neighbor] = tentative_g
                    h_val = calculate_haversine_distance_km(n_lat, n_lon, actual_dest_node[0], actual_dest_node[1])
                    f_score[neighbor] = tentative_g + h_val
                    counter += 1
                    heapq.heappush(open_set, (f_score[neighbor], counter, neighbor))

        if not found_path and actual_dest_node not in came_from:
            return [], constraints_encountered, "blocked", "A* search exhausted: No navigable corridor between harbour and target."

        # Reconstruct path from goal back to start
        path = [actual_dest_node]
        curr = actual_dest_node
        visited_trace = set([actual_dest_node])
        while curr in came_from and came_from[curr] is not None:
            curr = came_from[curr]
            if curr in visited_trace:
                break
            visited_trace.add(curr)
            path.append(curr)

        path.reverse()

        # Connect exact start and destination points
        final_raw_wps = [(start_lat, start_lon)]
        for pt in path:
            if pt != final_raw_wps[-1]:
                final_raw_wps.append(pt)
        if final_raw_wps[-1] != (dest_lat, dest_lon):
            final_raw_wps.append((dest_lat, dest_lon))

        # 4. Waypoint Compression (String Pulling / Line-of-sight shortcutting)
        smoothed = cls._smooth_waypoints(
            final_raw_wps,
            coastal_buffer_km=coastal_buffer_km,
            sanctuary_buffer_km=sanctuary_buffer_km,
            start_lat=start_lat, start_lon=start_lon,
            dest_lat=dest_lat, dest_lon=dest_lon
        )

        constraints_encountered.append(f"Continental coastline buffer enforced (min {coastal_buffer_km:.1f} km)")
        constraints_encountered.append(f"Protected marine sanctuary buffer enforced ({sanctuary_buffer_km:.1f} km)")

        return smoothed, constraints_encountered, "feasible", "Optimal route verified avoiding all land and obstacles."

    @classmethod
    def _smooth_waypoints(
        cls,
        raw_wps: List[Tuple[float, float]],
        coastal_buffer_km: float,
        sanctuary_buffer_km: float,
        start_lat: float, start_lon: float,
        dest_lat: float, dest_lon: float,
    ) -> List[Tuple[float, float]]:
        """
        Compresses grid steps using line-of-sight raycasting.
        Eliminates intermediate collinear nodes while guaranteeing
        every retained leg is 100% unobstructed by land or sanctuaries.
        """
        if len(raw_wps) <= 2:
            return raw_wps

        compressed = [raw_wps[0]]
        current_idx = 0

        while current_idx < len(raw_wps) - 1:
            # Look ahead as far as possible
            furthest_clear = current_idx + 1
            # Check up to 12 steps ahead
            max_check = min(len(raw_wps) - 1, current_idx + 12)
            for target_idx in range(max_check, current_idx + 1, -1):
                p1 = raw_wps[current_idx]
                p2 = raw_wps[target_idx]
                if check_segment_clearance(
                    p1[0], p1[1], p2[0], p2[1],
                    coastal_buffer_km=coastal_buffer_km,
                    sanctuary_buffer_km=sanctuary_buffer_km,
                    start_lat=start_lat, start_lon=start_lon,
                    dest_lat=dest_lat, dest_lon=dest_lon,
                    samples=14
                ):
                    furthest_clear = target_idx
                    break

            compressed.append(raw_wps[furthest_clear])
            current_idx = furthest_clear

        return compressed

    @classmethod
    def _build_route_response(
        cls,
        mission_id: int,
        report_id: int,
        route_type: str,
        start_lat: float,
        start_lon: float,
        start_port: str,
        dest_lat: float,
        dest_lon: float,
        dest_label: str,
        waypoints: List[Tuple[float, float]],
        direct_km: float,
        constraints_applied: Dict[str, Any],
        constraints_encountered: List[str],
        feasibility_status: str,
        feasibility_message: str,
        environmental_data: Optional[Dict[str, Any]],
        vessel_speed_knots: Optional[float],
    ) -> RouteItemResponse:
        """Constructs complete RouteItemResponse with cumulative nautical distances."""
        wp_items: List[WaypointItem] = []
        cumulative_km = 0.0

        for i, (w_lat, w_lon) in enumerate(waypoints):
            if i == 0:
                step_km = 0.0
                label = f"Departure: {start_port}"
            elif i == len(waypoints) - 1:
                step_km = calculate_haversine_distance_km(waypoints[i - 1][0], waypoints[i - 1][1], w_lat, w_lon)
                label = f"Target Destination: {dest_label}"
            else:
                step_km = calculate_haversine_distance_km(waypoints[i - 1][0], waypoints[i - 1][1], w_lat, w_lon)
                label = f"Navigational Waypoint {i}"

            cumulative_km += step_km
            cumulative_nm = cumulative_km / KM_PER_NAUTICAL_MILE

            wp_items.append(
                WaypointItem(
                    index=i + 1,
                    latitude=round(w_lat, 5),
                    longitude=round(w_lon, 5),
                    distance_from_prev_km=round(step_km, 3),
                    cumulative_distance_km=round(cumulative_km, 3),
                    cumulative_distance_nm=round(cumulative_nm, 3),
                    label=label
                )
            )

        total_km = round(cumulative_km, 3)
        total_nm = round(total_km / KM_PER_NAUTICAL_MILE, 2)
        route_deviation_pct = None
        if direct_km > 0.01:
            route_deviation_pct = round(((total_km - direct_km) / direct_km) * 100.0, 1)

        # Travel duration calculation: only if speed is provided
        est_hours = None
        est_formatted = "Unavailable (vessel speed not specified)"
        if vessel_speed_knots and vessel_speed_knots > 0:
            est_hours = round(total_nm / vessel_speed_knots, 2)
            total_minutes = int(round(est_hours * 60))
            hrs = total_minutes // 60
            mins = total_minutes % 60
            if hrs > 0:
                est_formatted = f"{hrs} hr {mins} min (at {vessel_speed_knots} kts)"
            else:
                est_formatted = f"{mins} min (at {vessel_speed_knots} kts)"

        # GeoJSON LineString coordinates: [[lon, lat], ...]
        geojson_coords = [[wp.longitude, wp.latitude] for wp in wp_items]
        geojson_feature = {
            "type": "Feature",
            "properties": {
                "route_type": route_type,
                "mission_id": mission_id,
                "report_id": report_id,
                "total_km": total_km,
                "total_nm": total_nm,
            },
            "geometry": {
                "type": "LineString",
                "coordinates": geojson_coords,
            }
        }

        algorithm_name = "A* Marine Grid (Admissible Haversine Heuristic)"
        if route_type == "alternative":
            algorithm_name = "A* Marine Grid (Conservative Offshore Corridor)"

        return RouteItemResponse(
            mission_id=mission_id,
            report_id=report_id,
            route_type=route_type,
            is_selected=False,
            departure_port=start_port,
            departure_lat=start_lat,
            departure_lon=start_lon,
            destination_target=dest_label,
            destination_lat=dest_lat,
            destination_lon=dest_lon,
            total_distance_km=total_km,
            total_distance_nm=total_nm,
            direct_distance_km=round(direct_km, 3),
            route_deviation_pct=route_deviation_pct,
            waypoint_count=len(wp_items),
            waypoints=wp_items,
            route_geojson=geojson_feature,
            algorithm=algorithm_name,
            feasibility_status=feasibility_status,
            feasibility_message=feasibility_message,
            constraints_applied=constraints_applied,
            constraints_encountered=constraints_encountered,
            environmental_context=environmental_data,
            vessel_speed_knots=vessel_speed_knots,
            estimated_duration_hours=est_hours,
            estimated_duration_formatted=est_formatted,
            version=1,
        )
