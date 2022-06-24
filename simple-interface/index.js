const go = async () =>
{
    document.getElementById('buttonGo').enabled = false;

    const data = {
        text: document.getElementById("prompt").value,
        num_images: parseInt(document.getElementById("num_images").value)
    }

    document.getElementById('status').innerText = "DALL-E Engine Status: Processing...";
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
            img.width = "500";
            img.height = "500";
            document.getElementById("output").appendChild(img);
        }

        document.getElementById('status').innerText = "DALL-E Engine Status: Ready";
    }
    else
    {
        document.getElementById('status').innerText = `DALL-E Engine Status: Sorry, an HTTP error ${rawResponse.status} occurred - have another go!`;
    }

    document.getElementById('buttonGo').enabled = true;
}


const checkLive = async () =>
{
    let rawResponse;

    document.getElementById('status').innerText = "DALL-E Engine Status: Checking...";

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
            document.getElementById('status').innerText = "DALL-E Engine Status: Online but not yet ready";
            return false;
        }
    }
    else
    {
        document.getElementById('status').innerText = `DALL-E Engine Status: Sorry, an HTTP error ${rawResponse.status} occurred - check again shortly!`;
    }


}
