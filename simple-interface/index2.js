let global_currentUUID = '';
let global_intervalID = 0;
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
        global_intervalID = setInterval(updateQueue, 1000);
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
            displayQueue(queueData);
        }
}

const displayQueue = (queueList) =>
{
    const queueUI = document.getElementById("queue");
    const orderedList = document.createElement("ol");
    let foundMyUUID = false;

    for(const queueItem of queueList)
    {
        let displayLine = `${queueItem.text} - (${queueItem.num_images} images`;
        if(queueItem.uuid === global_currentUUID)
        {
            displayLine += " <--";
            foundMyUUID = true;
        }
        const listItem = document.createElement("li");
        listItem.innerText = displayLine;
        orderedList.appendChild(listItem);
    }

    if(foundMyUUID)
    {
        queueUI.appendChild(orderedList);
    }
    else
    {
        // Stop the interval
        clearInterval(global_intervalID);
        queueUI.innerHTML = "";
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
