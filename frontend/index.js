let global_currentUUID = '';
let imagesRetrievedFlag = false;
let processingFlag = false;

const go = async () =>
{
    document.getElementById('status').innerText = "Processing..."
    document.getElementById('buttonGo').innerText = "Processing...";
    document.getElementById('buttonGo').enabled = false;
    const data = {
        text: document.getElementById("prompt").value,
        num_images: parseInt(document.getElementById("num_images").value)
    }

    document.getElementById("output").innerText = "";
    imagesRetrievedFlag = false;

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
        processingFlag = true;
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
    }

    await checkIfReadyToDisplayImages();
}

const displayQueue = async (queueList) =>
{
    let foundMyUUID = false;
    const queueUI = document.getElementById("queue");
    if(queueList.length === 0)
    {
        queueUI.innerHTML = "Current queue: Empty<br>You'll be first if you submit a request!";
    }
    else
    {
        // The first item in the queue is the one that the AI is currently processing:
        queueUI.innerHTML = `Current queue:<br><b>PROCESSING: ${queueList[0].text} - (${queueList[0].num_images} images)</b>`;

        const processingDiv = document.createElement("div");
        processingDiv.innerHTML = `<b>PROCESSING: ${queueList[0].text} - (${queueList[0].num_images} images)</b>`;

        // If we are the first in the queue, our prompt is the one currently being processed by the AI
        // so highlight it:
        if(queueList[0].uuid === global_currentUUID)
        {
            foundMyUUID = true;
            // Mention this in the status message:
            document.getElementById('status').innerText = `Your request is being processed right now!`;
        }

        // Add the rest of the queue to the UI:
        const orderedList = document.createElement("ol");

        let queuePosition = 1;
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
    }

    if(foundMyUUID)
    {
        // If the current UUID is in the queue, it has not yet been processed
        imagesRetrievedFlag = false;
        processingFlag = true;
    }
    else
    {
        // If the current UUID is not anywhere in the queue, it has been processed
        processingFlag = false;
    }


}

const checkIfReadyToDisplayImages = async () =>
{
    if(!processingFlag && !imagesRetrievedFlag)
    {
        // If the current UUID is no longer in the queue then they are ready!
        // If we haven't already retrieved the images then we need to retrieve them now,
        // and mark them retrieved vy setting the imagesRetrievedFlag to true:
        document.getElementById('status').innerText = `Processing completed`;
        await retrieveImages();
        imagesRetrievedFlag = true;
        processingFlag = false;
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
        return  await rawResponse.json();
    }
    else if(rawResponse.status === 502)
    {
        document.getElementById('status').innerText = `AI currently powering up and will start work on queued requests soon.`;
        return [];
    }
    else  if(rawResponse.status === 404)
    {
        document.getElementById('status').innerText = "DALL-E Engine Status: Online and ready";
        return [];
    }
    else
    {
        document.getElementById('status').innerText = `Sorry, an HTTP error ${rawResponse.status} occurred - check again shortly!`;
        return [];
    }
}



const retrieveImages = async () =>
{
    const library = await listLibrary();
    for(const libraryItem of library)
    {
        if(libraryItem.uuid === global_currentUUID)
        {
            for(const image_entry of libraryItem.generated_images)
            {
                const image = document.createElement("img");
                image.src = image_entry;
                image.alt = libraryItem.text_prompt;
                document.getElementById("output").appendChild(image);
            }
        }
    }
}


setInterval(updateQueue, 1000);