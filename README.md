# Nick's Dalle playground

Note: This project is now archived. I've moved on to develop a web multi-user docker version of Stable Diffusion with its better imagery creation.
https://github.com/nicklansley/nick-stable-diffusion

Huge thanks to the amazing people behind Dalle-Mini / Craiyon who will go on to create a new version in time :-) 

A playground for DALL-E enthusiasts to tinker with the open-source  [DALL-E Mini](https://github.com/borisdayma/dalle-mini).
It is a simple, yet powerful, DALL-E emulator and incorporates a few extra features:
* Scheduler and queue management of prompts, so the backend only processes one prompt at a time.
* Simple non-framework UI that can be adapted as desired
* A simple API called by the JavaScript in the UI to send prompt requests, check the queue and see the library of results
* docker compose volumes can be adjusted to save the pretrained image model and output library of images on a disk outside of Docker.
* The backend is written in Python and the UI is written in JavaScript.
* Output images are in PNG format.
* You can decide the seed value from 0 to 2^32 (4294967296) for the random number generator. If you use the same number with the same prompt you'll get the same images out! If you use a seed of value 0 then the backend will choose a random seed value. Library page shows the seed that was chosen.
* New '/advanced.html' with access to alter gen_top_k, gen_top_p, temperature, and condition_scale values.

## 10 steps to Fast-start
1. Make sure you have an NVidia graphics card and a NVidia's GPU driver installed. This is how the backend will render the images.
2. The graphics card needs to have at least 12 GB of GPU memory in total. I use two Geforce RTX 2080 TI graphics cards with 11 GB each.
3. You should already be using Docker Desktop in WSL2 for all kinds of reasons including performance, but by default WSL2 does not have the 'right' to use maximum memory. To overcome this, open (or create) a file in your Windows home directory called .wslconfig and put these properties in that file:
<pre>
# Settings apply across all Linux distros running on WSL 2
[wsl2]

# Limits VM memory to use no more than 60 GB, this can be set as whole numbers using GB or MB
# Go as high as you can without causing Windows to crash! I have 64GB of RAM so I am giving WSL2 up to 60GB of memory with 4GB to keep the rest of Windows going.
# Remember this is 'up to' - not 'use all this amount all the time!'. WSL2 will only use what it needs to run its applications, and you have simply given it a high ceiling.
memory=60GB 
</pre>
4. Read docker-compose.yml and adjust the two volumes to your needs - I use an 'S:' RAID drive to store everything: 
<pre>
volumes:
  app-cache-on-s:
    driver: local
    driver_opts:
      o: bind
      type: none
      device: S:\dalle\backend-cache  # path to the backend cache
  library-on-s:
    driver: local
    driver_opts:
      o: bind
      type: none
      device: S:\dalle\library # path to the library of images
</pre>

5. Open the project's /backend/Dockerfile and adjust the final line to state the model - adapt to what your PC is capable of - the choices are Mini, Mega and Mega_full. This project has Mega_full set by default. If the backend image container keeps being killed and restarted, try the 'lower' resolution models.
<pre>
# CMD python3 app.py --port 8080 --model_version mini Mega Mega_full
CMD python3 app.py --port 8080 --model_version Mega_full
</pre>
6. Run docker-compose to build the project then start the backend, scheduler and frontend. Downloading the container images is a one-time operation but takes time and several GB of download!

    In the docker-compose command below, I use -d to disconnect
and return to the terminal prompt after the containers are started. I use --build to look for changes and build/restart the images if they are not already built and up to date.
<pre>
docker-compose up -d --build 
</pre>
7. The backend will need to go and get the model in first run - again several GB of data to download.
8. The backend takes about 5 mins to become ready if the data has already been downloaded. In my experience the startup console includes many of these out of memory errors. Don't despair if you see them! As long as the container is not being killed and restarted it will eventually load the model.
<pre>2022-08-16 07:41:00.378664: E external/org_tensorflow/tensorflow/stream_executor/cuda/cuda_driver.cc:796] failed to alloc 1073741824 bytes on host: CUDA_ERROR_OUT_OF_MEMORY: out of memory
</pre>
9. You can tell the model is fully loaded when the backend console says:
<pre>
INFO:werkzeug: * Running on all addresses (0.0.0.0)
   WARNING: This is a development server. Do not use it in a production deployment.
 * Running on http://127.0.0.1:8080
 * Running on http://172.18.0.2:8080 (Press CTRL+C to quit)
</pre>
10. You can now start the UI by going to this web address on your web browser: <pre>http://localhost:8000</pre>


## Notes
The UI is super-simple and is designed to be easily adapted to your needs. I've avoided frameworks so that you can add yours as needed. I've written the JavaScript in a spaced out and 'pythonic' manner so it is easy to read (I hope!)

I've written the scheduler and frontend web server in Python. The Scheduler uses a simple FIFO queue to manage the prompts with Redis as the queuing database. I've used a class based on BaseHTTPRequestHandler to handle the requests from the UI.


### Library Page
The UI include a library page where you can view the images created so far. If you want to empty the library, simply go to the directory storing 'library.json' and set of directories with UUID names, and delete them.
If you want to delete a specific image, double-click it on the library page, and select 'OK' to the alert prompt.

