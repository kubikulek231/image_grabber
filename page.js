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

    // Add event listeners for each button
    document.getElementById("sortHeight").addEventListener("click", () => {
        toggleButtonState(document.getElementById("sortHeight"));
        if (document.getElementById("sortHeight").hasAttribute('toggled')) {
            sortByHeight();  // Execute sort by height only if it's toggled
        }
    });
    
    document.getElementById("sortWidth").addEventListener("click", () => {
        toggleButtonState(document.getElementById("sortWidth"));
        if (document.getElementById("sortWidth").hasAttribute('toggled')) {
            sortByWidth();  // Execute sort by width only if it's toggled
        }
    });
    
    document.getElementById("sortSize").addEventListener("click", () => {
        toggleButtonState(document.getElementById("sortSize"));
        if (document.getElementById("sortSize").hasAttribute('toggled')) {
            sortBySize();  // Execute sort by size only if it's toggled
        }
    });
    
    // Function to toggle the 'toggled' attribute
    function toggleButtonState(button) {
        // Remove 'toggled' from all buttons before adding it to the clicked one
        const allButtons = document.querySelectorAll('#sortingContainer > button');
        allButtons.forEach(btn => btn.removeAttribute('toggled'));

        // Set the 'toggled' attribute only for the clicked button
        button.setAttribute('toggled', '');  // Set the 'toggled' attribute
    }
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

    sortBySize();
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
    const div = createImageDiv();
    const imgContainer = createImageContainer(imgData);
    div.appendChild(imgContainer);
    
    if (enableImageDetails) {
        const details = createImageDetails(imgData);
        div.appendChild(details);
    }
    
    const checkbox = createCheckbox(imgData.url);
    div.appendChild(checkbox);
    
    const imageButtonBar = createImageButtonBar(imgData);
    div.appendChild(imageButtonBar);
    
    container.appendChild(div);
}

function createImageDiv() {
    const div = document.createElement("div");
    div.className = "image-card";
    return div;
}

function createImageContainer(imgData) {
    const imgContainer = document.createElement("div");
    imgContainer.classList.add("image-container");
    
    const img = document.createElement("img");
    img.src = imgData.url;
    imgContainer.appendChild(img);
    
    return imgContainer;
}

function createImageDetails(imgData) {
    const details = document.createElement("div");
    details.className = "imageDetails";
    details.innerHTML = `
        <div class="image-filename"><strong>File:</strong> ${imgData.fileName || "Unknown"}</div>
        <div class="image-size"><strong>Size:</strong> ${imgData.sizeKb ? imgData.sizeKb.toFixed(2) + " kB" : "Unknown"}</div>
        <div class="image-dimensions"><strong>Dimensions:</strong> ${imgData.width} x ${imgData.height} px</div>
    `;
    return details;
}

function createCheckbox(url) {
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.setAttribute("url", url);
    return checkbox;
}

function createImageButtonBar(imgData) {
    const imageButtonBar = document.createElement("div");
    imageButtonBar.classList.add("image-button-bar");
    
    imageButtonBar.appendChild(createDownloadButton(imgData));
    imageButtonBar.appendChild(createOpenInNewTabButton(imgData.url));
    imageButtonBar.appendChild(createViewButton(imgData));
    
    return imageButtonBar;
}

function createDownloadButton(imgData) {
    const downloadButton = document.createElement("button");
    downloadButton.classList.add("imageButton", "singleDownloadButton");
    downloadButton.addEventListener("click", () => downloadImage(imgData.url, imgData.fileName));
    return downloadButton;
}

function createOpenInNewTabButton(url) {
    const openInNewTabButton = document.createElement("button");
    openInNewTabButton.classList.add("imageButton", "openInNewTabButton");
    openInNewTabButton.addEventListener("click", () => window.open(url, "_blank"));
    return openInNewTabButton;
}

function createViewButton(imgData) {
    const viewButton = document.createElement("button");
    viewButton.classList.add("imageButton", "viewImageButton");
    
    viewButton.addEventListener("click", () => {
        const overlay = createImageOverlay(imgData.url);
        document.body.appendChild(overlay);
    });
    
    return viewButton;
}

function createImageOverlay(url) {
    const overlay = document.createElement("div");
    overlay.id = "imageViewOverlay";
    
    const overlayImage = document.createElement("img");
    overlayImage.src = url;
    overlay.appendChild(overlayImage);
    
    const closeButton = document.createElement("button");
    closeButton.classList.add("close-overlay-button");
    closeButton.innerText = "CLOSE";
    closeButton.addEventListener("click", () => removeImageOverlay());
    
    overlay.appendChild(closeButton);
    overlay.addEventListener("click", (event) => {
        if (event.target === overlay) {
            removeImageOverlay();
        }
    });
    
    return overlay;
}

function removeImageOverlay() {
    const overlayElement = document.querySelector("#imageViewOverlay");
    if (overlayElement !== null) {
        overlayElement.remove();
    }
}

/**
 * Function to directly download an image when clicked
 * @param {string} url - The image URL
 * @param {string} fileName - The image filename
 */
async function downloadImage(url, fileName) {
    try {
        // Fetch the image headers to determine MIME type
        const headResponse = await fetch(url, { method: 'HEAD' });

        if (!headResponse.ok) {
            throw new Error(`Failed to fetch headers for the image. Status: ${headResponse.status}`);
        }

        const contentType = headResponse.headers.get('Content-Type');
        let extension = '';

        // Determine file extension based on the content type
        if (contentType.includes('image/jpeg')) {
            extension = '.jpg';
        } else if (contentType.includes('image/png')) {
            extension = '.png';
        } else if (contentType.includes('image/gif')) {
            extension = '.gif';
        } else if (contentType.includes('image/bmp')) {
            extension = '.bmp';
        } else if (contentType.includes('image/webp')) {
            extension = '.webp';
        } else {
            throw new Error(`Unsupported image type: ${contentType}`);
        }

        // If no filename is given, derive one from the URL or default to "downloaded_image"
        let finalFileName = fileName || (url.substring(url.lastIndexOf('/') + 1) || "downloaded_image");

        // If the URL doesn't already have the extension, append the correct one
        if (!finalFileName.toLowerCase().endsWith(extension)) {
            finalFileName += extension;
        }

        // Now fetch the image data and proceed to download
        const imageResponse = await fetch(url);
        
        if (!imageResponse.ok) {
            throw new Error(`Failed to fetch image data. Status: ${imageResponse.status}`);
        }

        const blob = await imageResponse.blob();

        if (!blob || blob.size === 0) {
            throw new Error("Failed to fetch the image data. Try opening it in a new tab and saving manually.");
        }

        // Create a Blob URL for the image
        const objectURL = URL.createObjectURL(blob);

        // Create a link element and trigger the download
        const link = document.createElement("a");
        link.href = objectURL;
        link.download = finalFileName;
        document.body.appendChild(link);
        link.click();  // Trigger the download
        document.body.removeChild(link);  // Clean up

        // Revoke the Blob URL after the download
        URL.revokeObjectURL(objectURL);
    } catch (error) {
        console.error("Error downloading image:", error);
        
        if (error.message.includes("CORS")) {
            alert("This image cannot be downloaded due to CORS restrictions. Please try opening it in a new tab and saving manually.");
        } else {
            alert(`Failed to download image: ${error.message}`);
        }
    }
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
