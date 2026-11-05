
from copernicusmarine import subset
from pathlib import Path

OUTPUT_DIR = Path(__file__).parent / "copernicus_hourly_test"
OUTPUT_DIR.mkdir(exist_ok=True)

try:
    result = subset(
        dataset_id="cmems_mod_glo_phy_anfc_merged-uv_PT1H-i",
        variables=["uo", "vo"],
        minimum_longitude=73.50,
        maximum_longitude=73.75,
        minimum_latitude=16.75,
        maximum_latitude=17.10,
        start_datetime="2025-10-20T00:00:00",
        end_datetime="2025-10-22T23:00:00",
        minimum_depth=0.49,
        maximum_depth=0.50,
        output_directory=str(OUTPUT_DIR),
        output_filename="hourly_currents.nc",
        file_format="netcdf",
    )

    print("\nHourly current download completed.")
    print("Result:", result)
    print("Output folder:", OUTPUT_DIR)

except Exception as error:
    print("\nHourly current download failed.")
    print("Error type:", type(error).__name__)
    print("Error details:", error)
