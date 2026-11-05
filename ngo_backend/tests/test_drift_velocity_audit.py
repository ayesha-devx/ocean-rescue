"""
Automated regression test suite for OceanRescue Windage, Leeway & Drift Velocity Calculation Audit.
Covers:
- Test A: Basic leeway calculation (1.55 m/s * 0.025 = 0.03875 m/s)
- Test B: Zero wind (0 m/s -> 0 m/s)
- Test C: Zero current (Combined drift equals leeway vector)
- Test D: Zero leeway (Combined drift equals ocean current vector)
- Test E: Opposing vectors (Equal magnitude opposing current & leeway -> ~0 m/s)
- Test F: Perpendicular vectors (Pythagorean resultant magnitude and bearing)
- Test G: Wind direction conversion (FROM 356 deg -> downwind 176 deg)
- Test H: Unit consistency (m/s to knots exact factor 1.94384; no mixed units)
- Test I: Gear windage configuration (submerged=0.0, gillnet=0.025, trawl=0.015, applied exactly once)
- Test J: Trajectory consistency (hourly steps use combined vector advection)
- Additional edge cases: missing inputs, invalid/negative values, out-of-range windage
"""

import math
from datetime import datetime, timezone
import pytest

from app.services.drift_service import (
    calculate_leeway_vector,
    calculate_combined_drift_vector,
    get_recommended_windage,
    step_advection,
    calculate_drift_trajectory,
    DEFAULT_GEAR_WINDAGE,
    METERS_PER_DEGREE_LAT,
)


# ============================================================================
# TEST A: Basic Leeway Calculation
# ============================================================================
def test_a_basic_leeway_calculation():
    """
    Test A - Basic leeway calculation:
    Input:
      - Wind speed: 1.55 m/s
      - Windage factor: 0.025 (2.5%)
      - Wind from: 356.0 deg
    Expected:
      - leeway_speed = 1.55 * 0.025 = 0.03875 m/s
      - downwind_bearing = (356 + 180) % 360 = 176.0 deg
    """
    wind_speed = 1.55
    windage = 0.025
    wind_from_deg = 356.0

    leeway_speed, downwind_bearing, u_leeway, v_leeway = calculate_leeway_vector(
        wind_speed_ms=wind_speed,
        wind_direction_from_deg=wind_from_deg,
        windage_factor=windage
    )

    # 1. Exact leeway speed = 0.03875 m/s
    assert abs(leeway_speed - 0.03875) < 1e-6

    # 2. Downwind bearing = 176.0 deg
    assert abs(downwind_bearing - 176.0) < 1e-4

    # 3. Vector components: u = speed * sin(176°), v = speed * cos(176°)
    expected_u = 0.03875 * math.sin(math.radians(176.0))
    expected_v = 0.03875 * math.cos(math.radians(176.0))
    assert abs(u_leeway - expected_u) < 1e-6
    assert abs(v_leeway - expected_v) < 1e-6
    assert u_leeway > 0  # Eastward component (sin(176°) > 0)
    assert v_leeway < 0  # Southward component (cos(176°) < 0)


# ============================================================================
# TEST B: Zero Wind
# ============================================================================
def test_b_zero_wind():
    """
    Test B - Zero wind:
    Input:
      - Wind speed: 0.0 m/s
      - Windage factor: 0.025
    Expected:
      - leeway_speed = 0.0 m/s
      - u_leeway = 0.0 m/s, v_leeway = 0.0 m/s
    """
    leeway_speed, downwind_bearing, u_leeway, v_leeway = calculate_leeway_vector(
        wind_speed_ms=0.0,
        wind_direction_from_deg=356.0,
        windage_factor=0.025
    )

    assert leeway_speed == 0.0
    assert u_leeway == 0.0
    assert v_leeway == 0.0


