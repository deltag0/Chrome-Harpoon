chrome.runtime.onInstalled.addListener(details => {
    if (reason === chrome.runtime.OnInstalledReason.INSTALL) {
        chrome.tabs.create({
            url: chrome.runtime.getURL("install.html")
        });
    }
    chrome.runtime.sendMesage({ type: "RESET" });
});
