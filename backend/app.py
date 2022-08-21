import argparse
import base64
import os
import json
import uuid
from io import BytesIO
import time

from flask import Flask, request, jsonify
from flask_cors import CORS, cross_origin
from utils import parse_arg_boolean, parse_arg_dalle_version
from consts import COND_SCALE, GEN_TOP_K, GEN_TOP_P, TEMPERATURE, ModelSize

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
    notes = ''
    response = {}
    try:
        start = time.time()
        json_data = request.get_json(force=True)
        request_data = json.loads(json_data)
        print(f"Received request_data: {request_data}")

        # These three items are mandatory, so if they are missing the main Exception will be thrown
        text_prompt = request_data["text"]
        num_images = request_data["num_images"]
        queue_id = request_data["queue_id"]

        # These two items are optional so if any are missing, their own Exception will provide a default value
        try:
            gen_top_k = float(request_data["gen_top_k"])
        except (KeyError, ValueError, TypeError):
            gen_top_k = GEN_TOP_K
            notes += "No gen_top_k provided or it was invalid. Using default value of " + str(gen_top_k) + "."

        try:
            gen_top_p = float(request_data["gen_top_p"])
        except (KeyError, ValueError, TypeError):
            gen_top_p = GEN_TOP_P
            notes += "No gen_top_p provided or it was invalid. Using default value of " + str(gen_top_p) + "."

        try:
            temperature = float(request_data["temperature"])
        except (KeyError, ValueError, TypeError):
            temperature = TEMPERATURE
            notes += "No temperature provided or it was invalid. Using default value of " + str(temperature) + "."

        try:
            condition_scale = float(request_data["condition_scale"])
        except (KeyError, ValueError, TypeError):
            condition_scale = COND_SCALE
            notes += "No condition_scale provided or it was invalid. Using default value of " + str(condition_scale) + "."

        try:
            seed = int(request_data["seed"])
        except (KeyError, ValueError, TypeError):
            seed = 0
            notes += "No seed provided or it was invalid. Using default value of " + str(seed) + "."

        # Let's do this! :)
        output = dalle_model.generate_images(text_prompt,
                                             num_images,
                                             seed,
                                             gen_top_k,
                                             gen_top_p,
                                             temperature,
                                             condition_scale)

        print(f"Generated {len(output['images'])} images")
        end = time.time()
        time_taken = end - start
        save_images_to_library(output['prompt'],
                               output['images'],
                               queue_id,
                               time_taken,
                               output['seed'],
                               output['gen_top_k'],
                               output['gen_top_p'],
                               output['temperature'],
                               output['condition_scale'],
                               notes)

        # The data in this array is the base64 encoded image data but is not used
        # at the moment because the frontend is getting the images from the library
        generated_images = []
        for idx, img in enumerate(output['images']):
            buffered = BytesIO()
            img.save(buffered, format="PNG")
            img_str = base64.b64encode(buffered.getvalue()).decode("utf-8")
            generated_images.append(img_str)

        print(f"Created {len(generated_images)} images from text prompt [{text_prompt} in {time_taken} seconds]")

        # Prepare the response dictionary, based mainly on the output dictionary
        response = output

        # We don't need to respond with the images array, so remove it from the response
        del response["images"]

        # Add in the remaining fields
        response['queue_id'] = queue_id
        response['time_taken'] = time_taken
        response['notes'] = notes
        response['success'] = True

    except Exception as e:
        response['success'] = False
        response['notes'] = notes
        response['error'] = str(e)
        print('Exception occurred:', e)

    return json.dumps(response)


@app.route("/", methods=["GET"])
@cross_origin()
def health_check():
    return jsonify(success=True)


def save_images_to_library(text_prompt,
                           generated_imgs,
                           queue_id,
                           time_taken,
                           seed,
                           gen_top_k,
                           gen_top_p,
                           temperature,
                           condition_scale,
                           notes
                           ):
    library_dir_name = os.path.join('/library', queue_id)
    library_dir_name = library_dir_name.replace('\n', ' ').replace('\r', ' ')
    try:
        os.makedirs(library_dir_name)
    except FileExistsError:
        pass

    with open(os.path.join(library_dir_name, f'{queue_id}.idx'), "w", encoding="utf8") as outfile:
        metadata = {
            "text_prompt": text_prompt,
            "num_images": len(generated_imgs),
            "queue_id": queue_id,
            "time_taken": round(time_taken, 2),
            "seed": seed,
            "gen_top_k": gen_top_k,
            "gen_top_p": gen_top_p,
            "temperature": temperature,
            "condition_scale": condition_scale,
            "notes": notes
        }
        outfile.write(json.dumps(metadata))

    for idx, img in enumerate(generated_imgs):
        img.save(os.path.join(library_dir_name, f'{uuid.uuid4()}.png'), format="PNG")

    print(f"Saved images to library {queue_id} from text prompt [{text_prompt}]")


with app.app_context():
    dalle_model = DalleModel(args.model_version)
    dalle_model.generate_images("warm-up", 1)
    print("--> DALL-E Server is up and running!")
    print(f"--> Model selected - DALL-E {args.model_version}")

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=args.port, debug=False)
