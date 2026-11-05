
from pathlib import Path
import xarray as xr
import numpy as np

# Path to the SECOND Copernicus download
file_path = (
    Path(__file__).parent
    / "copernicus_offshore_test_2"
    / "offshore_currents.nc"
)

print("=" * 60)
print("OCEANRESCUE - OFFSHORE CURRENT DATA INSPECTION")
print("=" * 60)

# 1. Check whether the file exists
if not file_path.exists():
    print("\nERROR: Dataset file not found!")
    print("Expected location:", file_path)
    raise SystemExit(1)

print("\nFile:", file_path)
print("File size:", file_path.stat().st_size, "bytes")

try:
    # 2. Open the NetCDF dataset
    with xr.open_dataset(file_path) as ds:

        print("\n--- DATASET INFORMATION ---")
        print(ds)

        # 3. Display coordinates
        print("\n--- COORDINATES ---")

        for name in ["time", "depth", "latitude", "longitude"]:
            if name in ds.coords:
                print(f"\n{name.upper()}:")
                print(ds[name].values)

        # 4. Check required variables
        print("\n--- REQUIRED VARIABLES ---")

        for variable in ["uo", "vo"]:
            if variable not in ds.data_vars:
                print(f"ERROR: Variable '{variable}' is missing!")
                raise SystemExit(1)

            print(f"{variable}: available")

            units = ds[variable].attrs.get("units", "not specified")
            description = ds[variable].attrs.get(
                "long_name", "not specified"
            )

            print("  Units:", units)
            print("  Description:", description)

        # 5. Read current velocities
        u = ds["uo"].values
        v = ds["vo"].values

        # Valid readings require BOTH components
        valid = np.isfinite(u) & np.isfinite(v)

        total = valid.size
        valid_count = int(valid.sum())
        missing_count = int((~valid).sum())

        print("\n--- DATA QUALITY SUMMARY ---")
        print("Total paired readings:", total)
        print("Valid paired readings:", valid_count)
        print("Missing paired readings:", missing_count)

        if total > 0:
            print(
                "Valid data percentage:",
                round(valid_count / total * 100, 2),
                "%"
            )

        # 6. Calculate current speed
        if valid_count > 0:
            u_valid = u[valid]
            v_valid = v[valid]

            speed = np.sqrt(u_valid**2 + v_valid**2)

            print("\n--- CURRENT SPEED RESULTS ---")
            print("First eastward velocity (uo):",
                  float(u_valid[0]), "m/s")
            print("First northward velocity (vo):",
                  float(v_valid[0]), "m/s")
            print("First current speed:",
                  float(speed[0]), "m/s")
            print("Mean current speed:",
                  float(speed.mean()), "m/s")
            print("Minimum current speed:",
                  float(speed.min()), "m/s")
            print("Maximum current speed:",
                  float(speed.max()), "m/s")

            print("\nSUCCESS: Valid current readings found!")

            # 7. Show a few valid observations with coordinates
            print("\n--- SAMPLE VALID OBSERVATIONS ---")

            u_da = ds["uo"].squeeze(drop=True)
            v_da = ds["vo"].squeeze(drop=True)

            paired = xr.Dataset({
                "uo": u_da,
                "vo": v_da
            }).to_dataframe().reset_index()

            paired = paired.dropna(subset=["uo", "vo"])

            if not paired.empty:
                paired["speed_m_s"] = np.sqrt(
                    paired["uo"]**2 + paired["vo"]**2
                )

                print(paired.head(10).to_string(index=False))

        else:
            print("\nWARNING: No valid current readings found.")
            print("The uo and vo values are missing throughout")
            print("this downloaded subset.")
            print("\nDo not use this subset for drift forecasting yet.")

except Exception as error:
    print("\nINSPECTION FAILED")
    print("Error type:", type(error).__name__)
    print("Error details:", str(error))
