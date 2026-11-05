
from pathlib import Path
import xarray as xr
import numpy as np

file_path = (
    Path(__file__).parent
    / "copernicus_hourly_test"
    / "hourly_currents.nc"
)

print("=" * 55)
print("OCEANRESCUE - HOURLY CURRENT DATA CHECK")
print("=" * 55)

if not file_path.exists():
    print("ERROR: File not found:", file_path)
    raise SystemExit(1)

try:
    with xr.open_dataset(file_path) as ds:
        print("\nDataset dimensions:", dict(ds.sizes))
        print("\nTime:", ds["time"].values[[0, -1]])
        print("Latitude:", ds["latitude"].values)
        print("Longitude:", ds["longitude"].values)
        print("Depth:", ds["depth"].values)

        u = ds["uo"].values
        v = ds["vo"].values

        valid = np.isfinite(u) & np.isfinite(v)

        print("\nTotal paired readings:", valid.size)
        print("Valid paired readings:", int(valid.sum()))
        print("Missing paired readings:", int((~valid).sum()))

        if valid.any():
            u_valid = u[valid]
            v_valid = v[valid]
            speed = np.sqrt(u_valid**2 + v_valid**2)

            print("\nSUCCESS: Valid current data found!")
            print("First uo:", float(u_valid[0]), "m/s")
            print("First vo:", float(v_valid[0]), "m/s")
            print("First speed:", float(speed[0]), "m/s")
            print("Mean speed:", float(speed.mean()), "m/s")
            print("Minimum speed:", float(speed.min()), "m/s")
            print("Maximum speed:", float(speed.max()), "m/s")
        else:
            print("\nNo valid current readings found.")
            print("Do not use this subset for drift forecasting.")

except Exception as error:
    print("\nInspection failed.")
    print(type(error).__name__, str(error))
