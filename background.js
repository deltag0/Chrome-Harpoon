const TabState = {
    pinnedPages: Array(10).fill(-1),
    autoPin: false,
    pinnedPagesLen: 0,

    async load() {
        const data = await chrome.storage.local.get("TabState");
        if (data.TabState) {
            const saved = data.TabState;
            this.pinnedPagesLen = saved.pinnedPagesLen;
            this.autoPin = saved.autoPin;
            for (let i = 0; i < saved.pinnedPages.length; i++) {
                this.pinnedPages[i] = saved.pinnedPages[i];
            }
        }
        return this;
    },

    async syncStorage() {
        return chrome.storage.local.set({
            TabState: {
                pinnedPages: this.pinnedPages,
                autoPin: this.autoPin,
                pinnedPagesLen: this.pinnedPagesLen,
            }
        })
    },
    async reset() {
        for (let i = 0; i < 10; i++) {
            this.pinnedPages[i] = -1;
        }
        this.pinnedPagesLen = 0;
        this.autoPin = false;
        await this.syncStorage();
    },
    /* On any change to the TabState struct, this callback must be used to sync, the
    * TabState with the local storage
    */
    async modifyTabState(callback, ...args) {
        await callback(...args);
        await this.syncStorage();
    }
};

const ProfileState = {
    savedURLs: Array.from({ length: 10 }, () => Array(10).fill("")),

    async load() {
        const data = await chrome.storage.local.get("ProfileState");
        if (data.ProfileState) {
            const saved = data.ProfileState;
            for (let i = 0; i < 10; i++) {
                for (let j = 0; j < 10; j++) {
                    this.savedURLs[i][j] = saved.savedURLs[i][j];
                }
            }
        }
    },

    async syncStorage() {
        // NOTE: No clue why, but this doesn't work without getting first line :/
        await chrome.storage.local.get("ProfileState");
        await chrome.storage.local.set({
            ProfileState: {
                savedURLs: JSON.parse(JSON.stringify(this.savedURLs)),
            }
        });
    },

    async reset() {
        for (let i = 0; i < 10; i++) {
            for (let j = 0; j < 10; j++) {
                this.savedURLs[i][j] = "";
            }
        }
        await this.syncStorage();
    },

    async modifyProfileState(callback, ...args) {
        await callback(...args);
        await this.syncStorage();
    }
};


let blockNextTab = false;


const JumpList = {
    maxSize: 100,
    size: 0,
    currIdx: -1,
    /*
    * Acts as a deque, but js doesn't have a built in structure for that.
    * That's really interesting... Fine though, because we only have 100 elements.
    * Array of pairs {tabId, windowId}
    */
    list: [],

    async load() {
        const data = await chrome.storage.local.get("JumpList");
        if (data.JumpList) {
            const saved = data.JumpList;
            this.size = saved.size;
            for (let i = 0; i < saved.list.length; i++) {
                this.list[i] = saved.list[i];
            }
        }
        return this;
    },

    async syncStorage() {
        return chrome.storage.local.set({
            JumpList: {
                list: this.list,
                size: this.size,
                maxSize: this.maxSize,
                currIdx: this.currIdx
            }
        });
    },

    async reset() {
        this.maxSize = 100;
        size = 0;
        this.currIdx = -1;
        this.list = [];
        await this.syncStorage();
    },
    async modifyJumpList(callback, ...args) {
        await callback(...args);
        await this.syncStorage();
    }
};

chrome.runtime.onStartup.addListener(async () => {
    JumpList.reset();
    TabState.reset();
    await ProfileState.load();
});

(async () => {
    await TabState.load();
    await JumpList.load();
    await ProfileState.load();
})();


function setActive(tabId, windowId) {
    chrome.windows.update(windowId, { focused: true }, (window) => {
        chrome.tabs.update(tabId, { active: true })
    });
}


