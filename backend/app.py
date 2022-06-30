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
    json_data = request.get_json(force=True)
    text_prompt = json_data["text"]
    num_images = json_data["num_images"]
    generated_imgs = dalle_model.generate_images(text_prompt, num_images)

    save_images_to_library(text_prompt, generated_imgs)
    create_catalogue()
    generated_images = []
    for idx, img in enumerate(generated_imgs):
        buffered = BytesIO()
        img.save(buffered, format="JPEG")
        img_str = base64.b64encode(buffered.getvalue()).decode("utf-8")
        generated_images.append(img_str)

    print(f"Created {num_images} images from text prompt [{text_prompt}]")
    return jsonify(generated_images)


@app.route("/", methods=["GET"])
@cross_origin()
def health_check():
    return jsonify(success=True)


def create_catalogue():
    library = []
    for root, dirs, files in os.walk("/library", topdown=False):
        for name in files:
            if name.endswith('.jpeg'):
                library.append(os.path.join(root, name))

    with open("/library/library.json", "w", encoding="utf8") as outfile:
        outfile.write(json.dumps(library))


def save_images_to_library(text_prompt, generated_imgs):
    try:
        library_dir_name = os.path.join('/library', f"{text_prompt}_{time.strftime('%Y-%m-%d_%H:%M:%S')}")
        os.makedirs(library_dir_name)
    except FileExistsError:
        pass

    for idx, img in enumerate(generated_imgs):
        img.save(os.path.join(library_dir_name, f'{str(uuid.uuid4())}.jpeg'), format="JPEG")
    print(f"Saved images to library from text prompt [{text_prompt}]")


with app.app_context():
    dalle_model = DalleModel(args.model_version)
    dalle_model.generate_images("warm-up", 1)
    print("--> DALL-E Server is up and running!")
    print(f"--> Model selected - DALL-E {args.model_version}")

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=args.port, debug=False)
