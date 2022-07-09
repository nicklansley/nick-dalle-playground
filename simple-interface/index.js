let global_currentUUID = '';
let imagesRetrievedFlag = false;


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
}

const displayQueue = async (queueList) =>
{
    const queueUI = document.getElementById("queue");
    queueUI.innerHTML = "Current queue:<br>";
    const orderedList = document.createElement("ol");
    let foundMyUUID = false;

    let queuePosition = 1;
    for(const queueItem of queueList)
    {
        let displayLine = `${queueItem.text} - (${queueItem.num_images} images)`;
        if(queueItem.uuid === global_currentUUID)
        {
            displayLine += " <--";
            foundMyUUID = true;
            document.getElementById('status').innerText = `Request queued - position: ${queuePosition}`;
        }
        const listItem = document.createElement("li");
        listItem.innerText = displayLine;
        orderedList.appendChild(listItem);
        queuePosition += 1;
    }

    if(foundMyUUID)
    {
        queueUI.appendChild(orderedList);
    }
    else if(!imagesRetrievedFlag)
    {
        document.getElementById('status').innerText = `Processing completed`;
        await retrieveImages();
        imagesRetrievedFlag = true;
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
        } else
        {
            document.getElementById('status').innerText = `Sorry, an HTTP error ${rawResponse.status} occurred - check again shortly!`;
        }
    }
}

setInterval(updateQueue, 1000);