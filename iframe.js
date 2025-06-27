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

}


class HarpoonUI {
    pressed_keys = {};
    box;
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
        this.pressed_keys[event.key] = true;

        // TODO: add functions!
        if (event.key === "j") {
        } else if (event.key === "k") {
        } else if (event.key === "x") {
        } else if (event.key === "Enter") {
        } else if (event.key === "Escape") {
            this.hide();
        }

    }
    onKeyUp(event) {
        this.pressed_keys[event.key] = false;
    }

    hide(event) {
        UIComponentMessenger.postMessage({ name: "hide" });
    }

    initDom() {
        this.box = document.getElementsByClassName("harpoon-ui");
        console.log(this.box);
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