# ============================================================================
# TEST C: Zero Current (Combined Drift Equals Leeway Vector)
# ============================================================================
def test_c_zero_current():
    """
    Test C - Zero current:
    Verify that when ocean current is 0, combined drift velocity equals the
    wind-driven leeway vector exactly.
    """
    u_current = 0.0
    v_current = 0.0

    # Leeway vector pointing southeast: 0.03875 m/s at 135 deg
    leeway_speed = 0.03875
    leeway_bearing = 135.0
    u_leeway = leeway_speed * math.sin(math.radians(leeway_bearing))
    v_leeway = leeway_speed * math.cos(math.radians(leeway_bearing))

    u_drift, v_drift, drift_speed, drift_bearing = calculate_combined_drift_vector(
        u_current=u_current,
        v_current=v_current,
        u_leeway=u_leeway,
        v_leeway=v_leeway
    )

    assert abs(u_drift - u_leeway) < 1e-7
    assert abs(v_drift - v_leeway) < 1e-7
    assert abs(drift_speed - leeway_speed) < 1e-7
    assert abs(drift_bearing - leeway_bearing) < 1e-4


# ============================================================================
# TEST D: Zero Leeway (Combined Drift Equals Current Vector)
# ============================================================================
def test_d_zero_leeway():
    """
    Test D - Zero leeway:
    Verify that when leeway is 0 (e.g. submerged gear or zero wind),
    combined drift velocity equals the ocean current vector exactly.
    """
    # Ocean current: 0.20 m/s flowing northward (0 deg)
    current_speed = 0.20
    current_bearing = 0.0
    u_current = 0.0
    v_current = 0.20

    u_leeway = 0.0
    v_leeway = 0.0

    u_drift, v_drift, drift_speed, drift_bearing = calculate_combined_drift_vector(
        u_current=u_current,
        v_current=v_current,
        u_leeway=u_leeway,
        v_leeway=v_leeway
    )

    assert abs(u_drift - u_current) < 1e-7
    assert abs(v_drift - v_current) < 1e-7
    assert abs(drift_speed - current_speed) < 1e-7
    assert abs(drift_bearing - current_bearing) < 1e-4


# ============================================================================
# TEST E: Opposing Vectors
# ============================================================================
def test_e_opposing_vectors():
    """
    Test E - Opposing vectors:
    Use equal-magnitude opposing current and leeway vectors.
    Expected: Resultant speed approximately 0 m/s.
    """
    # Current flowing North (+V = 0.15 m/s)
    u_current = 0.0
    v_current = 0.15

    # Leeway pushing South (-V = -0.15 m/s)
    u_leeway = 0.0
    v_leeway = -0.15

    u_drift, v_drift, drift_speed, drift_bearing = calculate_combined_drift_vector(
        u_current=u_current,
        v_current=v_current,
        u_leeway=u_leeway,
        v_leeway=v_leeway
    )

    assert abs(u_drift) < 1e-7
    assert abs(v_drift) < 1e-7
    assert abs(drift_speed) < 1e-7


# ============================================================================
# TEST F: Perpendicular Vectors
# ============================================================================
def test_f_perpendicular_vectors():
    """
    Test F - Perpendicular vectors:
    Use perpendicular current and leeway vectors.
    E.g. Current eastward: u = 0.3 m/s, v = 0.0 m/s
         Leeway northward: u = 0.0 m/s, v = 0.4 m/s
    Expected:
      - Resultant magnitude = sqrt(0.3^2 + 0.4^2) = 0.5 m/s
      - Bearing = atan2(0.3, 0.4) = ~36.87 deg (Northeast)
    """
    u_current = 0.3
    v_current = 0.0
    u_leeway = 0.0
    v_leeway = 0.4

    u_drift, v_drift, drift_speed, drift_bearing = calculate_combined_drift_vector(
        u_current=u_current,
        v_current=v_current,
        u_leeway=u_leeway,
        v_leeway=v_leeway
    )

    assert abs(u_drift - 0.3) < 1e-7
    assert abs(v_drift - 0.4) < 1e-7
    assert abs(drift_speed - 0.5) < 1e-6

    expected_bearing = math.degrees(math.atan2(0.3, 0.4))  # ~36.8698976°
    assert abs(drift_bearing - expected_bearing) < 1e-4


