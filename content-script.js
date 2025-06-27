// Dictionary of the form: {string, bool} indicating if a key is pressed
const pressed_keys = {};
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


var harpoon = null;


document.addEventListener("click", event => {
    if (harpoon) {
        harpoon.hide();
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
    * Sends a message on a port named "dummy" so that the service worker doesn't go inactive.
    */
function sendDummyMessage() {
    try {
        var port = chrome.runtime.connect({ name: "dummy" });
        sendRequest("dummy", port);
    } catch (err) {
        return;
    }
}


/*
    * Send a dummy message every 29seconds since the server worker goes inactive
    * for some unknown reason. Cannot find a reason why.
    */
setInterval(sendDummyMessage, 29000);


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
        }
        else {
            for (let i = 0; i < 10; i++) {
                if (pressed_keys[i.toString()]) {
                    sendRequest(i, port);
                    pressed_keys[i] = false;
                    break;
                }
            }
        }
        port.onMessage.addListener(function(message) {
            if (message.status === "bad") {
                console.log("Error occured while processing input")
            }
        });
    }
});
