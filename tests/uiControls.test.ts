import assert from "node:assert/strict";
import { spawn, type ChildProcess } from "node:child_process";
import { createServer } from "node:http";
import { createReadStream, existsSync, mkdtempSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MIME: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".webmanifest": "application/manifest+json",
  ".json": "application/json"
};

type CdpClient = {
  send: (method: string, params?: Record<string, unknown>) => Promise<unknown>;
  close: () => Promise<void>;
};

async function startStaticServer(): Promise<{ port: number; close: () => Promise<void> }> {
  const server = createServer((req, res) => {
    const urlPath = decodeURIComponent((req.url ?? "/").split("?")[0] ?? "/");
    const relative = urlPath === "/" ? "/index.html" : urlPath;
    const filePath = path.normalize(path.join(repoRoot, relative));
    if (!filePath.startsWith(repoRoot) || !existsSync(filePath) || !statSync(filePath).isFile()) {
      res.writeHead(404);
      res.end("Not found");
      return;
    }
    res.writeHead(200, { "Content-Type": MIME[path.extname(filePath)] ?? "application/octet-stream" });
    createReadStream(filePath).pipe(res);
  });

  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("Failed to bind static server.");
  }
  return {
    port: address.port,
    close: () => new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())))
  };
}

async function connectChrome(): Promise<{ chrome: ChildProcess; client: CdpClient; userDataDir: string }> {
  const userDataDir = mkdtempSync(path.join(tmpdir(), "atlas-ui-chrome-"));
  const debuggingPort = 9300 + Math.floor(Math.random() * 400);
  const chrome = spawn(
    "google-chrome",
    [
      "--headless=new",
      "--disable-gpu",
      "--no-sandbox",
      "--disable-dev-shm-usage",
      `--user-data-dir=${userDataDir}`,
      `--remote-debugging-port=${debuggingPort}`,
      "--remote-allow-origins=*",
      "about:blank"
    ],
    { stdio: ["ignore", "ignore", "pipe"] }
  );

  const deadline = Date.now() + 20000;
  let version: { webSocketDebuggerUrl?: string } | null = null;
  while (Date.now() < deadline) {
    if (chrome.exitCode != null) {
      break;
    }
    try {
      version = await fetch(`http://127.0.0.1:${debuggingPort}/json/version`).then((response) => response.json());
      if (version?.webSocketDebuggerUrl) {
        break;
      }
    } catch {
      await delay(100);
    }
  }
  if (!version?.webSocketDebuggerUrl) {
    chrome.kill("SIGKILL");
    rmSync(userDataDir, { recursive: true, force: true });
    throw new Error("Chrome DevTools endpoint did not become ready.");
  }

  const targets = await fetch(`http://127.0.0.1:${debuggingPort}/json/list`).then((response) => response.json()) as Array<{
    id: string;
    type: string;
    webSocketDebuggerUrl?: string;
  }>;
  const page = targets.find((target) => target.type === "page" && target.webSocketDebuggerUrl);
  if (!page?.webSocketDebuggerUrl) {
    chrome.kill("SIGKILL");
    rmSync(userDataDir, { recursive: true, force: true });
    throw new Error("No Chrome page target available.");
  }

  const client = await openCdp(page.webSocketDebuggerUrl);
  return { chrome, client, userDataDir };
}

async function openCdp(url: string): Promise<CdpClient> {
  const socket = new WebSocket(url);
  await new Promise<void>((resolve, reject) => {
    socket.addEventListener("open", () => resolve(), { once: true });
    socket.addEventListener("error", () => reject(new Error(`Failed to open CDP socket ${url}`)), { once: true });
  });

  let nextId = 1;
  const pending = new Map<number, { resolve: (value: unknown) => void; reject: (error: Error) => void }>();

  socket.addEventListener("message", (event) => {
    const message = JSON.parse(String(event.data)) as {
      id?: number;
      result?: unknown;
      error?: { message?: string };
    };
    if (message.id == null) {
      return;
    }
    const waiter = pending.get(message.id);
    if (!waiter) {
      return;
    }
    pending.delete(message.id);
    if (message.error) {
      waiter.reject(new Error(message.error.message ?? "CDP error"));
      return;
    }
    waiter.resolve(message.result);
  });

  return {
    send(method, params = {}) {
      const id = nextId++;
      return new Promise((resolve, reject) => {
        pending.set(id, { resolve, reject });
        socket.send(JSON.stringify({ id, method, params }));
      });
    },
    async close() {
      socket.close();
    }
  };
}

