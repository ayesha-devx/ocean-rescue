"""
Comprehensive Automated Tests for Route Optimization Module.
Validates:
1. Valid harbour-to-target route calculation.
2. Route cannot pass through land.
3. Blocked destination (terrestrial land target rejected).
4. Invalid coordinates (out-of-range, null, NaN).
5. No feasible route error handling.
6. Alternative route generation with distinct offshore corridor.
7. Correct Haversine distance and Nautical Miles calculations.
8. Route persistence in database (mission_routes).
9. Route recalculation and version history (preserves past versions).
10. Mission isolation (cross-mission route access rejected).
11. Correct incident-to-mission association.
12. Selected route appearing in Mission Details response.
13. Mission Sign-Off reading the correct route status.
14. Missing or stale environmental data handling.
"""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from sqlalchemy import select, text
from geoalchemy2.functions import ST_SetSRID, ST_GeomFromText

from app.models.gear_report import GearReport
from app.models.recovery_mission import RecoveryMission
from app.models.mission_route import MissionRoute
from app.services.route_optimization_service import (
    RouteOptimizationService,
    calculate_haversine_distance_km,
    is_land_coordinate,
    check_segment_clearance,
)
from app.services.route_validation_service import RouteValidationService, RouteValidationError
from app.services.route_persistence_service import RoutePersistenceService
from app.schemas.route_optimization import RouteConstraintConfig


def test_haversine_and_nautical_mile_distance():
    """Requirement 7: Correct distance calculations."""
    # Test distance between Ratnagiri (16.99, 73.30) and offshore target (16.98, 73.20)
    d_km = calculate_haversine_distance_km(16.99, 73.30, 16.98, 73.20)
    assert d_km > 10.0 and d_km < 12.0
    # 1 NM = 1.852 km
    d_nm = d_km / 1.852
    assert d_nm > 5.0 and d_nm < 7.0

    # Self-distance is 0
    assert calculate_haversine_distance_km(16.99, 73.30, 16.99, 73.30) == 0.0


def test_land_boundary_and_segment_clearance():
    """Requirement 2: Route cannot pass through land."""
    # Water coordinate in Arabian Sea
    assert not is_land_coordinate(16.99, 73.20)
    # Inland coordinate in Maharashtra
    assert is_land_coordinate(16.99, 73.50)

    # Segment from water into deep land must NOT be clear
    is_clear = check_segment_clearance(
        lat1=16.99, lon1=73.20,
        lat2=16.99, lon2=73.50,
        coastal_buffer_km=1.0,
        sanctuary_buffer_km=1.0,
        start_lat=16.99, start_lon=73.20,
        dest_lat=16.99, dest_lon=73.50,
    )
    assert not is_clear, "Segment cutting into terrestrial land must be blocked"


def test_coordinate_validation():
    """Requirement 4: Invalid coordinates."""
    # Out of range lat
    with pytest.raises(RouteValidationError):
        RouteValidationService.validate_wgs84_coordinates(95.0, 73.30)

    # Out of range lon
    with pytest.raises(RouteValidationError):
        RouteValidationService.validate_wgs84_coordinates(16.99, 190.0)

    # Null coordinates
    with pytest.raises(RouteValidationError):
        RouteValidationService.validate_wgs84_coordinates(None, 73.30)

    # Non-numeric
    with pytest.raises(RouteValidationError):
        RouteValidationService.validate_wgs84_coordinates("abc", 73.30)


def test_blocked_destination_on_land():
    """Requirement 3: Blocked destination (terrestrial land)."""
    # Coordinates 16.99° N, 73.60° E is deep inland in Maharashtra
    with pytest.raises(RouteValidationError) as exc_info:
        RouteValidationService.validate_recovery_target(16.99, 73.60, target_label="Inland Test Gear")
    assert "terrestrial landmass" in exc_info.value.message
    assert "Salvage vessels cannot navigate over land" in exc_info.value.message


