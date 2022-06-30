let listingArray = [];
let library = [];
let adminMode = true;

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
    for(const listingItem of listing)
    {
        const listingElements = listingItem.split("/");
        const listingNameDateTime = listingElements[2].split("_");
        const libraryItem = {
            path:  listingItem,
            name: decodeURIComponent((listingNameDateTime[0])).trim(),
            date: new Date(listingNameDateTime[1] + " " + listingNameDateTime[2])
            }
        library.push(libraryItem);
    }
    showImages();
}

const formatTitle = (title) =>
{
    let titleSections = title.replace("/", "").split("_");
    let titleHTML = `<b>${titleSections[0]}</b>`;
    titleHTML += `<br><i>${titleSections[1]} ${titleSections[2]}</i>`;
    return titleHTML;
}


const getImages = async (path) =>
{
    const fullPath = `/library/${path}`;
    for (let i = 0; i < 9; i++)
    {
        try
        {
            let imageResponse = await fetch(`${fullPath}/${i}.jpeg`, {
                method: 'HEAD'
            });
            if(imageResponse.status === 200)
            {
                const pathElements = path.replace("/\n", "").split("_");
                const dateTimeString = pathElements[1] + " " + pathElements[2];
                const dateTime = new Date(dateTimeString);
                let imageData = {
                    folder: pathElements[0].replace('/library/', ''),
                    path: `${fullPath}/${i}.jpeg`,
                    name: pathElements[0] + " - image " + (i),
                    date: dateTime
                }
                library.push(imageData);

            }

        }
        catch (e)
        {
            document.getElementById('status').innerText = "Sorry, service offline";
        }

    }
}

const showImages = () =>
{
    const filterOn = document.getElementById('searchText').value.length > 0;
    let filteredLibrary;

    if(filterOn)
    {
        filteredLibrary = library;
        const wordList = document.getElementById('searchText').value.toLowerCase().split(" ");
        for(const word of wordList)
        {
              filteredLibrary = library.filter(entry => entry.name.toLowerCase().includes(word));
        }
    }
    else
    {
        filteredLibrary = library;
    }

    let sortedLibrary = filteredLibrary.sort((a, b) => a.name > b.name ? 1 : -1);

    let previousName = "";
    let imagesHTML = '<div>';
    let columnCounter = 0;
    sortedLibrary.forEach((image) =>
    {
        if (columnCounter === 4 || image.name !== previousName)
        {
            imagesHTML += '<br>';
            columnCounter = 0;
            previousName = image.name;
            imagesHTML += '<hr /><h3>' + image.name + '</h3>';

        }
        if(adminMode)
        {
            imagesHTML += `<img height="200"  width="200" src="${image.path}" ondblclick="deleteImage('${image.name}', '${image.path}')" alt="${image.name}">&nbsp;&nbsp;`;
        }
        else
        {
            imagesHTML += `<img height="200" width="200" src="${image.path}" alt="${image.name}">&nbsp;&nbsp;`;
        }
        columnCounter++;
    });
    imagesHTML += "</div>";
    document.getElementById('output').innerHTML = imagesHTML;
    document.getElementById('status').innerText = `${filteredLibrary.length}${filterOn ? " filtered " : " "}images found `;

}


const deleteImage = async (name, path) =>
{
    if(window.confirm(`Are you sure you want to delete image "${name}"?`))
    {
        const rawResponse = await fetch('/deleteimage', {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                path: path
            })
        });

        if(rawResponse.status === 200)
        {
            const result = await rawResponse.json();
            if(result.success)
            {
                document.getElementById('status').innerText = "Image deleted";
                await listLibrary();
            } else
            {
                document.getElementById('status').innerText = "Image not deleted";
            }
        }
        else
        {
            document.getElementById('status').innerText = `Sorry, an HTTP error ${rawResponse.status} occurred - check again shortly!`;
        }
    }
}

setInterval(function () {listLibrary().then()}, 10000);