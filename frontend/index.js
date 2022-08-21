const SECS_PER_IMAGE = 6; // depends on GPU image creation speed - 6 works well for me
let global_currentQueueId = '';
let global_countdownTimerIntervalId = null;
let global_countdownValue = 0;
let global_countdownRunning = false;

/**
 * Send the text prompt to the AI and get a queue_id back in 'queue_id' which will be used to track the request.
 * @returns {Promise<void>}
 */
const go = async () =>
{
    document.getElementById('status').innerText = "Creating images..."
    document.getElementById('buttonGo').innerText = "Creating images...";
    document.getElementById('buttonGo').enabled = false;


    let numImages = '0';
    const numImagesRadioGroup = document.getElementsByName("num_images");
    for (let i = 0; i < numImagesRadioGroup.length; i++)
    {
        if (numImagesRadioGroup[i].checked)
        {
            numImages = numImagesRadioGroup[i].value;
            break;
        }
    }
    const data = {
        text: document.getElementById("prompt").value,
        num_images: numImages,
        seed: document.getElementById("seed").value
    }

    if(document.body.innerText.includes("TOP K:"))
    {
        //We have the advanced options incoming for the request from advanced.html
        data['gen_top_k'] = document.getElementById("gen_top_k").value;
        if(data['gen_top_k'] === '') data['gen_top_k'] = null;

        data['gen_top_p'] = document.getElementById("gen_top_p").value;
        if(data['gen_top_p'] === '') data['gen_top_p'] = null;

        data['temperature'] = document.getElementById("temperature").value;
        if(data['temperature'] === '') data['temperature'] = null;

        data['condition_scale'] = document.getElementById("condition_scale").value;
    }

    document.getElementById("output").innerText = "";

    const rawResponse = await fetch('/prompt', {
        method: 'POST',
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
    });

    if(rawResponse.status === 200)
    {
        const queueConfirmation = await rawResponse.json();
        global_currentQueueId = queueConfirmation.queue_id;
        document.getElementById('status').innerText = `Request queued - check the queue for position`;
    }
    else
    {
        document.getElementById('status').innerText = `DALL-E Engine Status: Sorry, an HTTP error ${rawResponse.status} occurred - have another go!`;
    }
    document.getElementById('buttonGo').innerText = "Click to send request";
    document.getElementById('buttonGo').enabled = true;
}


/**
 * Retrieve the queue and display it.
 * @returns {Promise<void>}
 */
const retrieveAndDisplayCurrentQueue = async () =>
{
    const output = document.getElementById("output");
    const queueResponse = await fetch('/queue_status', {
        method: 'GET',
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        },
    });

    if(queueResponse.status === 200)
    {
        const queueData = await queueResponse.json();
        await displayQueue(queueData);

        //Look for our Queue ID in the queue:
        let foundQueueId = false;
        for(const queueItem of queueData)
        {
            if(queueItem.queue_id === global_currentQueueId)
            {
               foundQueueId = true;
               break;
            }
        }
        //If we did not find our queue_id then processing of our request must be completed.
        //So, if no images are being displayed, go get them!
        //However, do not this if the prompt has no value (i.e. when the page is first loaded)
        if(!foundQueueId
            && (output.innerText === 'Retrieving images...' || output.innerHTML === '' || output.innerText.startsWith('Images available in'))
            && document.getElementById("prompt").value.length > 0)
        {
            document.getElementById('status').innerText = `Image creation completed`;
            stopCountDown();
            const library = await getLibrary();
            if(library)
            {
                await displayImages(library, output);
            }
        }
    }


}


/**
 * Display the queue.
 * @param queueList
 * @returns {Promise<void>}
 */