// TODO: Put these in the actual class for JumpList
/*
    * addToJumpList - Add a tabId to the JumpList
    * @tabId: The new tab the user switched to
    *   {int}
    *
    * Add the tabId to the JumpList. If the currIdx of the JumpList
    * is not at the end, all elements following the currIdx are deleted,
    * the tabId is added, and the currIdx is set to the new tab (i.e: the last element).
    *
    * If the JumpList is full, AND the currIdx is at the end of the list the first element 
    * is popped to make space, the tabId is added, and currIdx incremented.
    *
    * NOTE: modifies JumpList
    */
function addToJumpList(tabId, windowId) {
    if (JumpList.size === JumpList.maxSize && JumpList.currIdx === JumpList.maxSize - 1) {
        JumpList.list.shift();
        JumpList.list.push([tabId, windowId]);
    } else {
        var toDelete = JumpList.size - JumpList.currIdx - 1;
        for (var i = 0; i < toDelete; i++) {
            JumpList.list.pop();
            JumpList.size--;
        }
        JumpList.list.push([tabId, windowId])
        JumpList.size++;
    }

    JumpList.currIdx = JumpList.size - 1;
}


/*
    * moveBackJumpList - Move back in the jump list and change active tab
    *
    * If not at the start, switch the active tab to the previously selected
    *
    * NOTE: modifies JumpList
    */
function moveBackJumpList() {
    blockNextTab = true;
    if (JumpList.currIdx > 0) {
        JumpList.currIdx--;
        const idx = JumpList.currIdx;
        setActive(JumpList.list[idx][0], JumpList.list[idx][1]);
    }
}


/*
    * moveForwardJumpList - Move forward in the jump list and change active tab
    * 
    * If not at the end, switch the active tab to the previously selected
    * 
    * NOTE: modifies JumpList
    */
function moveForwardJumpList() {
    blockNextTab = true;
    if (JumpList.currIdx < JumpList.size - 1) {
        JumpList.currIdx += 1;
        const idx = JumpList.currIdx;
        setActive(JumpList.list[idx][0], JumpList.list[idx][1]);
    }
}


/*
    * addToPinned - If the tabId isn't already pinned, add it to the first available slot
    * @tabId - tab id
    *   {int}
    *
    * Add a tabId to the pinnedPages.
    *
    * NOTE: modifies TabState
    */
function addToPinned(tabId) {
    if (TabState.pinnedPages.includes(tabId)) {
        return;
    }
    for (let i = 0; i < TabState.pinnedPages.length; i++) {
        if (TabState.pinnedPages[i] === -1) {
            console.log("Added: ", tabId);
            TabState.pinnedPages[i] = tabId;
            chrome.action.setIcon({
                tabId,
                path: {
                    "128": "./assets/icon_activated.png",
                }
            });
            return;
        }
    }
}


chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (TabState.pinnedPages.includes(tabId)) {
        chrome.action.setIcon({
            tabId,
            path: {
                "128": "./assets/icon_activated.png",
            }
        });
    }
});


/*
    *
    *
    * NOTE: Modifies ProfileState
    */
function addToProfiles(i) {
    console.log("Added profile, ", i);
    urls = ProfileState.savedURLs[i];
    TabState.pinnedPages.forEach((tabId, i) => {
        if (tabId !== -1) {
            chrome.tabs.get(tabId, tab => {
                urls[i] = tab.url;
            });
        } else {
            urls[i] = "";
        }
    });
}


async function loadProfile(i) {
    const urls = ProfileState.savedURLs[i];
    for (let j = 0; j < urls.length; j++) {
        const url = urls[j];
        if (url === "") continue;

        await new Promise(resolve => {
            chrome.tabs.create({ url }, () => resolve());
        });

        chrome.tabs.query({ active: true, currentWindow: true }, async function(tabs) {
            const tabId = tabs[0].id;
            await TabState.modifyTabState((tabId, idx) => {
                TabState.pinnedPages[idx] = tabId
                chrome.action.setIcon({
                    tabId,
                    path: {
                        "128": "./assets/icon_activated.png",
                    }
                });
            }, tabId, j);
        });
    }
}


