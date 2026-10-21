
import json
import base64

# Read the downloaded API response
with open("prediction.json", "r", encoding="utf-8") as file:
    data = json.load(file)

# Get the annotated image
image_data = data.get("annotated_image_b64")

if image_data:
    # Remove the image data prefix if present
    if "," in image_data[:100]:
        image_data = image_data.split(",", 1)[1]

    # Convert Base64 into an image file
    image_bytes = base64.b64decode(image_data)

    with open("annotated_result.jpg", "wb") as image_file:
        image_file.write(image_bytes)

    print("Success! Image saved as annotated_result.jpg")
else:
    print("No annotated image found in the JSON response.")