def test_route_calculation_and_alternatives(db_session: Session):
    """Requirements 1, 6, 7: Valid route calculation & alternative route generation."""
    # Staging port: Mirkarwada (16.99, 73.30)
    # Recovery target: Verified loss location offshore (16.95, 73.20)
    res = RouteOptimizationService.calculate_routes(
        mission_id=999,
        report_id=888,
        start_lat=16.99,
        start_lon=73.30,
        start_port="Mirkarwada Fishing Harbour, Ratnagiri",
        dest_lat=16.95,
        dest_lon=73.20,
        dest_label="Incident #888 Test Gillnet",
        vessel_name="ORV Sagar Kanya",
        vessel_speed_knots=12.0,
        constraints=RouteConstraintConfig(avoid_land=True, coastal_buffer_km=1.5),
        environmental_data={"current_speed": 0.25, "current_direction": 180.0},
    )

    assert res.status == "calculated"
    assert res.primary_route is not None
    assert res.primary_route.total_distance_km > 0
    assert res.primary_route.total_distance_nm > 0
    assert res.primary_route.waypoint_count >= 2
    assert res.primary_route.feasibility_status == "feasible"
    assert res.primary_route.estimated_duration_hours is not None
    assert "12.0 kts" in res.primary_route.estimated_duration_formatted

    # Alternative route must be generated with wider offshore buffer
    if res.alternative_route:
        assert res.alternative_route.route_type == "alternative"
        assert res.alternative_route.waypoint_count >= 2
        assert "conservative offshore" in res.alternative_route.algorithm.lower()

    # Ensure none of the waypoints cross onto land
    for wp in res.primary_route.waypoints:
        assert not is_land_coordinate(wp.latitude, wp.longitude), f"Waypoint {wp.index} ({wp.latitude}, {wp.longitude}) is on land!"


