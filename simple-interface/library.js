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
            const result = await rawResponse.text();
            await processListing(result);
            document.getElementById('status').innerText = "Library read! Right-click (or tap and hold) on any image to save a full size version using the browser's save function.";
        }
        else
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
            let tr = document.createElement('tr');
            let td1 = document.createElement('td');
            let td2 = document.createElement('td');
            td1.innerHTML = formatTitle(items[1]); // title

            td2.innerHTML = await getImages(items[1]); // images
            tr.appendChild(td1);
            tr.appendChild(td2);
            document.getElementById('tableLibrary').appendChild(tr);
        }

    }
}

const formatTitle = (title) =>
{
    let titleSections =  title.replace("/", "").split("_");
    let titleHTML = `<b>${titleSections[0]}</b>`;
    titleHTML += `<br><i>${titleSections[1]} ${titleSections[2]}</i>`;
    return titleHTML;
}


const getImages = async (path) =>
{
    let imagesHTML = '<table><tr>';
    const fullPath = `/library/${path}`;
    for(let i=0; i<9; i++)
    {
        try
        {
            let imageResponse = await fetch(`${fullPath}/${i}.jpeg`, {
                method: 'HEAD'
            });
            if(imageResponse.status === 200)
            {
                imagesHTML += `<td><img height="200", width="200" src="${fullPath}/${i}.jpeg" alt="${path}"></td>`;
            }
        }
        catch (e)
        {
            document.getElementById('status').innerText = "Sorry, service offline";
            return "</tr></table>";
        }
    }
    return imagesHTML + "</tr></table>";
}