/*
    * swapTabs - Swap visible tab of user to requested tab if possible
    * @tabState: Constant reference to TabState
    *   {TabState}
    * @idx: The tab requested to set active based on the user's numbered options
    *   {int}
    *
    * Given an idx, set the the tab TabState.pinnedPages[idx] active. If the tab is on a different
    * window, fullscreen the window to display that tab.
    *
    */
async function swapTab(tabState, idx) {
    Object.freeze(tabState);
    if (idx === 0) {
        let tabId = tabState.pinnedPages[9];

        if (tabId === -1) {
            console.log("Error while swapping, could not find requested tab")
            return -1;
        }

        let tab = await chrome.tabs.get(tabId);

        if (tab == null) {
            console.log("Error while swapping, could not find requested tab")
            return -1;
        }

        tabState.pinnedPages[9]
        setActive(tab.id, tab.windowId);
    } else {
        let tabId = tabState.pinnedPages[idx - 1];

        if (tabId === -1) {
            console.log("Tab requested doesn't exist. No switching");
            return 0;
        }

        let tab = await chrome.tabs.get(tabId);
        if (tab == null) {
            console.log("Error while swapping, could not find requested tab")
            return -1;
        }
        setActive(tab.id, tab.windowId);
    }
    return 0;
}


/**
    * handleTabCommnads - React to the message received from the content script
    * @message: Command received from content script based on user input
    *   {string, int}
    *
    * Given a message, react accordingly. The possible messages are:
    * "add":
    *   Pin the last active tab if less than 10 tabs are currently pinned,
    *   and the tab requested to be pinned is not already in the TabState.pinnedPages array.
    * 0-9:
    *   Any integer from 0-9 will switch to the corresponding tab (0 would be the tenth tab)
    *   if it exists.
    * "front":
    *   Move forward in the jump list if possible
    * "back":
    *   Move backwards in the jump list if possible
    * "addProfile":
    *   Saved a profile to the specified index in the message
    * "loadProfile":
    *   Load a profile from the specified index in the message
    */
async function handleTabCommands(message, port) {
    let ret = 0;
    if (message.message === "add") {
        chrome.tabs.query({
            active: true,
            currentWindow: true
        }, async function(tabs) {
            var lastTab = tabs[0];
            await TabState.modifyTabState(addToPinned, lastTab.id);
        });
    } else if (message.message >= 0 && message.message <= 9) {
        console.log("Swapping");
        ret = await swapTab(TabState, message.message);
    } else if (message.message === "front") {
        console.log("should move forward")
        await JumpList.modifyJumpList(moveForwardJumpList);
    } else if (message.message === "back") {
        await JumpList.modifyJumpList(moveBackJumpList);
    } else if (message.message === "addProfile") {
        await ProfileState.modifyProfileState(addToProfiles, message.index);
    } else if (message.message === "loadProfile") {
        await loadProfile(message.index);
    }

    console.log(ret);
    try {
        if (ret === 0) {
            port.postMessage({ status: "ok" });
        } else {
            port.postMessage({ status: "bad" });
        }
    } catch (err) {
        console.log("Failed to send response to content script. Unexpected interruption");
    }
}


/**
    * Listener for messages on a port
    */
chrome.runtime.onConnect.addListener(function(port) {
    if (port.name === "tabs") {
        port.onMessage.addListener(msg => handleTabCommands(msg, port));
    }
});


/*
    * Listener for messgaes from popup.js which requests the tabs to display to the user UI
    */
chrome.runtime.onMessage.addListener(async (request, sender, sendResponse) => {
    if (request.type === "GET_PINNED_PAGES") {
        sendResponse({ pinnedPages: TabState.pinnedPages });
    } else if (request.type === "REMOVE_PINNED_PAGE") {
        var idx = request.index;
        var tabId = TabState.pinnedPages[idx]
        await TabState.modifyTabState(removeFromPinnedPages, tabId);
        chrome.action.setIcon({
            tabId,
            path: {
                "128": "./assets/icon_unactivated.png",
            }
        });
    } else if (request.type === 'REORDER_PINNED_PAGES') {
        await TabState.modifyTabState(reorderPinnedPages, request.newOrder);
    } else if (request.type === "MOVE_TO_PINNED_PAGE") { // The index relative to the pinned number
        var idx = request.index;
        swapTab(TabState, idx);
    } else if (request.type === "UPDATE_AUTOPIN") {
        const enabled = request.enabled;
        TabState.modifyTabState((enabled) => { TabState.autoPin = enabled; }, enabled);
    } else if (request.type === "GET_AUTOPIN") {
        sendResponse({ enabled: TabState.autoPin });
    }
});


