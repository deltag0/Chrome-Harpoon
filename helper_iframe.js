import * as UIComponentMessenger from "./pages/ui_component_messenger.js"

let ui = null;

async function activate() {
    if (ui == null) {
        ui = new helpUI();
    }
}

class helpUI {
    constructor() {
        this.hide = this.hide.bind(this);
        this.onKeyDown = this.onKeyDown.bind(this)
        this.initdom()
    }
    hide(event) {
        UIComponentMessenger.postMessage({ name: "hide" });
    }

    onKeyDown(event) {
        if (event.key === "Escape") {
            this.hide();
        }
    }

    initdom() {
        document.addEventListener("keydown", this.onKeyDown);
    }
}

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
