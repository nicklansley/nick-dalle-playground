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
        document.getElementById('status').innerText = "Library read! Right-click (or tap and hold) on any image to save a full size version using the browser's save function.";
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
    let previousFolder = "";
    const sortedLibrary = library.sort((a, b) => a.folder > b.folder ? 1 : -1);

    let imagesHTML = '<table><tr>';
    sortedLibrary.forEach((image) =>
    {
        if (image.folder !== previousFolder)
        {
            imagesHTML += '</tr><tr>';
            imagesHTML += `<td><b>${image.folder}</b></td>`;
            previousFolder = image.folder;
        }
        else
        {
            imagesHTML += `<td><img height="200", width="200" src="${image.path}" alt="${image.name}"></td>`;
        }
    });
    imagesHTML += "</tr></table>";
    document.getElementById('output').innerHTML = imagesHTML;

}