The library page is useful for observing how many seconds it took to generate each image, as it is displayed above each group of images. My PC always has it at around 8 secs/image. If yours is different, 
you can adjust the value in the JavaScript a the top of index.js - change the very first line - const SECS_PER_IMAGE = 8; - to the number of seconds per image you are experiencing.
This will make the countdown on the UI more accurate when waiting for your prompt to be processed.

## API
The API is a simple RESTful API that can be used by the UI to send requests to the backend.

<hr>
<b>/prompt</b>

This is the main entry point for the API. It expects a JSON object with the following fields:

Type: POST

Body:
* text: the prompt text to be rendered
* num_images: the number of images to be rendered. Can be 2, 4, 6, or 8 as a string
* seed: the seed value for the random number generator. Can be any integer up to 2-to-the-power-32 (4294967296) - use 0 for internally generated random seed
Body example:
<pre>
{
    "text":"the red squirrel dances in the moonlight, feet off the ground, backlit, photograph, golden hour, high shutter speed", 
    "num_images":"6"
    "seed":12345
}
</pre>

Response:
* queue_id: 
 
the id of the prompt in the queue, expressed as a randonly generated UUID.

Example response:
<pre>
{
    "queue_id":"f8f8f8f8-f8f8-f8f8-f8f8-f8f8f8f8f8f8"
}
</pre>
<hr>
<b>/queue_status</b>

This returns an array of all the prompts in the queue and not yet processed.

Type: GET

Response:
* text - the prompt text
* num_images - the number of images to be rendered
* queue_id - the unique UUID-based id of the prompt in the queue

Note: the order is important - the first item in the array is the current prompt being processed, the second item in the queue is next in line, and so on.

Response example:
<pre>
[
    {
    	"text": "lightning strike over the cliffs in Brighton England, dramatic, dangerous, impressive, photograph",
    	"num_images": 4,
    	"queue_id": "9bac4d22-9cc1-49dc-a220-76cef330eb54"
    },
    {
    	"text": "the red squirrel dances in the moonlight, feet off the ground, backlit, photograph, golden hour, high shutter speed",
    	"num_images": 6,
    	"queue_id": "f8f8f8f8-f8f8-f8f8-f8f8-f8f8f8f8f8f8"
    }
]</pre>
<hr>
<b>/getlibrary</b>

This command returns the library of images that have been rendered, grouped by the prompt that created them.

Type: GET

Response: An array of:
* "creation_unixtime": The unixtime when the images were created (useful for sorting into chronological order)
* "generated_images": An array of relative URL paths to the generated images
* "process_time_secs": A float indicating the time it took to render this group of  images,
* "queue_id": The UUID-based id of the prompt in the queue
* "text_prompt": The prompt text

Notes:
* Each array element represents each processed prompt with links to the resulting images in the group. 
* Each group has its own UUID-style folder name. 
* Each image file has its own UUID-style file name.

Response example:
<pre>
[
    {
        "creation_unixtime": 1660646508.7874029,
        "generated_images": [
            "library/1792898a-9572-4b01-81fc-08d7ece0f436/5de42290-ebc7-43ce-a53f-03c4f15f85bd.png",
            "library/1792898a-9572-4b01-81fc-08d7ece0f436/7b82f8b9-0d5d-430b-8234-c6afe4def30d.png"
        ],
        "process_time_secs": 16.318238735198975,
        "queue_id": "1792898a-9572-4b01-81fc-08d7ece0f436",
        "text_prompt": "the red squirrel dances in the moonlight, feet off the ground, backlit, photograph, golden hour, 1 second shutter speed"
    },
    {
        "creation_unixtime": 1660646441.73253,
        "generated_images": [
            "library/8ea53a35-520e-4760-b666-b8a93baaba9a/598a14f9-3e4c-43b5-9316-09ee64f0d801.png",
            "library/8ea53a35-520e-4760-b666-b8a93baaba9a/a020be49-956f-4a7e-9ff7-f5b84c23df9f.png",
            "library/8ea53a35-520e-4760-b666-b8a93baaba9a/e2054de0-15cd-4e13-a112-32d9d91e4a42.png",
            "library/8ea53a35-520e-4760-b666-b8a93baaba9a/ec2c6fde-b84f-4b5c-9f6f-edc06459ebf0.png"
        ],
        "process_time_secs": 17.483681678771973,
        "queue_id": "8ea53a35-520e-4760-b666-b8a93baaba9a",
        "text_prompt": "A lightning storm over teh cliffs on th south coast of England, dramatic, dangerous, awesome, photograph"
    },
    {
        "creation_unixtime": 1660646458.304077,
        "generated_images": [
            "library/a4f23e96-9e00-447a-8818-20dac4440370/19bfd7f9-3fe5-42e4-bfbf-8639ee0f20cc.png",
            "library/a4f23e96-9e00-447a-8818-20dac4440370/e3657a1c-4159-4370-b759-e0b7553530bd.png"
        ],
        "process_time_secs": 15.490193605422974,
        "queue_id": "a4f23e96-9e00-447a-8818-20dac4440370",
        "text_prompt": "Did anyone ask the glass of water how it felt?"
    }
]
</pre>

Good luck setting this up on your PC - let me know how you get on.

Huge respect and qudos to Boris Dayma for the original project that I have cloned and adapted for this project.
I have merely stood on his shoulders to create this queue/scheduler version of the Dalle-mini project.
 
