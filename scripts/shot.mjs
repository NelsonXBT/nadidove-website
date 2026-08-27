/*
 * Screenshots a page at a given viewport, over CDP, with no dependencies.
 *
 *   node scripts/shot.mjs <path> <out.png> [width] [height] [clickText]
 *
 * A scratch tool for looking at a screen the way a phone renders it. The e2e
 * script drives the whole flow; this just takes a picture of one screen.
 */

import { spawn } from "node:child_process";
import { writeFile } from "node:fs/promises";

const [
  path = "/",
  out = "/tmp/shot.png",
  width = "390",
  height = "844",
  clickText = "",
] = process.argv.slice(2);

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const PORT = 9444;

const CHROME =
  process.env.CHROME_PATH ??
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

const chrome = spawn(CHROME, [
  `--remote-debugging-port=${PORT}`,
  "--headless=new",
  "--no-first-run",
  "--no-default-browser-check",
  "--user-data-dir=/tmp/nadidove-shot-profile",
  "--hide-scrollbars",
  "about:blank",
]);

chrome.on("error", (error) => {
  console.error("Chrome failed to start:", error.message);
  process.exit(1);
});

async function endpoint() {
  for (let attempt = 0; attempt < 60; attempt++) {
    try {
      const response = await fetch(`http://127.0.0.1:${PORT}/json/version`);
      const info = await response.json();

      if (info.webSocketDebuggerUrl) {
        return info.webSocketDebuggerUrl;
      }
    } catch {
      /* not listening yet */
    }

    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  throw new Error("Chrome never opened its debugging port.");
}

const socket = new WebSocket(await endpoint());

await new Promise((resolve, reject) => {
  socket.addEventListener("open", resolve, { once: true });
  socket.addEventListener("error", reject, { once: true });
});

let nextId = 1;
const pending = new Map();
let target = null;

socket.addEventListener("message", (event) => {
  const message = JSON.parse(event.data);

  if (message.id && pending.has(message.id)) {
    const { resolve, reject } = pending.get(message.id);
    pending.delete(message.id);

    message.error ? reject(new Error(message.error.message)) : resolve(message.result);
  }
});

function send(method, params = {}, sessionId) {
  const id = nextId++;

  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    socket.send(JSON.stringify({ id, method, params, sessionId }));
  });
}

const { targetId } = await send("Target.createTarget", { url: "about:blank" });
const { sessionId } = await send("Target.attachToTarget", {
  targetId,
  flatten: true,
});

target = sessionId;

const call = (method, params) => send(method, params, target);

await call("Page.enable");
await call("Runtime.enable");

await call("Emulation.setDeviceMetricsOverride", {
  width: Number(width),
  height: Number(height),
  deviceScaleFactor: 2,
  mobile: Number(width) < 700,
});

await call("Page.navigate", { url: `${BASE}${path}` });

/** Waits for the document to finish loading and React to hydrate. */
async function settle(ms = 1200) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

await settle(2500);

if (clickText) {
  await call("Runtime.evaluate", {
    expression: `
      (() => {
        const el = [...document.querySelectorAll("button, a")].find((node) =>
          node.textContent.trim().toLowerCase().includes(${JSON.stringify(
            clickText.toLowerCase(),
          )}),
        );
        if (el) el.click();
        return !!el;
      })()
    `,
  });

  await settle(1800);
}

/* A full-page capture rather than the viewport, so a long document is caught
   end to end in one image. */
const { cssContentSize } = await call("Page.getLayoutMetrics");

const { data } = await call("Page.captureScreenshot", {
  format: "png",
  captureBeyondViewport: true,
  clip: {
    x: 0,
    y: 0,
    width: cssContentSize.width,
    height: Math.min(cssContentSize.height, 16000),
    scale: 1,
  },
});

await writeFile(out, Buffer.from(data, "base64"));

console.log(
  `${out} — ${cssContentSize.width}×${Math.round(cssContentSize.height)} css px`,
);

socket.close();
chrome.kill();
process.exit(0);