async function evaluate<T>(client: CdpClient, expression: string): Promise<T> {
  const result = await client.send("Runtime.evaluate", {
    expression: `(() => { ${expression} })()`,
    awaitPromise: true,
    returnByValue: true
  }) as {
    result?: { value?: T };
    exceptionDetails?: { text?: string; exception?: { description?: string } };
  };

  if (result.exceptionDetails) {
    throw new Error(
      result.exceptionDetails.exception?.description ??
        result.exceptionDetails.text ??
        "Runtime.evaluate failed"
    );
  }
  return result.result?.value as T;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForApp(client: CdpClient): Promise<void> {
  const deadline = Date.now() + 10000;
  while (Date.now() < deadline) {
    const ready = await evaluate<boolean>(
      client,
      `return Boolean(document.querySelector("#dice-notation") && document.querySelector("[data-command='roll']"));`
    );
    if (ready) {
      return;
    }
    await delay(50);
  }
  throw new Error("Atlas UI did not become ready.");
}

test("served UI keeps dice result across rerenders and confirms New Run", async (t) => {
  const server = await startStaticServer();
  const { chrome, client, userDataDir } = await connectChrome();

  t.after(async () => {
    await client.close().catch(() => undefined);
    chrome.kill("SIGKILL");
    await delay(250);
    rmSync(userDataDir, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
    await server.close();
  });

  await client.send("Runtime.enable");
  await client.send("Page.enable");
  await client.send("Page.navigate", { url: `http://127.0.0.1:${server.port}/` });
  await waitForApp(client);

  await evaluate(client, `localStorage.clear(); location.reload();`);
  await waitForApp(client);

  await evaluate(client, `
    window.__confirmResponses = [];
    window.__confirmCalls = [];
    window.confirm = (message) => {
      window.__confirmCalls.push(message);
      return window.__confirmResponses.shift() ?? false;
    };
  `);

  const beforeRoll = await evaluate<{ journalCount: number; notation: string; result: string }>(client, `
    return {
      journalCount: document.querySelectorAll(".journal-list li").length,
      notation: document.querySelector("#dice-notation").value,
      result: document.querySelector("#dice-result").textContent
    };
  `);
  assert.equal(beforeRoll.notation, "d20");
  assert.equal(beforeRoll.result, "Ready.");
  assert.equal(beforeRoll.journalCount, 1);

  await evaluate(client, `
    const input = document.querySelector("#dice-notation");
    input.value = "2d6+1";
    document.querySelector("[data-command='roll']").click();
  `);

  const afterClick = await evaluate<{
    journalCount: number;
    notation: string;
    result: string;
    rolledEntries: number;
  }>(client, `
    const texts = [...document.querySelectorAll(".journal-list li span")].map((node) => node.textContent);
    return {
      journalCount: texts.length,
      notation: document.querySelector("#dice-notation").value,
      result: document.querySelector("#dice-result").textContent,
      rolledEntries: texts.filter((text) => text.startsWith("Rolled ")).length
    };
  `);
  assert.equal(afterClick.notation, "2d6+1");
  assert.match(afterClick.result, /^2d6\+1: /);
  assert.equal(afterClick.journalCount, 2);
  assert.equal(afterClick.rolledEntries, 1);
  const clickResult = afterClick.result;

  await evaluate(client, `
    const input = document.querySelector("#dice-notation");
    input.value = "not-dice";
    input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
  `);

  const afterInvalid = await evaluate<{
    journalCount: number;
    notation: string;
    result: string;
    sceneTitle: string;
  }>(client, `
    return {
      journalCount: document.querySelectorAll(".journal-list li").length,
      notation: document.querySelector("#dice-notation").value,
      result: document.querySelector("#dice-result").textContent,
      sceneTitle: document.querySelector(".scene-panel h2").textContent
    };
  `);
  assert.equal(afterInvalid.journalCount, 2);
  assert.equal(afterInvalid.notation, "not-dice");
  assert.match(afterInvalid.result, /Invalid dice notation/);
  assert.equal(afterInvalid.sceneTitle, "Warm Ash on the Wind");

  await evaluate(client, `
    const input = document.querySelector("#dice-notation");
    input.value = "d20";
    input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
  `);

  const afterEnter = await evaluate<{
    journalCount: number;
    notation: string;
    result: string;
    rolledEntries: number;
  }>(client, `
    const texts = [...document.querySelectorAll(".journal-list li span")].map((node) => node.textContent);
    return {
      journalCount: texts.length,
      notation: document.querySelector("#dice-notation").value,
      result: document.querySelector("#dice-result").textContent,
      rolledEntries: texts.filter((text) => text.startsWith("Rolled ")).length
    };
  `);
  assert.equal(afterEnter.notation, "d20");
  assert.match(afterEnter.result, /^d20: /);
  assert.equal(afterEnter.journalCount, 3);
  assert.equal(afterEnter.rolledEntries, 2);
  const enterResult = afterEnter.result;

  await evaluate(client, `
    const form = document.querySelector("#journal-form");
    form.querySelector("input[name='entry']").value = "Scouted the ash line.";
    form.requestSubmit();
  `);

  const afterJournal = await evaluate<{
    journalCount: number;
    notation: string;
    result: string;
  }>(client, `
    return {
      journalCount: document.querySelectorAll(".journal-list li").length,
      notation: document.querySelector("#dice-notation").value,
      result: document.querySelector("#dice-result").textContent
    };
  `);
  assert.equal(afterJournal.journalCount, 4);
  assert.equal(afterJournal.notation, "d20");
  assert.equal(afterJournal.result, enterResult);

  await evaluate(client, `document.querySelector("[data-action='act-search-road']").click();`);
  const afterAction = await evaluate<{
    journalCount: number;
    notation: string;
    result: string;
    sceneResult: string | null;
  }>(client, `
    return {
      journalCount: document.querySelectorAll(".journal-list li").length,
      notation: document.querySelector("#dice-notation").value,
      result: document.querySelector("#dice-result").textContent,
      sceneResult: document.querySelector(".scene-panel .result")?.textContent ?? null
    };
  `);
  assert.equal(afterAction.journalCount, 5);
  assert.equal(afterAction.notation, "d20");
  assert.equal(afterAction.result, enterResult);
  assert.match(afterAction.sceneResult ?? "", /pawprints/);

  await evaluate(client, `
    window.__confirmResponses = [false];
    document.querySelector("[data-command='reset']").click();
  `);
  const afterCancel = await evaluate<{
    journalCount: number;
    notation: string;
    result: string;
    confirmCalls: number;
    sceneResult: string | null;
  }>(client, `
    return {
      journalCount: document.querySelectorAll(".journal-list li").length,
      notation: document.querySelector("#dice-notation").value,
      result: document.querySelector("#dice-result").textContent,
      confirmCalls: window.__confirmCalls.length,
      sceneResult: document.querySelector(".scene-panel .result")?.textContent ?? null
    };
  `);
  assert.equal(afterCancel.confirmCalls, 1);
  assert.equal(afterCancel.journalCount, 5);
  assert.equal(afterCancel.notation, "d20");
  assert.equal(afterCancel.result, enterResult);
  assert.match(afterCancel.sceneResult ?? "", /pawprints/);

  await evaluate(client, `
    window.__confirmResponses = [true];
    document.querySelector("[data-command='reset']").click();
  `);
  const afterConfirm = await evaluate<{
    journalCount: number;
    notation: string;
    result: string;
    confirmCalls: number;
    sceneTitle: string;
    sceneResult: string | null;
  }>(client, `
    return {
      journalCount: document.querySelectorAll(".journal-list li").length,
      notation: document.querySelector("#dice-notation").value,
      result: document.querySelector("#dice-result").textContent,
      confirmCalls: window.__confirmCalls.length,
      sceneTitle: document.querySelector(".scene-panel h2").textContent,
      sceneResult: document.querySelector(".scene-panel .result")?.textContent ?? null
    };
  `);
  assert.equal(afterConfirm.confirmCalls, 2);
  assert.equal(afterConfirm.journalCount, 1);
  assert.equal(afterConfirm.notation, "d20");
  assert.equal(afterConfirm.result, "Ready.");
  assert.equal(afterConfirm.sceneTitle, "Warm Ash on the Wind");
  assert.equal(afterConfirm.sceneResult, null);
  assert.notEqual(clickResult, enterResult);
});
