import { getBroker } from "./contentScripts/broker.js";

getBroker();

const script = document.createElement("script");
script.type = "module";
script.src = chrome.runtime.getURL("/dist/main.js");
document.body.appendChild(script);