# ============================================================================
# TEST G: Wind Direction Conversion
# ============================================================================
def test_g_wind_direction_conversion():
    """
    Test G - Wind direction conversion:
    Verify that wind FROM 356 deg produces a downwind leeway direction close to 176 deg,
    NOT 356 deg.
    Also test across quadrants:
      - FROM 0 deg (North) -> downwind 180 deg (South)
      - FROM 90 deg (East) -> downwind 270 deg (West)
      - FROM 270 deg (West) -> downwind 90 deg (East)
      - FROM 180 deg (South) -> downwind 0 deg (North)
    """
    # 356° -> 176°
    _, bearing_356, _, _ = calculate_leeway_vector(2.0, 356.0, 0.025)
    assert abs(bearing_356 - 176.0) < 1e-4

    # 0° -> 180°
    _, bearing_0, _, _ = calculate_leeway_vector(2.0, 0.0, 0.025)
    assert abs(bearing_0 - 180.0) < 1e-4

    # 90° -> 270°
    _, bearing_90, _, _ = calculate_leeway_vector(2.0, 90.0, 0.025)
    assert abs(bearing_90 - 270.0) < 1e-4

    # 270° -> 90°
    _, bearing_270, _, _ = calculate_leeway_vector(2.0, 270.0, 0.025)
    assert abs(bearing_270 - 90.0) < 1e-4

    # 180° -> 0°
    _, bearing_180, _, _ = calculate_leeway_vector(2.0, 180.0, 0.025)
    assert abs(bearing_180 - 0.0) < 1e-4


# ============================================================================
# TEST H: Unit Consistency
# ============================================================================
def test_h_unit_consistency():
    """
    Test H - Unit consistency:
    Verify that conversions between m/s and knots are strictly accurate
    (1 m/s = 1.94384 knots) and that internal vector calculations use exclusively
    meters per second (m/s) without mixed units.
    """
    ms_speed = 1.55
    knots_conversion_factor = 1.94384
    expected_knots = ms_speed * knots_conversion_factor

    assert abs(expected_knots - 3.012952) < 1e-4

    # Ensure calculate_leeway_vector accepts and returns m/s
    leeway_speed, _, u_l, v_l = calculate_leeway_vector(ms_speed, 180.0, 0.025)
    assert abs(leeway_speed - (ms_speed * 0.025)) < 1e-6

    # Magnitude of components must match leeway_speed in m/s
    comp_magnitude = math.sqrt(u_l**2 + v_l**2)
    assert abs(comp_magnitude - leeway_speed) < 1e-6


# ============================================================================
# TEST I: Gear Windage Configuration
# ============================================================================
def test_i_gear_windage_configuration():
    """
    Test I - Gear windage configuration:
    Verify that the selected gear configuration controls the windage factor
    and that the factor is applied exactly once:
      - Submerged gear: windage = 0.0
      - Traps / Pot: windage = 0.0
      - Trawl: windage = 0.015
      - Floating gillnet: windage = 0.025
      - FAD: windage = 0.040
    """
    # Submerged overrides gear type
    assert get_recommended_windage("gillnet", is_submerged=True) == 0.0
    assert get_recommended_windage("trawl", is_submerged=True) == 0.0

    # Non-submerged gear defaults
    assert get_recommended_windage("gillnet", is_submerged=False) == 0.025
    assert get_recommended_windage("trawl", is_submerged=False) == 0.015
    assert get_recommended_windage("traps", is_submerged=False) == 0.000
    assert get_recommended_windage("pot", is_submerged=False) == 0.000
    assert get_recommended_windage("fad", is_submerged=False) == 0.040
    assert get_recommended_windage("longline", is_submerged=False) == 0.020

    # Verify single application: when submerged, leeway is 0
    sub_leeway, _, _, _ = calculate_leeway_vector(10.0, 180.0, 0.0)
    assert sub_leeway == 0.0

    # For gillnet at 2.5%, leeway is 10 * 0.025 = 0.25 m/s (not 10 * 0.025 * 0.025)
    net_leeway, _, _, _ = calculate_leeway_vector(10.0, 180.0, 0.025)
    assert abs(net_leeway - 0.25) < 1e-6