/*
    * reorderPinnedPages - copy order from newPinnedPages into TabState
    * @newPinnedPages: Array containing tab ids
    *   {array}
    *
    * NOTE: modifies TabState
    */
function reorderPinnedPages(newPinnedPages) {
    newPinnedPages.forEach((tabId, i) => {
        TabState.pinnedPages[i] = tabId;
    });
}


/*
    * removeFromPinnedPages - remove tabId from TabState
    * @ tabId - tabId
    *   {int}
    * Function to remove tab from TabState.pinnedPages after it was deleted
    *
    * NOTE: modifies TabState
    */
function removeFromPinnedPages(tabId) {
    for (let i = 0; i < TabState.pinnedPages.length; i++) {
        if (TabState.pinnedPages[i] === tabId) {
            TabState.pinnedPages[i] = -1;
            TabState.pinnedPagesLen--;

            break;
        }
    }
}


/*
    *
    * NOTE: modifies JumpList
    */
function removeFromJumpList(tabId) {
    var i = JumpList.size;
    while (i--) {
        if (JumpList.list[i][0] === tabId) {
            JumpList.list.splice(i, 1);
            JumpList.size--;
        }
    }
}


/*
    * @ tabId - tabId
    *   {int}
    * Function to remove tab from TabState.pinnedPages after it was deleted
    */
chrome.tabs.onRemoved.addListener(async tabId => {
    console.log("Removed: ", tabId);
    await TabState.modifyTabState(removeFromPinnedPages, tabId);
    await JumpList.modifyJumpList(removeFromJumpList, tabId);
});


/*
    * changedTab - Detect if we changed a tab on chrome
    * @activeInfo: See tabs.onActivated documentation for activeInfo
    *
    * Add tab to jump list when user switches tabs.
    * This listener should be disabled, however, when the keybinds
    * for moving backwards/forward in the jumplist.
    *
    */
async function changedTab(activeInfo) {
    if (blockNextTab) {
        blockNextTab = false;
        return;
    }
    if (TabState.autoPin) {
        addToPinned(activeInfo.tabId);
    }

    let tabId = activeInfo.tabId
    await JumpList.modifyJumpList(addToJumpList, tabId, activeInfo.windowId);
}


/*
    * Function to listen do tab switches, and modify the jump list accordingly
    */
if (!chrome.tabs.onActivated.hasListener(changedTab)) {
    chrome.tabs.onActivated.addListener(changedTab);
}


/*
    * Reinject all tabs with the content script
    */
function reinjectContentScriptsToAllTabs() {
    chrome.tabs.query({}, (tabs) => {
        for (const tab of tabs) {
            if (!tab.url.startsWith('chrome://') && !tab.url.startsWith('chrome-extension://')) {
                chrome.scripting.executeScript({
                    target: { tabId: tab.id },
                    files: ["DomUtils.js", "ui.js", "content-script.js"]
                });
            }
        }
    });
}


/*
    * Even listener for installs/resets
    *
    * When the extension is installed for the first time, popup the welcome page.
    * When an extension is reset, call the reset procedure.
    */
chrome.runtime.onInstalled.addListener(details => {
    if (details.reason === chrome.runtime.OnInstalledReason.INSTALL) {
        chrome.tabs.create({
            url: chrome.runtime.getURL("./installation//install.html")
        });
    }
    JumpList.reset();
    TabState.reset();
    ProfileState.reset();
    reinjectContentScriptsToAllTabs();
});

