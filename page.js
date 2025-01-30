let enableImageDetails = false;
let imageDataArray = []; // Array to store image data

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    enableImageDetails = message.enableImageDetails;

    if (message.urls.length === 0) {
        enableImageError();  // Show the error message if no images are found
    } else {
        processImages(message.urls); // Process and create image data
    }

    sendResponse("OK");
    document.getElementById("sortHeight").addEventListener("click", () => {
        sortByHeight();  // Call the function to sort by height
    });
    
    document.getElementById("sortWidth").addEventListener("click", () => {
        sortByWidth();  // Call the function to sort by width
    });
    
    document.getElementById("sortSize").addEventListener("click", () => {
        sortBySize();  // Call the function to sort by size
    });
});

// Function to enable loading (show loading indicator)
function enableLoading() {
    const loadingElement = document.querySelector("#imagesLoading");
    if (loadingElement) {
        loadingElement.style.display = "block";  // Show the loading indicator
    }
}

// Function to disable loading (hide loading indicator)
function disableLoading() {
    const loadingElement = document.querySelector("#imagesLoading");
    if (loadingElement) {
        loadingElement.style.display = "none";  // Hide the loading indicator
    }
}

// Function to enable and show the image error message
function enableImageError() {
    const imageErrorElement = document.querySelector("#imagesError");
    if (imageErrorElement) {
        imageErrorElement.style.display = "block";  // Show the error message
    }
}

/**
 * Process images to create the imageData structure
 * @param {Array} urls - Array of image URLs
 */
async function processImages(urls) {
    enableLoading();
    if (!urls || !urls.length) {
        return;
    }

    // Clear the current imageDataArray before populating with new data
    imageDataArray = [];

    // Collect image data for each URL
    for (const url of urls) {
        const imgData = await getImageData(url);
        imageDataArray.push(imgData);
    }

    // Now that we have the image data, populate the container
    populateContainer();
    disableLoading();
}

/**
 * Fetch and create image data (including size, width, height, etc.)
 * @param {string} url - URL of the image
 * @returns {Object} - Image data object
 */
async function getImageData(url) {
    return new Promise((resolve) => {
        const img = new Image();

        img.onload = async function () {
            const width = img.naturalWidth;
            const height = img.naturalHeight;
            const sizeKb = await getImageSize(url);
            const fileName = url.split('/').pop().split('?')[0];

            // Return the image data
            resolve({
                url,
                width,
                height,
                sizeKb,
                fileName,
            });
        };

        img.src = url;
    });
}

/**
 * Populate the container with image nodes based on the imageDataArray
 */
function populateContainer() {
    const container = document.querySelector(".container");
    container.innerHTML = ""; // Clear the existing container content

    imageDataArray.forEach((imgData) => {
        addImageNode(container, imgData);
    });
}

/**
 * Dynamically add a DIV with image and checkbox to select it
 * @param {HTMLElement} container - DOM node of a container div
 * @param {Object} imgData - Image data object
 */
function addImageNode(container, imgData) {
    const div = document.createElement("div");
    div.className = "imageDiv";

    const img = document.createElement("img");
    img.src = imgData.url;

    // Create details div
    if (enableImageDetails) {
        const details = document.createElement("div");
        details.className = "imageDetails";
        details.innerHTML = `
            <p><strong>File:</strong> ${imgData.fileName || "Unknown"}</p>
            <p><strong>Size:</strong> ${imgData.sizeKb ? imgData.sizeKb.toFixed(2) + " kB" : "Unknown"}</p>
            <p><strong>Dimensions:</strong> ${imgData.width} × ${imgData.height} px</p>
        `;
        div.appendChild(details);
    }

    div.appendChild(img);

    // Checkbox for selection
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.setAttribute("url", imgData.url);
    div.appendChild(checkbox);

    container.appendChild(div);
}

/**
 * The "Select All" checkbox "onChange" event listener
 * Used to check/uncheck all image checkboxes
 */
document.getElementById("selectAll").addEventListener("change", (event) => {
    const items = document.querySelectorAll(".container input");
    for (let item of items) {
        item.checked = event.target.checked;
    }
});

/**
 * The "Download" button "onClick" event listener
 * Used to compress all selected images to a ZIP-archive
 * and download this ZIP-archive
 */
document.getElementById("downloadBtn").addEventListener("click", async () => {
    try {
        const urls = getSelectedUrls();
        const archive = await createArchive(urls);
        downloadArchive(archive);
    } catch (err) {
        alert(err.message);
    }
});

/**
 * Get the URLs of all selected images
 * @returns {Array} - List of selected URLs
 */
function getSelectedUrls() {
    const urls = Array.from(document.querySelectorAll(".container input"))
        .filter(item => item.checked)
        .map(item => item.getAttribute("url"));
    if (!urls || !urls.length) {
        throw new Error("Please, select at least one image");
    }
    return urls;
}

/**
 * Sort images by largest size (undefined on top)
 * @returns {Array} - Sorted imageDataArray by size
 */
function sortBySize() {
    imageDataArray = imageDataArray.sort((a, b) => {
        if (a.sizeKb === undefined) return -1;
        if (b.sizeKb === undefined) return 1;
        return b.sizeKb - a.sizeKb;
    });

    // Repopulate the container with sorted images
    populateContainer();
}

/**
 * Sort images by largest width (descending)
 * @returns {Array} - Sorted imageDataArray by width
 */
function sortByWidth() {
    imageDataArray = imageDataArray.sort((a, b) => b.width - a.width);

    // Repopulate the container with sorted images
    populateContainer();
}

/**
 * Sort images by largest height (descending)
 * @returns {Array} - Sorted imageDataArray by height
 */
function sortByHeight() {
    imageDataArray = imageDataArray.sort((a, b) => b.height - a.height);

    // Repopulate the container with sorted images
    populateContainer();
}

/**
 * Function to download the ZIP-archive
 * @param {Blob} archive - The ZIP archive to download
 */
function downloadArchive(archive) {
    const link = document.createElement("a");
    link.href = URL.createObjectURL(archive);
    link.download = "images.zip";
    document.body.appendChild(link);
    link.click();
    URL.revokeObjectURL(link.href);
    document.body.removeChild(link);
}

/**
 * Fetch image size from the server (in KB)
 * @param {string} url - The image URL
 * @returns {number} - The image size in KB
 */
async function getImageSize(url) {
    try {
        const response = await fetch(url, { method: "HEAD" });
        const contentLength = response.headers.get("Content-Length");
        return contentLength ? parseInt(contentLength, 10) / 1024 : null;
    } catch (error) {
        console.warn("Could not get size for:", url);
        return null;
    }
}