# ============================================================================
# TEST J: Trajectory Vector Advection Consistency
# ============================================================================
def test_j_trajectory_consistency():
    """
    Test J - Trajectory consistency:
    Verify that calculate_drift_trajectory uses combined velocity components
    (u_drift, v_drift) for every step and correctly records both leeway and combined
    drift metrics in every saved point and trajectory summary.
    """
    start_lat = 16.99
    start_lon = 73.30
    start_time = datetime(2026, 10, 30, 12, 0, 0, tzinfo=timezone.utc)

    # Ocean current: 0.20 m/s North (u=0.0, v=+0.20)
    # Wind: 1.55 m/s FROM 356.0 deg (downwind 176.0 deg, leeway 0.03875 m/s)
    # Wind opposes current southward!
    env_data = {
        "current_velocity": 0.20,
        "current_direction": 0.0,
        "current_u": 0.0,
        "current_v": 0.20,
        "wind_speed": 1.55,
        "wind_direction": 356.0,
        "mode": "real_data",
        "data_status": "Verified test observation"
    }

    traj = calculate_drift_trajectory(
        start_lat=start_lat,
        start_lon=start_lon,
        start_time=start_time,
        duration_hours=3,
        env_conditions=env_data,
        windage=0.025
    )

    pts = traj["points"]
    assert len(pts) == 4  # Step 0 (origin) + 3 hourly steps

    # Check origin point (step 0)
    step0 = pts[0]
    assert step0["step_index"] == 0
    assert abs(step0["leeway_speed"] - 0.03875) < 1e-5
    assert abs(step0["leeway_direction"] - 176.0) < 1e-4
    assert step0["drift_speed"] > 0
    # Combined drift speed should be approx 0.161 m/s (opposing current)
    assert abs(step0["drift_speed"] - 0.16136) < 1e-4

    # Check step 1
    step1 = pts[1]
    assert step1["step_index"] == 1
    assert abs(step1["leeway_speed"] - 0.03875) < 1e-5
    assert abs(step1["drift_speed"] - 0.16136) < 1e-4

    # Verify physical coordinate displacement over 1 hour
    # u_drift = ~0.00270 m/s, v_drift = ~0.16134 m/s
    expected_dlat = (step1["drift_v"] * 3600.0) / METERS_PER_DEGREE_LAT
    actual_dlat = step1["latitude"] - start_lat
    assert abs(actual_dlat - expected_dlat) < 1e-5

    # Summary metrics consistency
    summary = traj
    assert abs(summary["leeway_speed_avg"] - 0.03875) < 1e-5
    assert abs(summary["combined_drift_speed_avg"] - 0.16136) < 1e-4
    assert abs(summary["windage"] - 0.025) < 1e-6


# ============================================================================
# ADDITIONAL TESTS: Missing, Negative, or Invalid Inputs
# ============================================================================
def test_missing_or_none_wind_parameters():
    """
    Verify robust fallback when wind telemetry is None or missing:
    leeway should gracefully default to 0.0 without raising uncaught exceptions,
    and combined drift equals ocean current.
    """
    leeway_speed, downwind_bearing, u_l, v_l = calculate_leeway_vector(
        wind_speed_ms=None,
        wind_direction_from_deg=None,
        windage_factor=0.025
    )
    assert leeway_speed == 0.0
    assert u_l == 0.0
    assert v_l == 0.0
    assert downwind_bearing is None

    # Negative wind speed should clamp to 0.0
    neg_leeway, _, _, _ = calculate_leeway_vector(-5.0, 180.0, 0.025)
    assert neg_leeway == 0.0


def test_incident_417_exact_numbers():
    """
    Verify exact test numbers for Incident #417:
    - Current: 0.200 m/s at 0.0° (u = 0.0, v = +0.200)
    - Wind: 1.55 m/s from 356.0°
    - Windage: 0.025 (2.5%)
    - Leeway speed: 0.03875 m/s (displays as 0.039 m/s)
    - Leeway bearing: 176.0° (u = +0.00270 m/s, v = -0.03866 m/s)
    - Combined drift:
        u_drift = +0.00270 m/s
        v_drift = +0.16134 m/s
        drift_speed = 0.16136 m/s (displays as 0.161 m/s)
        drift_bearing = 0.96° (displays as 1.0°)
    """
    leeway_speed, leeway_dir, u_leeway, v_leeway = calculate_leeway_vector(1.55, 356.0, 0.025)
    assert round(leeway_speed, 5) == 0.03875
    assert round(leeway_dir, 1) == 176.0

    u_drift, v_drift, drift_speed, drift_bearing = calculate_combined_drift_vector(
        u_current=0.0,
        v_current=0.200,
        u_leeway=u_leeway,
        v_leeway=v_leeway
    )

    assert round(drift_speed, 3) == 0.161
    assert round(drift_bearing, 1) == 1.0
    assert round(u_drift, 5) == 0.00270
    assert round(v_drift, 5) == 0.16134
