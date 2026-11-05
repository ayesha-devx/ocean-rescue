
from copernicusmarine import describe

PRODUCT_ID = "GLOBAL_ANALYSISFORECAST_PHY_001_024"

print("=" * 60)
print("OCEANRESCUE - COPERNICUS CATALOGUE INSPECTION")
print("=" * 60)

try:
    catalogue = describe(
        product_id=PRODUCT_ID,
        disable_progress_bar=True
    )

    print("\n--- CATALOGUE OBJECT ---")
    print(type(catalogue).__name__)

    products = getattr(catalogue, "products", []) or []

    if not products:
        print("No products returned.")
    
    for product in products:
        print("\n" + "-" * 50)
        print("PRODUCT")
        print("Name:", getattr(product, "title", "Not available"))
        print("ID:", getattr(product, "product_id", "Not available"))

        datasets = getattr(product, "datasets", []) or []

        for dataset in datasets:
            print("\n  DATASET")
            print("  Object type:", type(dataset).__name__)

            # Print actual object fields rather than assuming
            # that the dataset has a title attribute.
            if hasattr(dataset, "model_dump"):
                details = dataset.model_dump()
            elif hasattr(dataset, "__dict__"):
                details = vars(dataset)
            else:
                details = {
                    name: getattr(dataset, name)
                    for name in dir(dataset)
                    if not name.startswith("_")
                    and not callable(getattr(dataset, name, None))
                }

            for key, value in details.items():
                print(f"  {key}: {value}")

    print("\nCatalogue inspection completed.")

except Exception as error:
    print("\nCatalogue inspection failed.")
    print("Error type:", type(error).__name__)
    print("Error:", error)