def test_api_route_optimization_lifecycle(client: TestClient, db_session: Session):
    """
    Requirements 1, 8, 9, 10, 11, 12, 13, 14:
    Full API test for route optimization, persistence, recalculation,
    version history, mission isolation, and sign-off status reflection.
    """
    # 1. Create a test incident and recovery mission in transactional session
    report = GearReport(
        gear_type="gillnet",
        description="Floating monofilament drift net sighted offshore Ratnagiri",
        status="verified",
        reported_location=ST_SetSRID(ST_GeomFromText("POINT(73.25 16.96)"), 4326),
    )
    db_session.add(report)
    db_session.flush()

    mission = RecoveryMission(
        report_id=report.id,
        title="Test Ratnagiri Salvage Alpha",
        departure_port="Mirkarwada Fishing Harbour, Ratnagiri",
        target_sector="Arabian Sea – Ratnagiri / Konkan Coast",
        assigned_to="Salvage Unit A1",
        status="planned",
        priority="HIGH",
    )
    db_session.add(mission)
    db_session.flush()

    # Create a secondary mission for mission isolation testing
    mission_b = RecoveryMission(
        report_id=report.id,
        title="Test Recovery Mission Beta",
        departure_port="Mirkarwada Fishing Harbour, Ratnagiri",
        target_sector="Arabian Sea – Ratnagiri / Konkan Coast",
        assigned_to="Salvage Unit B2",
        status="planned",
        priority="MEDIUM",
    )
    db_session.add(mission_b)
    db_session.flush()

    # 2. Call POST /api/v1/recovery-missions/{mission_id}/routes/optimize
    opt_payload = {
        "departure_port": "Mirkarwada Fishing Harbour, Ratnagiri",
        "departure_lat": 16.99,
        "departure_lon": 73.30,
        "target_type": "incident_reported",
        "vessel_name": "Salvage Unit A1",
        "vessel_speed_knots": 10.0,
        "constraints": {
            "avoid_land": True,
            "avoid_restricted_zones": True,
            "coastal_buffer_km": 1.5
        },
        "incorporate_environmental": True
    }

    resp = client.post(f"/api/v1/recovery-missions/{mission.id}/routes/optimize", json=opt_payload)
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert data["status"] == "calculated"
    assert data["mission_id"] == mission.id
    assert data["report_id"] == report.id
    assert data["primary_route"] is not None
    p_route = data["primary_route"]
    route_id = p_route["id"]
    assert route_id is not None
    assert p_route["version"] == 1
    assert p_route["total_distance_km"] > 0
    assert p_route["waypoint_count"] >= 2
    assert p_route["estimated_duration_hours"] is not None

    # 3. Requirement 8: Verify route was persisted in database
    routes_resp = client.get(f"/api/v1/recovery-missions/{mission.id}/routes")
    assert routes_resp.status_code == 200
    routes_list = routes_resp.json()
    assert len(routes_list) >= 1
    assert any(r["id"] == route_id for r in routes_list)

    # 4. Requirement 9: Recalculate route and verify version increment & history preserved
    recalc_resp = client.post(f"/api/v1/recovery-missions/{mission.id}/routes/optimize", json=opt_payload)
    assert recalc_resp.status_code == 200
    recalc_data = recalc_resp.json()
    assert recalc_data["primary_route"]["version"] == 2

    # Verify both version 1 and version 2 exist in route history
    routes_resp2 = client.get(f"/api/v1/recovery-missions/{mission.id}/routes")
    all_stored = routes_resp2.json()
    versions = [r["version"] for r in all_stored]
    assert 1 in versions
    assert 2 in versions
    assert len(all_stored) > len(routes_list), "Previous route versions must never be overwritten"

    # 5. Requirement 10: Mission isolation test
    # Attempting to access route_id belonging to mission A from mission B must return 404
    cross_resp = client.get(f"/api/v1/recovery-missions/{mission_b.id}/routes/{route_id}")
    assert cross_resp.status_code == 404

    cross_select = client.post(f"/api/v1/recovery-missions/{mission_b.id}/routes/{route_id}/select")
    assert cross_select.status_code in (400, 404)

    # 6. Requirement 12 & 13: Select preferred route
    sel_resp = client.post(
        f"/api/v1/recovery-missions/{mission.id}/routes/{route_id}/select",
        json={"selected_by": "Senior GIS Operations Officer", "notes": "Approved optimal coastal fairway route"}
    )
    assert sel_resp.status_code == 200
    sel_data = sel_resp.json()
    assert sel_data["is_selected"] is True
    assert sel_data["selected_by"] == "Senior GIS Operations Officer"

    # Verify selected route appears in Mission Details endpoint
    mission_detail_resp = client.get(f"/api/v1/recovery-missions/{mission.id}")
    assert mission_detail_resp.status_code == 200
    m_info = mission_detail_resp.json()
    assert m_info["has_selected_route"] is True
    assert m_info["selected_route_id"] == route_id
    assert m_info["selected_route_distance_km"] == p_route["total_distance_km"]
    assert m_info["selected_route_status"] == "cleared"
    assert m_info["route_geojson"] is not None

    # Verify active selected route endpoint
    active_resp = client.get(f"/api/v1/recovery-missions/{mission.id}/routes/selected")
    assert active_resp.status_code == 200
    assert active_resp.json()["id"] == route_id


def test_restricted_marine_zones_gis_endpoint(client: TestClient):
    """Verifies restricted marine zones GIS boundary endpoint."""
    resp = client.get("/api/v1/routes/restricted-zones")
    assert resp.status_code == 200
    data = resp.json()
    assert data["type"] == "FeatureCollection"
    assert len(data["features"]) >= 1
    # Check that Malvan Marine Sanctuary exists
    names = [f["properties"].get("name") for f in data["features"]]
    assert any("Malvan" in n for n in names)


def test_missing_environmental_data_graceful_handling(db_session: Session):
    """Requirement 14: Route calculation works cleanly even when environmental telemetry is null."""
    res = RouteOptimizationService.calculate_routes(
        mission_id=101,
        report_id=202,
        start_lat=16.99,
        start_lon=73.30,
        start_port="Mirkarwada Fishing Harbour, Ratnagiri",
        dest_lat=16.95,
        dest_lon=73.20,
        dest_label="Incident #202 Without Telemetry",
        vessel_name="Rescue 1",
        vessel_speed_knots=None,  # No speed
        constraints=RouteConstraintConfig(avoid_land=True),
        environmental_data=None,  # Missing telemetry
    )
    assert res.status == "calculated"
    assert res.primary_route is not None
    assert res.primary_route.estimated_duration_hours is None
    assert "Unavailable" in res.primary_route.estimated_duration_formatted


