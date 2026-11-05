
from copernicusmarine import subset
from pathlib import Path

OUTPUT_DIR = Path(__file__).parent / "copernicus_offshore_test_2"
OUTPUT_DIR.mkdir(exist_ok=True)

try:
    result = subset(
        dataset_id="cmems_mod_glo_phy-cur_anfc_0.083deg_PT6H-i",
        variables=["uo", "vo"],
        minimum_longitude=73.50,
        maximum_longitude=73.75,
        minimum_latitude=16.75,
        maximum_latitude=17.10,
        start_datetime="2025-10-20T00:00:00",
        end_datetime="2025-10-22T18:00:00",
        minimum_depth=0.49,
        maximum_depth=0.50,
        output_directory=str(OUTPUT_DIR),
        output_filename="offshore_currents.nc",
        file_format="netcdf",
    )

    print("\nDownload completed.")
    print("Result:", result)
    print("Output folder:", OUTPUT_DIR)

except Exception as error:
    print("\nDownload failed.")
    print(type(error).__name__, str(error))
