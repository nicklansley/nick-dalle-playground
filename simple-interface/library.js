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
        const result = await rawResponse.json();
        await processListing(result);
    } else
    {
        document.getElementById('status').innerText = `Sorry, an HTTP error ${rawResponse.status} occurred - check again shortly!`;
    }
}

const processListing = async (listing) =>
{
    library = [];
    listingArray = listing;
    for (const listingItem of listing)
    {
        const listingElements = listingItem.split("/");
        const listingNameDateTime = listingElements[2].split("_");
        const libraryItem = {
            path: listingItem,
            name: decodeURIComponent((listingNameDateTime[0])).trim(),
            date: new Date(listingNameDateTime[1] + " " + listingNameDateTime[2])
        }
        library.push(libraryItem);
    }
    showImages();
}


const showImages = () =>
{
    const filterOn = document.getElementById('searchText').value.length > 0;
    let filteredLibrary;

    if(filterOn)
    {
        filteredLibrary = library;
        const wordList = document.getElementById('searchText').value.toLowerCase().split(" ");
        for (const word of wordList)
        {
            filteredLibrary = library.filter(entry => entry.name.toLowerCase().includes(word));
        }
    } else
    {
        filteredLibrary = library;
    }

    let sortedLibrary = filteredLibrary.sort((a, b) => a.name > b.name ? 1 : -1);

    let previousName = "";
    let imagesHTML = '<div>';
    let columnCounter = 0;
    sortedLibrary.forEach((image, index) =>
    {
        if(image.name !== previousName)
        {
            imagesHTML += '<br>';
            previousName = image.name;
            imagesHTML += '<hr /><h3>' + image.name + '</h3>';

        }

        if(adminMode)
        {
            const jsonData = JSON.stringify(image).replaceAll("\"", "&quot;");
            imagesHTML += `<img id="img-${index}" height="200" data-image-details="${jsonData}" width="200" src="${image.path}" ondblclick="deleteImage(this)" alt="${image.name}">&nbsp;&nbsp;`;
        } else
        {
            imagesHTML += `<img height="200" width="200" src="${image.path}" alt="${image.name}">&nbsp;&nbsp;`;
        }
        columnCounter++;
    });
    imagesHTML += "</div>";
    document.getElementById('output').innerHTML = imagesHTML;
    document.getElementById('status').innerText = `${filteredLibrary.length}${filterOn ? " filtered " : " "}images found `;

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
    if(document.getElementById('autoRefresh').checked)
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
