import * as UIComponentMessenger from "./pages/ui_component_messenger.js"
/*
    * NOTE: This script gets activated from an HTML file
    */

let pagePort = null;
let handleMessage = null;

let ui = null;

async function activate() {
    if (ui == null) {
        ui = new HarpoonUI();
    }

    // Fetch pinned pages once
    chrome.runtime.sendMessage({ type: "GET_PINNED_PAGES" }, (response) => {
        ui.pinnedPages = response.pinnedPages
        const container = document.getElementById('pins');
        container.innerHTML = '';

        ui.pinnedPages.forEach((tabId, idx) => {
            const item = document.createElement('div');
            item.className = 'harpoon-item';
            if (idx === 0) {
                item.classList.add("active");
            }

            const keySpan = document.createElement('span');
            keySpan.className = 'harpoon-key';
            keySpan.textContent = `${(idx + 1) % 10}`;
            item.appendChild(keySpan);

            const label = document.createElement('span');
            label.className = 'harpoon-label';
            if (tabId !== -1) {
                chrome.tabs.get(tabId, (tab) => {
                    if (chrome.runtime.lastError || !tab || !tab.url) {
                        label.textContent = "(closed)";
                        label.classList.add("empty");
                    } else {
                        label.textContent = tab.title.substring(0, 20) + (tab.title.length > 18 ? "..." : "") || "(no title)";
                        label.classList.remove("empty");

                        chrome.tabs.query({ currentWindow: true, active: true }, (tabs) => {
                            if (tabs[0].id === tabId) {
                                keySpan.classList.add("selected");
                            }
                        });
                    }

                });
            } else {
                label.textContent = "(empty)";
                label.classList.add("empty");
            }
            item.appendChild(label);

            container.appendChild(item);
        });
    });
}


class HarpoonUI {
    box;
    // idx
    currTab = 0;
    pinnedPages;

    constructor() {
        this.onKeyDown = this.onKeyDown.bind(this);
        this.onKeyUp = this.onKeyUp.bind(this);
        this.update = this.update.bind(this);
        this.hide = this.hide.bind(this);
        this.initDom();
    }

    async update() {

    }

    onKeyDown(event) {

        // NOTE: Users could technically delete marks
        // while the iframe is open from the icon, but
        // I'm leaving that to undefined behaviour instead
        // of fetching every time
        if (event.key === "j") {
            var labels = document.querySelectorAll(".harpoon-item");
            const tab = labels[this.currTab];
            tab.classList.remove("active");
            this.currTab = (this.currTab + 1) % 10;
            const newCurr = labels[this.currTab];
            newCurr.classList.add("active");
        } else if (event.key === "k") {
            var labels = document.querySelectorAll(".harpoon-item");
            const tab = labels[this.currTab];
            tab.classList.remove("active");
            this.currTab = this.currTab === 0 ? labels.length - 1 : this.currTab - 1;
            const newCurr = labels[this.currTab];
            newCurr.classList.add("active");
        } else if (event.key === "x") {
            var labels = document.querySelectorAll(".harpoon-label");
            var keys = document.querySelectorAll(".harpoon-key");

            const tab = labels[this.currTab];
            const key = keys[this.currTab];

            key.classList.remove("selected");
            tab.classList.add("empty");
            tab.innerHTML = "(empty)";
            chrome.runtime.sendMessage({
                type: "REMOVE_PINNED_PAGE",
                index: this.currTab
            });
        } else if (event.key === "Enter") {
            var idx = this.currTab + 1;
            this.hide();
            chrome.runtime.sendMessage({
                type: "MOVE_TO_PINNED_PAGE",
                index: idx
            });
        } else if (event.key === "Escape") {
            this.hide();
        } else {
            for (let i = 0; i < 10; i++) {
                if (event.key == i) {
                    this.hide();
                    chrome.runtime.sendMessage({
                        type: "MOVE_TO_PINNED_PAGE",
                        index: i
                    });
                    break;
                }
            }

        }

    }
    onKeyUp(event) {
    }

    hide(event) {
        this.currTab = 0;
        UIComponentMessenger.postMessage({ name: "hide" });
    }

    initDom() {
        this.box = document.getElementsByClassName("harpoon-ui");
        document.addEventListener("keydown", this.onKeyDown);
        document.addEventListener("keyup", this.onKeyUp);
    }
};


// window.addEventListener("message", registerMessage);


// async function registerMessage(event) {
//     switch (event.data) {
//         case "SET_IFRAME_PORT":

//             break;
//         default:
//             console.error("HERE: Unrecognized message type");
//             break;
//     }


// }

function init() {
    UIComponentMessenger.init();
    UIComponentMessenger.registerHandler((event) => {
        switch (event.data.name) {
            case "hide":
                ui?.hide();
                break;
            case "hidden":
                ui?.onHidden();
                break;
            case "activate":
                activate();
                break;
            default:
                console.log("Unrecognized message: ", event.data.name);
        }
    });
}

init();
