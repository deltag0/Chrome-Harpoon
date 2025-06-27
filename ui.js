class UIComponent {
    iframeElement;
    iframePort;
    showing = false;
    iframeFrameId;
    focusOptions = {};
    shadowDOM;
    messageChannelPorts;

    async load(iframeUrl, className) {
        if (this.iframeElement) throw new Error("init should only be called once.");
        this.iframeElement = document.createElement("iframe");

        const styleSheet = document.createElement("style");
        styleSheet.type = "text/css";
        // Default to everything hidden while the stylesheet loads.
        styleSheet.innerHTML = `
          iframe {
            display: none;
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 600px; /* or whatever width you need */
            height: 400px; /* or any height */
            border: none;
            z-index: 999999; /* make sure it’s on top */
          }
        `;

        this.iframeElement.className = className;

        const shadowWrapper = document.createElement("div");
        // Prevent the page's CSS from interfering with this container div.
        shadowWrapper.className = "harpoon-reset";
        this.shadowDOM = shadowWrapper.attachShadow({ mode: "open" });
        this.shadowDOM.appendChild(styleSheet);
        this.shadowDOM.appendChild(this.iframeElement);

        let resolveFn;
        this.iframePort = new Promise((resolve, _reject) => {
            resolveFn = resolve;
        });

        // this.setIframeVisible(false);
        this.iframeElement.src = chrome.runtime.getURL(iframeUrl);
        console.log("loaded iframe");
        await DomUtils.documentReady();
        console.log("Document is ready");
        document.documentElement.appendChild(shadowWrapper);

        const { port1, port2 } = new MessageChannel();
        this.messageChannelPorts = [port1, port2];
        this.iframeElement.addEventListener("load", () => {
            const targetOrigin = chrome.runtime.getURL("");
            // Transfer ownership of port2 to the iframeElement
            this.iframeElement.contentWindow.postMessage(null, targetOrigin, [port2]);
            // Handler for messages from port2
            port1.onmessage = (event) => {
                let eventName = null;
                if (event) {
                    eventName = (event.data ? event.data.name : undefined);
                }
                console.log(event);
                console.log(eventName);

                switch (eventName) {
                    case "uiComponentIsReady":
                        // If this frame receives the focus, then hide the UI component.
                        // globalThis.addEventListener(
                        //     "focus",
                        //     forTrusted((event) => {
                        //         if ((event.target === window) && this.focusOptions.focus) {
                        //             this.hide(false);
                        //         }
                        //         // Continue propagating the event.
                        //         return true;
                        //     }),
                        //     true,
                        // );
                        // Set the iframe's port, thereby rendering the UI component ready.
                        resolveFn(port1);
                        break;
                    case "setIframeFrameId":
                        this.iframeFrameId = event.data.iframeFrameId;
                        break;
                    case "hide":
                        this.setIframeVisible(false);
                        break;
                }
            };
        });
    }

    async postMessage(data) {
        (await this.iframePort).postMessage(data);
    }

    async show(messageData = {}, focusOptions = {}) {
        this.focusOptions = focusOptions;
        await this.postMessage(messageData);
        this.setIframeVisible(true);
        if (this.focusOptions.focus) {
            this.iframeElement.focus();
        }
        this.showing = true;
    }

    setIframeVisible(visible) {
        const classes = this.iframeElement.classList;
        if (visible) {
            this.iframeElement.style.display = "block";
            classes.add("harpoon-ui-visible");
        } else {
            this.iframeElement.style.display = "none";;
            classes.remove("harpoon-ui-visible");
        }
    }
}

