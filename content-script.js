// Dictionary of the form: {string, bool} indicating if a key is pressed
const pressed_keys = {};
const leader = " ";


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
    *   <space> +
    *       "a": Mark current tab
    *       "e": View all marked tabs
    *       1-9: Swap current tab with corresponding marked tab
    *   <ctrl> +
    *       "i": go to next tab in jump list
    *       "o": go to previous tab in jump list
    */
document.addEventListener("keydown", event => {
    if (event.key === " " && event.target === document.body) {
        event.preventDefault();
    }


    const active = document.activeElement;
    if (
        active.tagName === "INPUT" ||
        active.tagName === "TEXTAREA" ||
        active.isContentEditable
    ) {
        return;
    }

    pressed_keys[event.key] = true;
    console.log(pressed_keys);

    if (pressed_keys[leader]) {
        try {
            var port = chrome.runtime.connect({ name: "tabs" });
        } catch (err) {
            return;
        }
        if (event.key === "a") {
            sendRequest("add", port);
        } else {
            for (let i = 0; i < 10; i++) {
                if (pressed_keys[i]) {
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
    } if (event.ctrlKey) {
        try {
            var port = chrome.runtime.connect({ name: "tabs" });
        } catch (err) {
            return;
        }
        if (pressed_keys["z"]) {
            sendRequest("back", port);
            pressed_keys['z'] = false;
            return;
        } else if (pressed_keys["y"]) {
            sendRequest("front", port);
            pressed_keys['y'] = false;
            return;
        }
        // port.onMessage.addListener(function(message) {
        //     if (message.status === "bad") {
        //         console.log("Error occured while processing input")
        //     }
        // });
    }
});
