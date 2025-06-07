/*
    * Listener for pressing onthe popup button
    *
    */
document.addEventListener("DOMContentLoaded", () => {
    const tbody = document.getElementById("pinnedTable").querySelector("tbody");

    // Ask background for pinnedPages
    chrome.runtime.sendMessage({ type: "GET_PINNED_PAGES" }, (response) => {
        if (!response || !response.pinnedPages) {
            console.error("No pinnedPages returned");
            return;
        }
        const pinnedPages = response.pinnedPages;

        // Clear any existing rows (if re-opening popup)
        tbody.innerHTML = "";

        pinnedPages.forEach((tabId, i) => {
            const keyLabel = (i + 1) % 10;

            // Create <tr> and two <td> cells: one for label, one for URL (or “empty”)
            const row = document.createElement("tr");

            const keyCell = document.createElement("td");
            keyCell.textContent = keyLabel;
            row.appendChild(keyCell);

            const urlCell = document.createElement("td");
            if (tabId === -1) {
                urlCell.textContent = "(empty)";
                urlCell.classList.add("empty");
            } else {
                urlCell.classList.add("empty");
            }
            row.append(urlCell);
            tbody.append(row);

            if (tabId !== -1) {
                // We have a valid tabId → fetch tab info
                chrome.tabs.get(tabId, (tab) => {
                    if (chrome.runtime.lastError || !tab || !tab.url) {
                        urlCell.textContent = "(closed)";
                        urlCell.classList.add("empty");
                    } else {
                        // Create an <a> element pointing to tab.url
                        const link = document.createElement("a");
                        link.href = tab.url;
                        link.textContent = tab.url;
                        link.target = "_blank";
                        link.rel = "noopener";
                        urlCell.appendChild(link);
                        urlCell.classList.remove("empty");
                    }
                });
            }
        });
    });
});
