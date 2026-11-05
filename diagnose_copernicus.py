
from pathlib import Path
import xarray as xr
import numpy as np

BASE_DIR = Path(__file__).parent

FILES = [
    BASE_DIR / "check_copernicus.nc",
    BASE_DIR / "copernicus_offshore_test" / "offshore_currents.nc",
    BASE_DIR / "copernicus_offshore_test_2" / "offshore_currents.nc",
]

print("=" * 65)
print("OCEANRESCUE - COPERNICUS DATA DIAGNOSTICS")
print("=" * 65)

for file_path in FILES:
    print("\n" + "-" * 65)
    print("FILE:", file_path.name)

    if not file_path.exists():
        print("File not found. Skipping.")
        continue

    try:
        with xr.open_dataset(file_path) as ds:
            print("Dimensions:", dict(ds.sizes))
            print("Coordinates:")

            for name in ["latitude", "longitude", "depth", "time"]:
                if name in ds.coords:
                    values = ds[name].values
                    if name == "time":
                        print(
                            f"  {name}: {values[0]} to {values[-1]}"
                        )
                    else:
                        print(f"  {name}: {values}")

            if "uo" not in ds or "vo" not in ds:
                print("ERROR: uo or vo is missing.")
                continue

            u = ds["uo"].values
            v = ds["vo"].values

            valid = np.isfinite(u) & np.isfinite(v)

            print("\nTotal readings:", valid.size)
            print("Valid paired readings:", int(valid.sum()))
            print("Missing paired readings:", int((~valid).sum()))

            # Count valid readings at each spatial grid cell.
            # Array dimensions are expected to be:
            # time, depth, latitude, longitude.
            if (
                "time" in ds["uo"].dims
                and "latitude" in ds["uo"].dims
                and "longitude" in ds["uo"].dims
            ):
                time_axis = ds["uo"].get_axis_num("time")
                spatial_valid = np.moveaxis(valid, time_axis, 0)

                # Remove the depth axis if it is present.
                if "depth" in ds["uo"].dims:
                    depth_axis = ds["uo"].get_axis_num("depth")
                    depth_axis_after_move = (
                        depth_axis if depth_axis < time_axis
                        else depth_axis - 1
                    )
                    spatial_valid = np.moveaxis(
                        spatial_valid, depth_axis_after_move, 1
                    )
                    spatial_valid = spatial_valid[:, 0, :, :]

                counts = spatial_valid.sum(axis=0)

                print("\nValid timestamps per grid cell:")
                print(counts)

                latitudes = ds["latitude"].values
                longitudes = ds["longitude"].values

                found = False

                for i, lat in enumerate(latitudes):
                    for j, lon in enumerate(longitudes):
                        count = int(counts[i, j])

                        if count > 0:
                            found = True
                            print(
                                f"  VALID: lat={float(lat):.5f}, "
                                f"lon={float(lon):.5f}, "
                                f"readings={count}"
                            )

                if not found:
                    print("  No valid grid cells in this file.")

            # Report raw data ranges when available.
            finite_u = u[np.isfinite(u)]
            finite_v = v[np.isfinite(v)]

            if finite_u.size:
                print("\nEastward velocity range:", 
                      float(finite_u.min()), "to",
                      float(finite_u.max()), "m/s")

            if finite_v.size:
                print("Northward velocity range:",
                      float(finite_v.min()), "to",
                      float(finite_v.max()), "m/s")

    except Exception as error:
        print("Inspection error:", type(error).__name__, str(error))

print("\n" + "=" * 65)
print("DIAGNOSTICS COMPLETE")
print("=" * 65)