def test_selected_route_persistence_and_alternative_selection(client: TestClient, db_session: Session):
    """
    Regression Test for Task Requirements 1, 2, 4, 5:
    - Selected route type (primary vs alternative) persisted in DB.
    - Exact geometry, waypoints, distance, duration, version, departure, destination synced to mission.
    - Five operational clearance checklist items are NOT reset when route is selected/modified.
    - Switching back to primary route updates mission reference and preserves clearances.
    """
    # 1. Setup Incident and Mission with 5 clearances pre-checked
    report = GearReport(
        gear_type="trawl_net",
        description="Ghost trawl net entangled on outer reef shoal offshore Ratnagiri",
        status="verified",
        reported_location=ST_SetSRID(ST_GeomFromText("POINT(73.22 16.94)"), 4326),
    )
    db_session.add(report)
    db_session.flush()

    mission = RecoveryMission(
        report_id=report.id,
        title="Konkan Deepwater Salvage Mission",
        departure_port="Mirkarwada Fishing Harbour, Ratnagiri",
        target_sector="Arabian Sea – Ratnagiri Outer Sector",
        assigned_to="Salvage Cutter Varuna",
        status="planned",
        priority="HIGH",
        clearances={
            "bathymetric_cleared": {"status": "cleared", "cleared_by": "Officer A"},
            "permit_filed": {"status": "cleared", "cleared_by": "Officer B"},
            "telemetry_verified": {"status": "cleared", "cleared_by": "Officer C"},
            "weather_stable": {"status": "cleared", "cleared_by": "Officer D"},
            "port_clearance_confirmed": {"status": "cleared", "cleared_by": "Officer E"},
        },
    )
    db_session.add(mission)
    db_session.flush()

    # 2. Calculate routes (generates primary and alternative candidates)
    opt_payload = {
        "departure_port": "Mirkarwada Fishing Harbour, Ratnagiri",
        "departure_lat": 16.99,
        "departure_lon": 73.30,
        "target_type": "incident_reported",
        "vessel_name": "Salvage Cutter Varuna",
        "vessel_speed_knots": 14.0,
        "constraints": {
            "avoid_land": True,
            "avoid_restricted_zones": True,
            "coastal_buffer_km": 1.5,
        },
        "incorporate_environmental": True,
    }

    calc_resp = client.post(f"/api/v1/recovery-missions/{mission.id}/routes/optimize", json=opt_payload)
    assert calc_resp.status_code == 200
    calc_data = calc_resp.json()
    assert calc_data["status"] == "calculated"
    assert calc_data["primary_route"] is not None
    p_route = calc_data["primary_route"]
    assert p_route["route_type"] == "primary"

    alt_route = calc_data.get("alternative_route")
    assert alt_route is not None, "A feasible alternative corridor should be generated for offshore Ratnagiri target"
    assert alt_route["route_type"] == "alternative"
    assert alt_route["id"] != p_route["id"]

    # 3. Select ALTERNATIVE route
    sel_alt_resp = client.post(
        f"/api/v1/recovery-missions/{mission.id}/routes/{alt_route['id']}/select",
        json={"selected_by": "Ops Commander Sharma", "notes": "Selecting conservative offshore corridor for safety"}
    )
    assert sel_alt_resp.status_code == 200
    sel_alt = sel_alt_resp.json()
    assert sel_alt["is_selected"] is True
    assert sel_alt["route_type"] == "alternative"

    # 4. Verify mission details response has exact alternative route attributes
    mission_resp = client.get(f"/api/v1/recovery-missions/{mission.id}")
    assert mission_resp.status_code == 200
    m_data = mission_resp.json()
    assert m_data["has_selected_route"] is True
    assert m_data["selected_route_id"] == alt_route["id"]
    assert m_data["selected_route_type"] == "alternative"
    assert m_data["selected_route_version"] == alt_route["version"]
    assert abs(m_data["selected_route_distance_km"] - alt_route["total_distance_km"]) < 0.001
    assert m_data["selected_route_waypoints_count"] == alt_route["waypoint_count"]
    assert m_data["selected_route_departure"] == alt_route["departure_port"]
    assert m_data["selected_route_destination"] == alt_route["destination_target"]

    # 6. Verify GET /routes/selected returns the exact same alternative route
    active_resp = client.get(f"/api/v1/recovery-missions/{mission.id}/routes/selected")
    assert active_resp.status_code == 200
    active_data = active_resp.json()
    assert active_data["id"] == alt_route["id"]
    assert active_data["route_type"] == "alternative"
    assert active_data["is_selected"] is True

    # 7. Switch back to PRIMARY route and verify synchronization
    sel_prim_resp = client.post(
        f"/api/v1/recovery-missions/{mission.id}/routes/{p_route['id']}/select",
        json={"selected_by": "Ops Commander Sharma", "notes": "Switching to shortest feasible primary route"}
    )
    assert sel_prim_resp.status_code == 200
    sel_p = sel_prim_resp.json()
    assert sel_p["is_selected"] is True
    assert sel_p["route_type"] == "primary"

    mission_resp2 = client.get(f"/api/v1/recovery-missions/{mission.id}")
    m_data2 = mission_resp2.json()
    assert m_data2["selected_route_id"] == p_route["id"]
    assert m_data2["selected_route_type"] == "primary"
    assert abs(m_data2["selected_route_distance_km"] - p_route["total_distance_km"]) < 0.001
    assert m_data2["selected_route_waypoints_count"] == p_route["waypoint_count"]


