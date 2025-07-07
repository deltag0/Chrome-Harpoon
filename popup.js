/*
    * Listener for pressing onthe popup button
    *
    */
document.addEventListener("DOMContentLoaded", () => {
    const tbody = document.getElementById("pinnedTable").querySelector("tbody");

    chrome.runtime.sendMessage({ type: "GET_PINNED_PAGES" }, (response) => {
        if (!response || !response.pinnedPages) {
            console.error("No pinnedPages returned");
            return;
        }
        const pinnedPages = response.pinnedPages;

        tbody.innerHTML = "";

        pinnedPages.forEach((tabId, i) => {
            const keyLabel = (i + 1) % 10;

            const row = document.createElement("tr");

            row.draggable = true;
            row.addEventListener('dragstart', () => {
                dragSrcIndex = i;
            });
            row.addEventListener('dragover', e => {
                e.preventDefault();
            });
            row.addEventListener('drop', () => {
                if (dragSrcIndex === null || dragSrcIndex === i) return;
                // swap DOM
                const rows = Array.from(tbody.children);
                const src = rows[dragSrcIndex];
                const dst = rows[i];
                tbody.insertBefore(src, dragSrcIndex < i ? dst.nextSibling : dst);
                // swap data
                [pinnedPages[dragSrcIndex], pinnedPages[i]] =
                    [pinnedPages[i], pinnedPages[dragSrcIndex]];
                chrome.runtime.sendMessage({
                    type: 'REORDER_PINNED_PAGES',
                    newOrder: pinnedPages
                });
                location.reload();
            });

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
            row.appendChild(urlCell);

            const actionCell = document.createElement("td");
            const removeBtn = document.createElement("button");
            removeBtn.innerHTML = `
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none"
       stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <line x1="18" y1="6" x2="6" y2="18"/>
    <line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
`;
            removeBtn.addEventListener("click", () => {
                chrome.runtime.sendMessage({
                    type: "REMOVE_PINNED_PAGE",
                    index: i
                });
                location.reload();
            });
            actionCell.appendChild(removeBtn);
            row.appendChild(actionCell);

            tbody.appendChild(row);

            if (tabId !== -1) {
                chrome.tabs.get(tabId, (tab) => {
                    if (chrome.runtime.lastError || !tab || !tab.url) {
                        urlCell.textContent = "(closed)";
                        urlCell.classList.add("empty");
                    } else {
                        const link = document.createElement("a");
                        link.href = tab.url;
                        let title = tab.title.substring(0, 20) + (tab.title.length > 18 ? "..." : "") || "(no title)";
                        link.textContent = title;
                        link.target = "_blank";
                        link.rel = "noopener";
                        urlCell.appendChild(link);
                        urlCell.classList.remove("empty");

                        chrome.tabs.query({ currentWindow: true, active: true }, (tabs) => {
                            if (tabs[0].id === tabId) {
                                keyCell.classList.add("active");
                            }
                        });
                    }
                });
            }
        });
    });
});
