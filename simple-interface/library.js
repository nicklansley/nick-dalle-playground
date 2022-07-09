let listingArray = [];
let library = [];
let adminMode = true;
let autoRefreshId;

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
    document.getElementById("output").innerHTML = "";

    if(library.length === 0)
    {
        library = await listLibrary();
    }

    const searchText = document.getElementById('searchText').value;

    for(const libraryItem of library)
    {
        if(searchText.length ===  0 || libraryItem.text_prompt.includes(searchText))
        {
            const hr = document.createElement("hr");
            document.getElementById("output").appendChild(hr);

            const h3 = document.createElement("h3");
            h3.innerText = libraryItem.text_prompt;
            document.getElementById("output").appendChild(h3);

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



const deleteImage = async (img) =>
{
    const jsonData = img.getAttribute('data-image-details');
    const data = JSON.parse(jsonData.replaceAll("&quot;", "\""));

    if(window.confirm(`Are you sure you want to delete image "${data.name}"?`))
    {
        const rawResponse = await fetch('/deleteimage', {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                path: data.path
            })
        });

        if(rawResponse.status === 200)
        {
            const jsonResult = await rawResponse.text();
            if(jsonResult === "{success: true}")
            {
                document.getElementById('status').innerText = "Image deleted";
                document.getElementById(`${img.id}`).remove();
                await listLibrary();
            } else
            {
                document.getElementById('status').innerText = "Image not deleted";
            }
        } else
        {
            document.getElementById('status').innerText = `Sorry, an HTTP error ${rawResponse.status} occurred - check again shortly!`;
        }
    }
}

const setAutoRefresh = async () =>
{
    const checkBox = document.getElementById('autoRefresh');
    if(checkBox.checked)
    {
        await listLibrary();
        autoRefreshId = setInterval(function ()
                        {
                            listLibrary().then();
                        }, 10000);
    }
    else
    {
        clearInterval(autoRefreshId);
    }

}