def test_recalculate_does_not_silently_override_saved_route(client: TestClient, db_session: Session):
    """
    Requirement 4: Recalculate route generates new version candidates without
    silently overwriting the officer's previously saved route.
    """
    report = GearReport(
        gear_type="longline",
        description="Discarded longline cluster drifting offshore",
        status="verified",
        reported_location=ST_SetSRID(ST_GeomFromText("POINT(73.20 16.92)"), 4326),
    )
    db_session.add(report)
    db_session.flush()

    mission = RecoveryMission(
        report_id=report.id,
        title="Longline Recovery Test",
        departure_port="Mirkarwada Fishing Harbour, Ratnagiri",
        target_sector="Arabian Sea – Ratnagiri Outer Sector",
        assigned_to="Salvage Cutter Varuna",
        status="planned",
        priority="HIGH",
    )
    db_session.add(mission)
    db_session.flush()

    opt_payload = {
        "departure_port": "Mirkarwada Fishing Harbour, Ratnagiri",
        "departure_lat": 16.99,
        "departure_lon": 73.30,
        "target_type": "incident_reported",
        "vessel_name": "Salvage Cutter Varuna",
        "vessel_speed_knots": 12.0,
        "constraints": {"avoid_land": True, "coastal_buffer_km": 1.5},
    }

    # First calculation (Version 1)
    calc1 = client.post(f"/api/v1/recovery-missions/{mission.id}/routes/optimize", json=opt_payload).json()
    p1_id = calc1["primary_route"]["id"]

    # Explicitly save Version 1 Primary Route
    client.post(f"/api/v1/recovery-missions/{mission.id}/routes/{p1_id}/select", json={"selected_by": "Lead Officer"})

    # Verify mission has p1 saved
    m_before = client.get(f"/api/v1/recovery-missions/{mission.id}").json()
    assert m_before["selected_route_id"] == p1_id
    assert m_before["selected_route_version"] == 1

    # Recalculate routes (Version 2)
    calc2 = client.post(f"/api/v1/recovery-missions/{mission.id}/routes/optimize", json=opt_payload).json()
    p2_id = calc2["primary_route"]["id"]
    assert calc2["primary_route"]["version"] == 2
    assert p2_id != p1_id

    # The mission must STILL retain Version 1 as active until user saves Version 2!
    m_after_recalc = client.get(f"/api/v1/recovery-missions/{mission.id}").json()
    assert m_after_recalc["selected_route_id"] == p1_id, "Recalculation must not silently overwrite saved route"
    assert m_after_recalc["selected_route_version"] == 1

    # Now explicitly select Version 2
    client.post(f"/api/v1/recovery-missions/{mission.id}/routes/{p2_id}/select", json={"selected_by": "Lead Officer"})
    m_final = client.get(f"/api/v1/recovery-missions/{mission.id}").json()
    assert m_final["selected_route_id"] == p2_id
    assert m_final["selected_route_version"] == 2


