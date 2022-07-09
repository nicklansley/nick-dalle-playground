import argparse
import base64
import os
import json
import uuid
from io import BytesIO
import time

from flask import Flask, request, jsonify
from flask_cors import CORS, cross_origin
from consts import IMAGES_OUTPUT_DIR
from utils import parse_arg_boolean, parse_arg_dalle_version
from consts import ModelSize

app = Flask(__name__)
CORS(app)
print("--> Starting DALL-E Server. This might take up to five minutes.")

from dalle_model import DalleModel

dalle_model = None

parser = argparse.ArgumentParser(description="A DALL-E app to turn your textual prompts into visionary delights")
parser.add_argument("--port", type=int, default=8000, help="backend port")
parser.add_argument("--model_version", type=parse_arg_dalle_version, default=ModelSize.MINI,
                    help="Mini, Mega, or Mega_full")
args = parser.parse_args()


@app.route("/dalle", methods=["POST"])
@cross_origin()
def generate_images_api():
    try:
        json_data = request.get_json(force=True)
        print(f"Received json_data: {json_data}")
        request_data = json.loads(json_data)
        print(f"Received request_data: {request_data}")
        text_prompt = request_data["text"]
        num_images = request_data["num_images"]
        uuid_value = request_data["uuid"]

        generated_imgs = dalle_model.generate_images(text_prompt, num_images)
        print(f"Generated {len(generated_imgs)} images")

        save_images_to_library(text_prompt, generated_imgs, uuid_value)
        create_catalogue()

        # The data in this array is the base64 encoded image data but is not used
        # at the moment because the frontend is getting the images from the library
        generated_images = []
        for idx, img in enumerate(generated_imgs):
            buffered = BytesIO()
            img.save(buffered, format="PNG")
            img_str = base64.b64encode(buffered.getvalue()).decode("utf-8")
            generated_images.append(img_str)

        print(f"Created {len(generated_images)} images from text prompt [{text_prompt}]")
        response = {
            "success": True,
            "uuid": uuid_value
        }
        return json.dumps(response)
    except Exception as e:
        response = {
            "success": False,
            "error": str(e)
        }
        print(response)
        return json.dumps(response)


@app.route("/", methods=["GET"])
@cross_origin()
def health_check():
    return jsonify(success=True)


def create_catalogue():
    library = []
    library_entry = {
        "text_prompt": "",
        "num_images": 0,
        "uuid": "",
        "generated_images": []
    }
    for root, dirs, files in os.walk("/library", topdown=False):
        for idx_name in files:
            if idx_name.endswith('.idx'):
                with open(os.path.join(root, idx_name), "r", encoding="utf8") as infile:
                    metadata = json.loads(infile.read())
                    library_entry["text_prompt"] = metadata["text_prompt"]
                    library_entry["num_images"] = metadata["num_images"]
                    library_entry["uuid"] = metadata["uuid"]
                    library_entry["generated_images"] = []
                    library.append(json.loads(json.dumps(library_entry)))

            for image_name in files:
                if image_name.endswith('.jpeg') or image_name.endswith('.jpg') or image_name.endswith('.png'):
                    for library_entry in library:
                        if library_entry["uuid"] in root:
                            image_file_path = os.path.join(root, image_name)
                            if image_file_path not in library_entry["generated_images"]:
                                library_entry["generated_images"].append(os.path.join(root, image_name))

    with open("/library/library.json", "w", encoding="utf8") as outfile:
        outfile.write(json.dumps(library, indent=4, sort_keys=True))


def save_images_to_library(text_prompt, generated_imgs, uuid_value):
    library_dir_name = os.path.join('/library', uuid_value)
    library_dir_name = library_dir_name.replace('\n', ' ').replace('\r', ' ')
    try:
        os.makedirs(library_dir_name)
    except FileExistsError:
        pass

    with open(os.path.join(library_dir_name, f'{uuid_value}.idx'), "w", encoding="utf8") as outfile:
        metadata = {
            "text_prompt": text_prompt,
            "num_images": len(generated_imgs),
            "uuid": uuid_value
        }
        outfile.write(json.dumps(metadata))

    for idx, img in enumerate(generated_imgs):
        img.save(os.path.join(library_dir_name, f'{uuid.uuid4()}.png'), format="PNG")

    print(f"Saved images to library {uuid_value} from text prompt [{text_prompt}]")


with app.app_context():
    dalle_model = DalleModel(args.model_version)
    dalle_model.generate_images("warm-up", 1)
    print("--> DALL-E Server is up and running!")
    print(f"--> Model selected - DALL-E {args.model_version}")

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=args.port, debug=False)
