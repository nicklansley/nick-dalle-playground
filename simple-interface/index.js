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

    const rawResponse = await fetch('/dalle', {
        method: 'POST',
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
    });

    if(rawResponse.status === 200)
    {
        const imageArray = await rawResponse.json();

        for (const base64Image of imageArray)
        {
            const img = document.createElement("img");
            img.src = "data:image/png;base64," + base64Image;
            img.alt = data.text;
            img.width = 500;
            img.height = 500;
            document.getElementById("output").appendChild(img);
        }
    } else
    {
        document.getElementById('status').innerText = `DALL-E Engine Status: Sorry, an HTTP error ${rawResponse.status} occurred - have another go!`;
    }
    const end = new Date().getTime();
    const time = end - start;
    document.getElementById('status').innerText = `Completed! These ${data.num_images} images took ${(time/1000).toFixed(2)} seconds to generate (${(time/1000/data.num_images).toFixed(2)} secs/image).`;
    document.getElementById('buttonGo').innerText = "Click to send request";
    document.getElementById('buttonGo').enabled = true;
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