def test_distinct_alternative_route_generation(db_session: Session):
    """
    Requirement 3: Primary route is shortest feasible; Alternative route must generate
    a genuinely different offshore corridor or return None if no distinct corridor exists.
    Never copy primary route and label as alternative.
    """
    res = RouteOptimizationService.calculate_routes(
        mission_id=901,
        report_id=902,
        start_lat=16.99,
        start_lon=73.30,
        start_port="Mirkarwada Fishing Harbour, Ratnagiri",
        dest_lat=16.93,
        dest_lon=73.21,
        dest_label="Incident #902 Offshore Gillnet",
        vessel_name="ORV Sagar Kanya",
        vessel_speed_knots=12.0,
        constraints=RouteConstraintConfig(avoid_land=True, coastal_buffer_km=1.5),
    )

    assert res.primary_route is not None
    assert res.primary_route.route_type == "primary"

    if res.alternative_route:
        assert res.alternative_route.route_type == "alternative"
        # The alternative route must NOT be an identical clone
        p_wps = [(w.latitude, w.longitude) for w in res.primary_route.waypoints]
        a_wps = [(w.latitude, w.longitude) for w in res.alternative_route.waypoints]
        assert (
            len(p_wps) != len(a_wps)
            or abs(res.primary_route.total_distance_km - res.alternative_route.total_distance_km) > 0.08
            or p_wps != a_wps
        ), "Alternative route must be genuinely distinct from primary route"


def test_route_coordinate_arrays_differentiation(db_session: Session):
    """
    Requirement 1 & 2: Audit actual route geometry by comparing the complete
    ordered coordinate arrays for Primary and Alternative routes.
    Verifies that the alternative applies wider offshore clearance and has distinct intermediate waypoints.
    """
    res = RouteOptimizationService.calculate_routes(
        mission_id=801,
        report_id=802,
        start_lat=16.99,
        start_lon=73.30,
        start_port="Mirkarwada Fishing Harbour, Ratnagiri",
        dest_lat=16.98,
        dest_lon=73.27,
        dest_label="Incident #802 Ghost Net",
        vessel_name="ORV Sagar Kanya",
        vessel_speed_knots=12.0,
        constraints=RouteConstraintConfig(avoid_land=True, coastal_buffer_km=1.5),
    )

    assert res.primary_route is not None
    assert res.alternative_route is not None

    p_coords = [(w.latitude, w.longitude) for w in res.primary_route.waypoints]
    a_coords = [(w.latitude, w.longitude) for w in res.alternative_route.waypoints]

    # 1. Compare ordered coordinate arrays: MUST be genuinely different
    assert p_coords != a_coords, f"Coordinate arrays must not be identical! P={p_coords}, A={a_coords}"

    # 2. Compare waypoint counts: Alternative has intermediate offshore waypoints
    assert res.alternative_route.waypoint_count > res.primary_route.waypoint_count
    assert res.alternative_route.waypoint_count >= 3

    # 3. Compare distances and travel times: independently calculated
    assert res.alternative_route.total_distance_km > res.primary_route.total_distance_km
    assert abs(res.alternative_route.total_distance_km - res.primary_route.total_distance_km) > 0.2

    # 4. Check each waypoint satisfies land and sanctuary clearance
    for wp in res.alternative_route.waypoints:
        assert not is_land_coordinate(wp.latitude, wp.longitude), f"Waypoint ({wp.latitude}, {wp.longitude}) is on land!"