const displayQueue = async (queueList) =>
{
    let myQueueIdIsCurrentlyBeingProcessedFlag = false;

    const queueUI = document.getElementById("queue");
    if(queueList.length === 0)
    {
        queueUI.innerHTML = "Current queue: Empty<br>You'll be first if you submit a request!";
    }
    else
    {
        // Is my request being currently processed?
        myQueueIdIsCurrentlyBeingProcessedFlag = queueList[0].queue_id === global_currentQueueId


        // The first item in the queue is the one that the AI is currently processing:
        queueUI.innerHTML = `<p><b>Now creating ${queueList[0].num_images} images for${myQueueIdIsCurrentlyBeingProcessedFlag ? " your request" : " "}:<br>'${queueList[0].text}'...</b></p><br>Current queue:<br>`;

        const processingDiv = document.createElement("div");
        processingDiv.innerHTML = `<b>Now creating ${queueList[0].num_images} images for${myQueueIdIsCurrentlyBeingProcessedFlag ? " your request" : " "}:<br>'${queueList[0].text}'...</b>`;

        // If we are the first in the queue, our prompt is the one currently being processed by the AI
        // so highlight it:
        if(myQueueIdIsCurrentlyBeingProcessedFlag && document.getElementById("output").innerText !== "Retrieving images...")
        {
            // Mention this in the status message:
            document.getElementById('status').innerText = `Your request is being processed right now...`;
            await startCountDown(queueList[0].num_images);
        }

        // Add the rest of the queue to the UI:

        let queuePosition = 1;
        let imageCount = 0;
        if(queueList.length > 1)
        {
            const orderedList = document.createElement("ol");
            for (let queueIndex = 1; queueIndex < queueList.length; queueIndex += 1)
            {
                let queueItem = queueList[queueIndex];
                const listItem = document.createElement("li");
                listItem.innerText = `${queueItem.text} - (${queueItem.num_images} images)`;
                imageCount += queueItem.num_images;

                // If the queue_id matches the one returned to use by the AI, this is our request, so highlight it:
                if(queueItem.queue_id === global_currentQueueId)
                {
                    listItem.style.fontWeight = "bold";
                    listItem.style.backgroundColor = "lightgreen";
                    myQueueIdIsCurrentlyBeingProcessedFlag = true;
                    // Mention this in the status message:
                    document.getElementById('status').innerText = `Request queued - position: ${queuePosition}`;
                    imageCount += queueItem.num_images;
                    await startCountDown(imageCount);
                }
                orderedList.appendChild(listItem);
                queuePosition += 1;
            }
            queueUI.appendChild(orderedList);
        } else
        {
            queueUI.innerHTML += " >> Queue is Empty!"
        }

    }


}

/**
 * Retrieve the library of images in JSON format, which we will use to display the images
 * where the queue_id returned by the AI matches the queue_id of the request we are currently processing.
 * @returns {Promise<boolean|*[]|any>}
 */
const getLibrary = async () =>
{
    let rawResponse;
    document.getElementById('status').innerText = "Reading library...";

    try
    {
        rawResponse = await fetch('/getlibrary', {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            }
        });
    }
    catch (e)
    {
        document.getElementById('status').innerText = "Sorry, service offline";
        return false;
    }

    if(rawResponse.status === 200)
    {
        document.getElementById('status').innerText = "Ready";
        return await rawResponse.json();
    } else
    {
        if(rawResponse.status === 502)
        {
            document.getElementById('status').innerText = `AI currently powering up and will start work on queued requests soon.`;
            return [];
        } else
        {
            if(rawResponse.status === 404)
            {
                document.getElementById('status').innerText = "DALL-E Engine Status: Online and ready";
                return [];
            } else
            {
                document.getElementById('status').innerText = `Sorry, an HTTP error ${rawResponse.status} occurred - check again shortly!`;
                return [];
            }
        }
    }
}


/**
 * Loop through the library looking for our queue_id and return/display the actual images.
 * @param library
 * @param output
 * @returns {Promise<void>}
 */
const displayImages = async (library, output) =>
{
    output.innerHTML = ""; //Empty of all child HTML ready for new images to be added.
    for (const libraryItem of library)
    {
        if(libraryItem.queue_id === global_currentQueueId)
        {
            for (const image_entry of libraryItem.generated_images)
            {
                const image = document.createElement("img");
                image.src = image_entry;
                image.alt = libraryItem.text_prompt;
                output.appendChild(image);
            }
        }
    }
}

/**
 * Start the countdown timer to indicate when our images should be ready
 * @param imageCount
 * @param queuePosition
 * @returns {Promise<void>}
 */
const startCountDown = async (imageCount) =>
{
    if(!global_countdownRunning)
    {
        global_countdownValue = imageCount * SECS_PER_IMAGE;
        const output = document.getElementById("output");
        output.innerText = `Images available in about ${global_countdownValue} second${global_countdownValue === 1 ? '' : 's'}...`;

        global_countdownTimerIntervalId = setInterval(() =>
        {

            if (global_countdownValue === 1)
            {
                stopCountDown();
            }
            else
            {
                global_countdownValue -= 1;
                output.innerText = `Images available in about ${global_countdownValue} second${global_countdownValue === 1 ? '' : 's'}...`;
            }
        }, 1000); // the countdown will trigger every 1 second

        global_countdownRunning = true;
    }
}

/**
 *
 */
const stopCountDown = () =>
{
    clearInterval(global_countdownTimerIntervalId);
    document.getElementById("output").innerHTML = "Retrieving images...";
    document.getElementById("buttonGo").innerText = "Click to send request";
    document.getElementById("buttonGo").enabled = true;
    global_countdownRunning = false;
}

/**
 * Set a timer to go and get the queued prompt requests from the server every 2 seconds
 * NB: Ths does not put a strain on the (python) web server as turnaround is only 10-20 milliseconds
 * so evn if a lot of people are using the service simultaneously it easily copes (I used apache AB to test!)
 */
setInterval(retrieveAndDisplayCurrentQueue, 2000);