/*
    *
    * TODO: Add a way to go back between last tab like in neovim
    */


const TabState = {
    pinnedPages: Array(10).fill(-1),
    pinnedPagesLen: 0,

    async load() {
        const data = await chrome.storage.local.get("TabState");
        if (data.TabState) {
            const saved = data.TabState;
            console.log(saved.pinnedPages);
            this.pinnedPagesLen = saved.pinnedPagesLen;
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
                pinnedPagesLen: this.pinnedPagesLen,
            }
        })
    },
};


let blockNextTab = false;


const JumpList = {
    maxSize: 100,
    size: 0,
    currIdx: -1,
    /*
    * Acts as a deque, but js doesn't have a built in structure for that.
    * That's really interesting... Fine though, because we only have 100 elements.
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
};

(async () => {
    await JumpList.load();
    await TabState.load();
})();


function setActive(tabId, windowId) {
    chrome.windows.update(windowId, { focused: true, state: 'maximized' }, (window) => {
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
    */
function addToJumpList(tabId, windowId) {
    if (JumpList.size === JumpList.maxSize && JumpList.currIdx === JumpList.maxSize - 1) {
        console.log("JumpList was full. Removed last element and replaced with new tab");
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


function moveBackJumpList() {
    blockNextTab = true;
    console.log("Moving back", JumpList.currIdx, JumpList.list);
    console.log("Removed changedTab?", !chrome.tabs.onActivated.hasListener(changedTab));
    if (JumpList.currIdx > 0) {
        JumpList.currIdx--;
        const idx = JumpList.currIdx;
        setActive(JumpList.list[idx][0], JumpList.list[idx][1]);
    }
}

function moveForwardJumpList() {
    blockNextTab = true;
    console.log("Removed changedTab?", !chrome.tabs.onActivated.hasListener(changedTab));
    console.log("Moving forward", JumpList.currIdx, JumpList.list);
    if (JumpList.currIdx < JumpList.size - 1) {
        console.log("Actually moved");
        JumpList.currIdx += 1;
        const idx = JumpList.currIdx;
        setActive(JumpList.list[idx][0], JumpList.list[idx][1]);
    }
}


function addToPinned(tabId) {
    console.log(TabState.pinnedPages);
    for (let i = 0; i < TabState.pinnedPages.length; i++) {
        if (TabState.pinnedPages[i] === -1) {
            console.log("Added: ", tabId);
            TabState.pinnedPages[i] = tabId;
            return;
        }
    }
}


/*
    * swapTabs - Swap visible tab of user to requested tab if possible
    * @idx: The tab requested to set active based on the user's numbered options
    *   {int}
    *
    * Given an idx, set the the tab TabState.pinnedPages[idx] active. If the tab is on a different
    * window, fullscreen the window to display that tab.
    */
async function swapTab(idx) {
    if (idx === 0 && TabState.pinnedPages.length === 10) {
        let tabId = TabState.pinnedPages[9];

        if (tabId === -1) {
            console.log("Error while swapping, could not find requested tab")
            return -1;
        }

        let tab = await chrome.tabs.get(tabId);

        if (tab == null) {
            console.log("Error while swapping, could not find requested tab")
            return -1;
        }

        TabState.pinnedPages[9]
        setActive(tab.id, tab.windowId);
    } else if (TabState.pinnedPages.length >= idx) {
        let tabId = TabState.pinnedPages[idx - 1];

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
    * 
    * "check":
    *  Display all pinned pages to the user.
    *
    * 0-9:
    *   Any integer from 0-9 will switch to the corresponding tab (0 would be the tenth tab)
    *   if it exists.
    */
async function handleTabCommands(message) {
    let ret = 0;
    if (message.message === "add") {
        chrome.tabs.query({
            active: true,
            currentWindow: true
        }, function(tabs) {
            var lastTab = tabs[0];
            addToPinned(lastTab.id);
        });
    } else if (message.message === "check") {
        console.log("Checking all pinned pages");
    } else if (message.message >= 0 && message.message <= 9) {
        console.log("Swapping");
        ret = swapTab(message.message);
    } else if (message.message === "front") {
        console.log("should move forward")
        moveForwardJumpList();
    } else if (message.message === "back") {
        moveBackJumpList();
    }


    await JumpList.syncStorage();
    await TabState.syncStorage();
    return ret;
}


/**
    * Listener for messages
    */
chrome.runtime.onConnect.addListener(function(port) {
    if (port.name === "dummy") { // message just to keep the service worker from going inactive
        return;
    }

    if (port.name === "tabs") {
        var ret = 0;
        port.onMessage.addListener(ret = handleTabCommands);
        try {
            if (ret == 0) {
                port.postMessage({ status: "ok" });
            } else {
                port.postMessage({ status: "bad" });
            }
        } catch (err) {
            console.log("Failed to send response to content script. Unexpected interruption");
        }
    }
});


/*
    * Listener for messgaes from popup.js which requests the tabs to display to the user UI
    */
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === "GET_PINNED_PAGES") {
        sendResponse({ pinnedPages: TabState.pinnedPages });
    }
});


/*
    * Function to remove tab from TabState.pinnedPages after it was deleted
    */
chrome.tabs.onRemoved.addListener(async tabId => {
    console.log("Removed: ", tabId);
    for (let i = 0; i < TabState.pinnedPages.length; i++) {
        if (TabState.pinnedPages[i] === tabId) {
            TabState.pinnedPages[i] = -1;
            TabState.pinnedPagesLen--;
            break;
        }
    }
    var i = JumpList.size;
    while (i--) {
        if (JumpList.list[i][0] === tabId) {
            JumpList.list.splice(i, 1);
            JumpList.size--;
        }
    }

    await JumpList.syncStorage();
    await TabState.syncStorage();
});


/*
    * Add tab to jump list when user switches tabs.
    * This listener should be disabled, however, when the keybinds
    * for moving backwards/forward in the jumplist.
    */
async function changedTab(activeInfo) {
    if (blockNextTab) {
        blockNextTab = false;
        return;
    }

    console.log("Added tab");
    addToJumpList(activeInfo.tabId, activeInfo.windowId);
    await JumpList.syncStorage();
}


/*
    * Function to listen do tab switches, and modify the jump list accordingly
    */
if (!chrome.tabs.onActivated.hasListener(changedTab)) {
    chrome.tabs.onActivated.addListener(changedTab);
}
