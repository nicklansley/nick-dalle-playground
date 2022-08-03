let global_currentUUID = '';

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
        num_images: numImages
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
        global_currentUUID = queueConfirmation.queue_id;
        document.getElementById('status').innerText = `Request queued - check the queue for position`;
    }
    else
    {
        document.getElementById('status').innerText = `DALL-E Engine Status: Sorry, an HTTP error ${rawResponse.status} occurred - have another go!`;
    }
    document.getElementById('buttonGo').innerText = "Click to send request";
    document.getElementById('buttonGo').enabled = true;
}


const updateQueue = async () =>
{
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

        //Look for our UUID in the queue:
        let foundUUID = false;
        for(const queueItem of queueData)
        {
            if(queueItem.uuid === global_currentUUID)
            {
               foundUUID = true;
               break;
            }
        }
        //If we did not find our UUID then processing of our request must be completed.
        //So, if no images are being displayed, go get them!
        //However, do not this if the prompt has no value (i.e. when the page is first loaded)
        const output = document.getElementById("output");
        if(!foundUUID && output.innerHTML.length === 0 && document.getElementById("prompt").value.length > 0)
        {
            document.getElementById('status').innerText = `Image creation completed`;
            const library = await listLibrary();
            if(library)
            {
                await retrieveImages(library);
            }
        }
    }


}

const displayQueue = async (queueList) =>
{
    let foundMyUUID = false;

    const queueUI = document.getElementById("queue");
    if(queueList.length === 0)
    {
        queueUI.innerHTML = "Current queue: Empty<br>You'll be first if you submit a request!";
    } else
    {
        // Is my request being currently processed?
        foundMyUUID = queueList[0].uuid === global_currentUUID

        // The first item in the queue is the one that the AI is currently processing:
        queueUI.innerHTML = `<p><b>Now creating ${queueList[0].num_images} images for${foundMyUUID ? " your request" : " "}:<br>'${queueList[0].text}'...</b></p><br>Current queue:<br>`;

        const processingDiv = document.createElement("div");
        processingDiv.innerHTML = `<b>Now creating ${queueList[0].num_images} images for${foundMyUUID ? " your request" : " "}:<br>'${queueList[0].text}'...</b>`;

        // If we are the first in the queue, our prompt is the one currently being processed by the AI
        // so highlight it:
        if(foundMyUUID)
        {
            // Mention this in the status message:
            document.getElementById('status').innerText = `Your request is being processed right now...`;
        }

        // Add the rest of the queue to the UI:

        let queuePosition = 1;
        if(queueList.length > 1)
        {
            const orderedList = document.createElement("ol");
            for (let queueIndex = 1; queueIndex < queueList.length; queueIndex += 1)
            {
                let queueItem = queueList[queueIndex];
                const listItem = document.createElement("li");
                listItem.innerText = `${queueItem.text} - (${queueItem.num_images} images)`;

                // If the UUID matches the one returned to use by the AI, this is our request, so highlight it:
                if(queueItem.uuid === global_currentUUID)
                {
                    listItem.style.fontWeight = "bold";
                    listItem.style.backgroundColor = "lightgreen";
                    foundMyUUID = true;
                    // Mention this in the status message:
                    document.getElementById('status').innerText = `Request queued - position: ${queuePosition}`;
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


const listLibrary = async () =>
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


const retrieveImages = async (library) =>
{
    for (const libraryItem of library)
    {
        if(libraryItem.uuid === global_currentUUID)
        {
            for (const image_entry of libraryItem.generated_images)
            {
                const image = document.createElement("img");
                image.src = image_entry;
                image.alt = libraryItem.text_prompt;
                document.getElementById("output").appendChild(image);
            }
        }
    }
}


setInterval(updateQueue, 2000);