let handlerFunction = null;
let ownerPagePort = null;

export async function registerPortWithOwnerPage(event) {
    if (event.source !== globalThis.parent) {
        return;
    }

    // Open the port we passed from ui.js
    openPort(event.ports[0]);
    globalThis.removeEventListener("message", registerPortWithOwnerPage);
}

export function init() {
    globalThis.addEventListener("message", registerPortWithOwnerPage);
}

export function registerHandler(handler) {
    handlerFunction = handler;
}

// Set the owner port and add a function to respond to react to messages
function openPort(port) {
    ownerPagePort = port;
    ownerPagePort.onmessage = async (event) => {
        return await handlerFunction(event);
    };
    dispatchReadyEventWhenReady();
}

export function postMessage(data) {
    if (!ownerPagePort) return;

    ownerPagePort.postMessage(data);
}

// Let caller know that iframe is fully ready, otherwise wait until it is
// and call function again
let hasDispatchedReadyEvent = false;
function dispatchReadyEventWhenReady() {
    if (hasDispatchedReadyEvent) return;

    if (document.readyState === "loading") {
        globalThis.addEventListener("DOMContentLoaded", () => dispatchReadyEventWhenReady());
        return;
    }
    if (!ownerPagePort) return;

    if (globalThis.frameId != null) {
        postMessage({ name: "setIframeFrameId", iframeFrameId: globalThis.frameId });
    }
    hasDispatchedReadyEvent = true;
    postMessage({ name: "uiComponentIsReady" });
}
