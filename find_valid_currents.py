
from pathlib import Path
import xarray as xr
import numpy as np

file_path = Path(__file__).with_name("check_copernicus.nc")

with xr.open_dataset(file_path) as ds:
    print("Checking current data...")
    print("Variables:", list(ds.data_vars))

    u = ds["uo"].values
    v = ds["vo"].values

    valid = np.isfinite(u) & np.isfinite(v)

    print(f"\nTotal current observations: {valid.size}")
    print(f"Valid current observations: {valid.sum()}")
    print(f"Missing current observations: {(~valid).sum()}")

    if valid.any():
        speeds = np.sqrt(u[valid] ** 2 + v[valid] ** 2)

        print("\nValid ocean-current data found!")
        print("First valid eastward velocity:", u[valid][0], "m/s")
        print("First valid northward velocity:", v[valid][0], "m/s")
        print("First valid current speed:", speeds[0], "m/s")
    else:
        print("\nNo usable current values in this file.")
        print("We need to download data for a different offshore point.")
