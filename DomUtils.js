const DomUtils = {
    isReady() {
        return document.readyState !== "loading";
    },
    documentReady() {
        return new Promise((resolve) => {
            if (this.isReady()) {
                resolve();
                return;
            }
            globalThis.addEventListener("DOMContentLoaded", forTrusted(resolve));
        });
    },
}
