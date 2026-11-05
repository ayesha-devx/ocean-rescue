
from pathlib import Path
import xarray as xr
import sys

# Find the NetCDF file beside this Python script
file_path = Path(__file__).with_name("check_copernicus.nc")

print("=" * 60)
print("OCEANRESCUE - COPERNICUS DATASET VERIFICATION")
print("=" * 60)

# 1. Check whether the file exists
print(f"\nFile path: {file_path}")
print(f"File exists: {file_path.exists()}")

if not file_path.exists():
    print("\nERROR: check_copernicus.nc was not found.")
    print("Place the downloaded .nc file beside this script.")
    sys.exit(1)

# 2. Check file size
file_size = file_path.stat().st_size
print(f"File size: {file_size:,} bytes ({file_size / 1024:.2f} KB)")

if file_size < 1000:
    print("\nWARNING: The file is unusually small.")
    print("It may not contain the expected scientific data.")

# 3. Try opening the NetCDF dataset
try:
    with xr.open_dataset(file_path) as ds:
        print("\nSUCCESS: Dataset opened successfully!")

        # Dataset overview
        print("\n--- DATASET DETAILS ---")
        print(ds)

        # Dimensions
        print("\n--- DIMENSIONS ---")
        for name, size in ds.sizes.items():
            print(f"{name}: {size}")

        # Variables
        variables = list(ds.data_vars)
        print("\n--- AVAILABLE VARIABLES ---")
        for variable in variables:
            print(f"- {variable}: {ds[variable].attrs}")

        # Check expected current variables
        print("\n--- CURRENT VARIABLE CHECK ---")
        for variable in ["uo", "vo"]:
            if variable in ds.data_vars:
                print(f"FOUND: {variable}")
            else:
                print(f"NOT FOUND: {variable}")

        # Check time coordinates
        print("\n--- TIME COVERAGE ---")
        time_names = ["time", "time_counter"]

        found_time = False

        for name in time_names:
            if name in ds.coords or name in ds.variables:
                values = ds[name].values
                print(f"Time coordinate: {name}")
                print(f"First timestamp: {values[0]}")
                print(f"Last timestamp: {values[-1]}")
                print(f"Number of timestamps: {len(values)}")
                found_time = True
                break

        if not found_time:
            print("No recognized time coordinate found.")

        # Geographic coordinates
        print("\n--- GEOGRAPHIC COORDINATES ---")
        for name in ["latitude", "longitude", "lat", "lon"]:
            if name in ds.coords or name in ds.variables:
                values = ds[name].values
                print(f"{name}: {values}")

        # Check for missing values in current variables
        print("\n--- DATA QUALITY CHECK ---")
        for variable in ["uo", "vo"]:
            if variable in ds.data_vars:
                data = ds[variable]
                print(f"\n{variable}:")
                print(f"Shape: {data.shape}")
                print(f"Units: {data.attrs.get('units', 'Not specified')}")
                print(f"Missing values: {int(data.isnull().sum().values)}")

        # Final preliminary assessment
        print("\n--- PRELIMINARY ASSESSMENT ---")

        if "uo" in variables and "vo" in variables:
            print("Both expected current components are present.")
            print("Next, verify coordinates, dates and actual values.")
        else:
            print("Expected variables may be missing or named differently.")
            print("Inspect the variable list before proceeding.")

        print("\nVerification completed.")

except Exception as error:
    print("\nERROR: Could not read the NetCDF dataset.")
    print(f"Error type: {type(error).__name__}")
    print(f"Details: {error}")
    print("\nThe file may be incomplete, invalid, or not a NetCDF file.")