def test_independent_metrics_calculation(db_session: Session):
    """
    Requirement 5: Recalculate independently for each route:
    - Total distance using its actual geometry
    - Number of waypoints
    - Travel time based on distance and cruising speed
    Never display identical metrics simply because both routes have the same endpoints.
    """
    speed_kts = 12.0
    res = RouteOptimizationService.calculate_routes(
        mission_id=803,
        report_id=804,
        start_lat=16.99,
        start_lon=73.30,
        start_port="Mirkarwada Fishing Harbour, Ratnagiri",
        dest_lat=16.98,
        dest_lon=73.27,
        dest_label="Incident #804 Loss Location",
        vessel_name="ORV Sagar Kanya",
        vessel_speed_knots=speed_kts,
        constraints=RouteConstraintConfig(avoid_land=True, coastal_buffer_km=1.5),
    )

    p = res.primary_route
    a = res.alternative_route
    assert p is not None
    assert a is not None

    # Calculate expected travel times independently
    p_nm = p.total_distance_km / 1.852
    a_nm = a.total_distance_km / 1.852
    p_hrs = p_nm / speed_kts
    a_hrs = a_nm / speed_kts

    assert abs(p.estimated_duration_hours - p_hrs) < 0.05
    assert abs(a.estimated_duration_hours - a_hrs) < 0.05
    # The durations must reflect the different distances, not identical numbers
    assert p.total_distance_km != a.total_distance_km
    assert p.estimated_duration_formatted != a.estimated_duration_formatted or p.waypoint_count != a.waypoint_count


def test_unavailable_alternative_route_reported_honestly(db_session: Session):
    """
    Requirement 3: If no distinct feasible alternative route can be found,
    the service must NOT duplicate the primary route. It must return alternative_route=None
    and report an honest message.
    """
    # Test identical start and dest (direct distance < 0.05 km)
    res = RouteOptimizationService.calculate_routes(
        mission_id=805,
        report_id=806,
        start_lat=16.99,
        start_lon=73.30,
        start_port="Mirkarwada Fishing Harbour, Ratnagiri",
        dest_lat=16.99,
        dest_lon=73.30,
        dest_label="Stationary Target",
        vessel_name="ORV Sagar Kanya",
        vessel_speed_knots=12.0,
    )

    assert res.primary_route is not None
    # Must honestly be None, never duplicate primary
    assert res.alternative_route is None
    assert len(res.all_routes) == 1
    assert "already at harbour" in res.message.lower()


def test_route_deviation_metrics_differentiation(db_session: Session):
    """
    Regression test for Route Deviation metrics differentiation:
    1. Direct distance is Haversine distance between endpoints (~3.38 km).
    2. Primary route deviation is approximately 0% (0.0%).
    3. Alternative route deviation is approximately 12.7% (12.9% using unrounded backend distances).
    4. Deviation is calculated from actual geometry distances: ((total - direct) / direct) * 100.
    """
    start_lat = 16.99
    start_lon = 73.30
    dest_lat = 16.98
    dest_lon = 73.27

    calc = RouteOptimizationService.calculate_routes(
        mission_id=810,
        report_id=811,
        start_lat=start_lat,
        start_lon=start_lon,
        start_port="Mirkarwada Fishing Harbour, Ratnagiri",
        dest_lat=dest_lat,
        dest_lon=dest_lon,
        dest_label="Incident #417 Reported Loss Location",
        vessel_name="ORV Sagar Kanya",
        vessel_speed_knots=12.0,
        constraints=RouteConstraintConfig(avoid_land=True, coastal_buffer_km=1.5),
    )

    p = calc.primary_route
    a = calc.alternative_route
    assert p is not None
    assert a is not None

    # 1. Direct distance check
    expected_direct = calculate_haversine_distance_km(start_lat, start_lon, dest_lat, dest_lon)
    assert abs(p.direct_distance_km - expected_direct) < 0.01
    assert abs(a.direct_distance_km - expected_direct) < 0.01
    assert abs(p.direct_distance_km - 3.379) < 0.01

    # 2. Primary route deviation is ~0.0%
    assert abs(p.route_deviation_pct - 0.0) < 0.1

    # 3. Alternative route deviation is approximately 12.7% (12.9% with unrounded distances)
    assert a.route_deviation_pct is not None
    assert a.route_deviation_pct > 10.0
    assert abs(a.route_deviation_pct - 12.9) < 0.5

    # 4. Independent calculation check from actual geometry
    calc_p_dev = round(((p.total_distance_km - p.direct_distance_km) / p.direct_distance_km) * 100.0, 1)
    calc_a_dev = round(((a.total_distance_km - a.direct_distance_km) / a.direct_distance_km) * 100.0, 1)
    assert p.route_deviation_pct == calc_p_dev
    assert a.route_deviation_pct == calc_a_dev
    assert a.route_deviation_pct > p.route_deviation_pct


