// Dictionary of the form: {string, bool} indicating if a key is pressed
const pressed_keys = {};
const tracked_keys = new Set();
// TODO: const leader = " ";


/*
    * Wraps the harpoon iframe and handles all commands related to the iframe
    * to initialize it. Commands to cycle and delete items are not supposed to be here.
    */
const Harpoon = {
    harpoonUI: null,

    init() {
        if (!this.harpoonUI) {
            this.harpoonUI = new UIComponent();
            // Need the classname to be able to manipulate the iframe from the parent (like hiding)
            this.harpoonUI.load("pages/harpoon.html", "harpoon-frame");
        }
    },
    // Entry point to creating the Harpoon Iframe
    activate() {
        this.init();
        this.harpoonUI.show(
            { name: "activate" },
            { focus: true },
        );
    },

    hide() {
        this.init();
        this.harpoonUI.postMessage({ name: "hide" });
    }
}

const Help = {
    helpUI: null,

    init() {
        if (!this.helpUI) {
            this.helpUI = new UIComponent();
            console.log("hello");
            this.helpUI.load("pages/help.html", "help-frame");
        }
    },

    activate() {
        this.init();
        this.helpUI.show(
            { name: "activate" },
            { focus: true },
        );
    },

    hide() {
        this.init();
        this.helpUI.postMessage({ name: "hide" });
    }

}


var harpoon = null;
var help = null;


document.addEventListener("click", event => {
    if (harpoon) {
        harpoon.hide();
    }
    if (help) {
        help.hide();
    }
});


/**
    * Release key in pressed_keys
    */
document.addEventListener("keyup", event => {
    pressed_keys[event.key] = false;
});



/**
    * Wrapper around postMessage to send specific messages at a port.
    */
const sendRequest = (messageParam, port) => {
    try {
        port.postMessage({ message: messageParam });
    } catch (err) {
    }
}


/**
    * Add key to pressed_keys.
    *
    * Outside of adding the pressed key, this listener checks if any combination of keys
    * are pressed that correspond to an input for the extension.
    * If a valid key combination is pressed, signal the port which handles the event accordingly.
    * This 
    *
    * Possible key combinations:
    *   <Alt> +
    *       "a": Mark current tab
    *       "e": View all marked tabs
    *       1-9: Swap current tab with corresponding marked tab
    *       "y": go to next tab in jump list
    *       "z": go to previous tab in jump list
    */
document.addEventListener("keydown", event => {
    const active = document.activeElement;
    if (
        active.tagName === "INPUT" ||
        active.tagName === "TEXTAREA" ||
        active.isContentEditable
    ) {
        return;
    }

    pressed_keys[event.key] = true;


    if (event.altKey) {
        try {
            var port = chrome.runtime.connect({ name: "tabs" });
        } catch (err) {
            return;
        }

        if (pressed_keys["a"]) {
            sendRequest("add", port);
        } else if (pressed_keys["z"]) {
            sendRequest("back", port);
            // The pressed keys for y, z, and numbers is set to false,
            // because this will change tabs, making the event listener
            // miss the key up event.
            pressed_keys['z'] = false;
            event.altKey = false; // FIXME: Don't think this is supposed to be here
            return;
        } else if (pressed_keys["y"]) {
            sendRequest("front", port);
            pressed_keys['y'] = false;
            return;
        } else if (pressed_keys["w"]) {
            if (!harpoon) {
                harpoon = Harpoon;
                harpoon.activate();
            } else {
                harpoon.activate();
            }
            pressed_keys["w"] = false;
        } else if (pressed_keys["/"]) {
            if (!help) {
                help = Help;
            }
            help.activate();
            pressed_keys["/"] = false;
        }
        else {
            for (let i = 0; i < 10; i++) {
                if (pressed_keys[i.toString()]) {
                    sendRequest(i, port);
                    pressed_keys[i] = false;

                    if (tracked_keys.has("s")) {
                        console.log("did it");
                        port.postMessage({ message: "addProfile", index: i });
                    }
                    break;
                }
            }
        }
        port.onMessage.addListener(function(message) {
            if (message.status === "bad") {
                console.log("Error occured while processing input")
            }
        });
    } else if (event.shiftKey) {
        try {
            var port = chrome.runtime.connect({ name: "tabs" });
        } catch (err) {
            return;
        }
        for (let i = 0; i < 10; i++) {
            if (event.code == `Digit${i}`) {
                if (tracked_keys.has("s")) {
                    port.postMessage({ message: "addProfile", index: i });
                    tracked_keys.clear();
                } else {
                    port.postMessage({ message: "loadProfile", index: i });
                    pressed_keys[event.key] = false;
                }
                break;
            }
        }
    } else {
        tracked_keys.clear();
    }

    if (event.key == "s") {
        tracked_keys.add("s");
    }
});
