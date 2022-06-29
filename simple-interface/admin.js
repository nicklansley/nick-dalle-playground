let library = [];

const listLibrary = async () =>
{
    let rawResponse;
    library = [];
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
        const result = await rawResponse.text();
        await processListing(result);
    } else
    {
        document.getElementById('status').innerText = `Sorry, an HTTP error ${rawResponse.status} occurred - check again shortly!`;
    }
}

const processListing = async (listing) =>
{

    listing = listing.replace(listing.substring(0, listing.indexOf("<ul>")), "");
    listing = listing.replace(listing.substring(listing.indexOf("</ul>")), "");

    const listingData = listing.split("<li>");
    for (const listingItem of listingData)
    {
        let itemLine = listingItem.replace('<a href="', '').replace('</a></li>', '');
        let items = itemLine.split('/">');
        if(!items[0].includes("<ul>"))
        {
            await getImages(items[1]);
        }
    }
    console.log(JSON.stringify(library, null, 2));
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
    let filteredLibrary = [];
    let filterOn = false;
    if(document.getElementById('searchText').value.length > 0)
    {
        filteredLibrary = library;
        const wordList = document.getElementById('searchText').value.toLowerCase().split(" ");
        for(const word of wordList)
        {
              filteredLibrary = filteredLibrary.filter(image => image.name.toLowerCase().includes(word));
        }

        filterOn = true;
}
    else
    {
        filteredLibrary = library;
        filterOn = false;
    }

    let sortedLibrary = filteredLibrary.sort((a, b) => a.folder > b.folder ? 1 : -1);

    let previousFolder = "";


    let imagesHTML = '<table><tr>';
    let columnCounter = 0;
    sortedLibrary.forEach((image) =>
    {
        if(filterOn)
        {
            if (columnCounter === 4)
            {
                imagesHTML += '</tr><tr>';
                columnCounter = 0;
            }
        }
        else
        {
            if (image.folder !== previousFolder || columnCounter === 4)
            {
                imagesHTML += '</tr>';
                imagesHTML += `<tr><td colspan="9"><hr /><b>${image.folder}</b></td></tr><tr>`;
                previousFolder = image.folder;
                columnCounter = 0;
            }
        }


        imagesHTML += `<td><img height="200", width="200" src="${image.path}" alt="${image.name}"></td>`;
        columnCounter++;

    });
    imagesHTML += "</tr></table>";
    document.getElementById('output').innerHTML = imagesHTML;
    document.getElementById('status').innerText = `${filteredLibrary.length}${filterOn ? " filtered " : " "}images found `;

}
