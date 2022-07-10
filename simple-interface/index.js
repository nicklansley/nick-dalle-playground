let global_currentUUID = '';
let imagesRetrievedFlag = false;
let processingFlag = false;

const go = async () =>
{
    document.getElementById('status').innerText = "Processing..."
    document.getElementById('buttonGo').innerText = "Processing...";
    document.getElementById('buttonGo').enabled = false;
    const start = new Date().getTime();
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
        document.getElementById('status').innerText = `Request queued with ID ${queueConfirmation.queue_id}`;
        processingFlag = true;
    }
    else
    {
        document.getElementById('status').innerText = `DALL-E Engine Status: Sorry, an HTTP error ${rawResponse.status} occurred - have another go!`;
    }
    const end = new Date().getTime();
    const time = end - start;
    document.getElementById('status').innerText = `Completed! These ${data.num_images} images took ${(time/1000).toFixed(2)} seconds to generate (${(time/1000/data.num_images).toFixed(2)} secs/image).`;
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
        queueUI.innerHTML = "Current queue:<br>";
        const orderedList = document.createElement("ol");

        let queuePosition = 1;
        for (const queueItem of queueList)
        {
            const listItem = document.createElement("li");
            listItem.innerText = `${queuePosition === 1 ? "Processing >> " : ""}${queueItem.text} - (${queueItem.num_images} images)`;
            if(queueItem.uuid === global_currentUUID)
            {
                listItem.style.fontWeight = "bold";
                listItem.style.backgroundColor = "lightgreen";
                foundMyUUID = true;
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
        // If the current UUID is not in the queue, it has been processed
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


const checkLive = async () =>
{
    let rawResponse;
    if(!document.getElementById('status').innerText.includes("Sorry"))
    {

        try
        {
            rawResponse = await fetch('/status', {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                }
            });
        }
        catch (e)
        {
            document.getElementById('status').innerText = "DALL-E Engine Status: Sorry, service offline";
            return false;
        }

        if(rawResponse.status === 200)
        {
            const result = await rawResponse.json();

            if(result.success)
            {
                document.getElementById('status').innerText = "DALL-E Engine Status: Online and ready";
                return true;
            } else
            {
                document.getElementById('status').innerText = "Online but not yet ready";
                return false;
            }
        }
        else if(rawResponse.status === 502)
        {
            document.getElementById('status').innerText = `AI currently powering up and will start work on queued requests soon.`;
            return false;
        }
        else
        {
            document.getElementById('status').innerText = `Sorry, an HTTP error ${rawResponse.status} occurred - check again shortly!`;
        }
    }
}

setInterval(updateQueue, 1000);