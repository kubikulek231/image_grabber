let enableImageDetails = false;
const grabBtn = document.getElementById("grabBtn");

grabBtn.addEventListener("click", () => {
    // Disable button before processing
    grabBtn.disabled = true;

    // Get active browser tab
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        var tab = tabs[0];
        if (tab) {
            execScript(tab);
        } else {
            alert("There are no active tabs");
        }

        // Re-enable button if necessary
        grabBtn.disabled = false;
    });
});

/**
 * Execute a grabImages() function on a web page,
 * opened on specified tab and on all frames of this page
 * @param tab - A tab to execute script on
 */
function execScript(tab) {
    // Execute a function on a page of the current browser tab
    // and process the result of execution
    const enableMinSize = localStorage.getItem("enable_minImageSizeKb") === "true";
    const enableMinWidth = localStorage.getItem("enable_minImageWidthPx") === "true";
    const enableMinHeight = localStorage.getItem("enable_minImageHeightPx") === "true";
    enableImageDetails = localStorage.getItem("enable_imageDetails") === "true";

    // Retrieve the stored values, default to 0 if the setting is disabled (unchecked)
    const minSizeKb = enableMinSize ? parseFloat(localStorage.getItem("minImageSizeKb")) : 0;
    const minWidth = enableMinWidth ? parseInt(localStorage.getItem("minImageWidthPx")) : 0;
    const minHeight = enableMinHeight ? parseInt(localStorage.getItem("minImageHeightPx")) : 0;

    console.log("minImageSizeKb", minSizeKb);
    console.log("minImageWidthPx", minWidth);
    console.log("minImageHeightPx", minHeight);
    chrome.scripting.executeScript(
        {
            target: { tabId: tab.id, allFrames: true },
            func: grabImages,
            args: [minSizeKb, minWidth, minHeight]  // Pass the values to the function
        },
        onResult
    );
}

/**
 * Executed on a remote browser page to grab all images
 * and return their URLs
 *
 *  @return Array of image URLs
 */
function grabImages(minSizeKb, minWidth, minHeight) {
    const images = document.querySelectorAll("img");
    return Array.from(images)
        .filter(img => {
            const width = img.naturalWidth;
            const height = img.naturalHeight;

            // Ensure the image is loaded before filtering
            if (!width || !height) return false;

            // Validate width and height, ensure they're valid numbers, and greater than or equal to minWidth/minHeight
            const isWidthValid = !isNaN(width) && width >= (minWidth || 0);
            const isHeightValid = !isNaN(height) && height >= (minHeight || 0);

            // Only filter images that do not meet the minWidth or minHeight criteria
            if ((minWidth && !isWidthValid) || (minHeight && !isHeightValid)) {
                return false;
            }

            // Fetch the image size (requires a HEAD request)
            try {
                const xhr = new XMLHttpRequest();
                xhr.open("HEAD", img.src, false); // Synchronous request
                xhr.send(null);

                const contentLength = xhr.getResponseHeader("Content-Length");
                const sizeKb = contentLength ? parseInt(contentLength, 10) / 1024 : NaN;

                // Skip size check if the size is invalid (non-numeric or NaN)
                if (isNaN(sizeKb)) {return true;}
                if (sizeKb < minSizeKb) {
                    return false;
                }
            } catch (error) {
                console.warn("Could not determine size for:", img.src);
            }

            return true;
        })
        .map(img => img.src);
}


/**
 * Executed after all grabImages() calls finished on
 * remote page
 * Combines results and copy a list of image URLs
 * to clipboard
 *
 * @param {[]InjectionResult} frames Array
 * of grabImage() function execution results
 */
function onResult(frames) {
    // If script execution failed on remote end
    // and could not return results
    if (!frames || !frames.length) {
        alert("Could not retrieve images from specified page");
        return;
    }
    // Combine arrays of image URLs from
    // each frame to a single array
    const imageUrls = frames.map(frame => frame.result)
                            .reduce((r1, r2) => r1.concat(r2));
    // Open a page with a list of images and send urls to it
    openImagesPage(imageUrls);
}

/**
 * Opens a page with list of URLs and UI to select and
 * download them on a new browser tab and send an
 * array of image URLs to this page
 *
 * @param {*} urls - Array of Image URLs to send
 */
function openImagesPage(urls) {
    chrome.tabs.create(
        { "url": "page.html", active: false }, (tab) => {
            // * Send `urls` array to this page
            setTimeout(() => {
                chrome.tabs.sendMessage(tab.id, { urls, enableImageDetails }, (response) => {
                    chrome.tabs.update(tab.id, { active: true });
                });                
            }, 500);
        }
    );
}

// Handling of the advanced settings
document.addEventListener("DOMContentLoaded", function () {
    // Array of setting IDs for easy iteration
    const settingIds = ["minImageSizeKb", "minImageWidthPx", "minImageHeightPx"];

    // Load stored values and apply to UI
    settingIds.forEach(id => {
        console.log(localStorage);

        // Retrieve stored values from localStorage
        const value = localStorage.getItem(id);
        const checkboxState = localStorage.getItem(`enable_${id}`) === "true";

        // Apply checkbox state and input value
        if (checkboxState) {
            document.getElementById(`enable_${id}`).checked = true;
            document.getElementById(id).disabled = false; // Enable the corresponding input
        }

        if (value) {
            document.getElementById(id).value = value;
        }

        // Attach event listeners to checkboxes for enabling/disabling inputs
        document.getElementById(`enable_${id}`).addEventListener("change", function () {
            const input = document.getElementById(id);
            input.disabled = !this.checked;
            console.log(`Toggled input ${id}`);

            // Store checkbox state in localStorage
            localStorage.setItem(`enable_${id}`, this.checked);
        });

        // Save the input values in localStorage when changed
        document.getElementById(id).addEventListener("input", function () {
            localStorage.setItem(id, this.value);
            console.log(`Saved ${id} value:`, this.value);
            console.log(localStorage);
        });
    });

    const justTickSettingIds = ["imageDetails"];
    justTickSettingIds.forEach(id => {
        document.getElementById(`enable_${id}`).addEventListener("change", function () {
            console.log(`Toggled input ${id}`);
            // Store checkbox state in localStorage
            localStorage.setItem(`enable_${id}`, this.checked);
        });
        // Retrieve stored values from localStorage
        const value = localStorage.getItem(id);
        const checkboxState = localStorage.getItem(`enable_${id}`) === "true";

        // Apply checkbox state and input value
        if (checkboxState) {
            document.getElementById(`enable_${id}`).checked = true;
            document.getElementById(id).disabled = false; // Enable the corresponding input
        }

        if (value) {
            document.getElementById(id).value = value;
        }
    });

});