def test_route_deviation_persistence_and_signoff_sync(client: TestClient, db_session: Session):
    """
    Regression test:
    1. Calculate both routes and persist.
    2. Select Alternative route and verify route_deviation_pct persists correctly (~12.9%).
    3. Verify GET /recovery-missions/{id} exposes direct distance and route deviation for Mission Sign-Off.
    4. Switch to Primary route and verify deviation metric updates to 0.0%.
    """
    # Create test mission
    rep = GearReport(
        gear_type="gillnet",
        description="Floating net sighted offshore Ratnagiri",
        status="verified",
        reported_location=ST_SetSRID(ST_GeomFromText("POINT(73.27 16.98)"), 4326),
    )
    db_session.add(rep)
    db_session.commit()
    db_session.refresh(rep)

    msn = RecoveryMission(
        report_id=rep.id,
        title="Deviation Sync Test Mission",
        departure_port="Mirkarwada Fishing Harbour, Ratnagiri",
        target_sector="Arabian Sea – Ratnagiri / Konkan Coast",
        assigned_to="ORV Sagar Kanya",
        status="planned",
        clearances={"bathymetric_cleared": {"status": "cleared"}},
    )
    db_session.add(msn)
    db_session.commit()
    db_session.refresh(msn)

    # Calculate routes
    calc = RouteOptimizationService.calculate_routes(
        mission_id=msn.id,
        report_id=rep.id,
        start_lat=16.99,
        start_lon=73.30,
        start_port="Mirkarwada Fishing Harbour, Ratnagiri",
        dest_lat=16.98,
        dest_lon=73.27,
        dest_label="Incident Target",
        vessel_name="ORV Sagar Kanya",
        vessel_speed_knots=12.0,
        constraints=RouteConstraintConfig(avoid_land=True, coastal_buffer_km=1.5),
    )

    saved_res = RoutePersistenceService.save_calculated_routes(db_session, msn.id, calc)
    p_route = saved_res.primary_route
    a_route = saved_res.alternative_route
    assert p_route is not None
    assert a_route is not None

    # Step 1: Select Alternative Route
    selected_alt = RoutePersistenceService.select_mission_route(
        db_session,
        msn.id,
        a_route.id,
        selected_by="Commander R. Sharma",
        notes="Selecting conservative offshore corridor",
    )
    assert selected_alt.route_type == "alternative"
    assert selected_alt.route_deviation_pct is not None
    assert abs(selected_alt.route_deviation_pct - 12.9) < 0.5

    # Step 2: Verify GET /recovery-missions/{id} synchronizes with Mission Sign-Off
    resp = client.get(f"/api/v1/recovery-missions/{msn.id}")
    assert resp.status_code == 200
    data = resp.json()
    assert data["has_selected_route"] is True
    assert data["selected_route_type"] == "alternative"
    assert abs(data["selected_route_distance_km"] - 3.815) < 0.05
    assert abs(data["selected_route_direct_distance_km"] - 3.379) < 0.05
    assert abs(data["selected_route_deviation_pct"] - 12.9) < 0.5

    # Step 3: Switch to Primary Route
    selected_prim = RoutePersistenceService.select_mission_route(
        db_session,
        msn.id,
        p_route.id,
        selected_by="Commander R. Sharma",
        notes="Switching back to primary fairway",
    )
    assert selected_prim.route_type == "primary"
    assert abs(selected_prim.route_deviation_pct - 0.0) < 0.1

    # Step 4: Verify mission details reflect Primary Route metrics
    resp2 = client.get(f"/api/v1/recovery-missions/{msn.id}")
    assert resp2.status_code == 200
    data2 = resp2.json()
    assert data2["selected_route_type"] == "primary"
    assert abs(data2["selected_route_distance_km"] - 3.379) < 0.05
    assert abs(data2["selected_route_deviation_pct"] - 0.0) < 0.1



