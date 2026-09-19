import assert from "node:assert/strict";
import { spawn, type ChildProcess } from "node:child_process";
import { createServer } from "node:http";
import { createReadStream, existsSync, mkdtempSync, readFileSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SERVED_APP_PATH = path.join(repoRoot, "src/ui/app.js");
const BROWSER_READY_MS = 8_000;
const APP_READY_MS = 8_000;
const CDP_OPEN_MS = 5_000;
const CDP_COMMAND_MS = 5_000;
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

type BrowserSession = {
  chrome: ChildProcess;
  client: CdpClient;
  userDataDir: string;
};

/**
 * Resolve a Chromium-based browser for served-UI proof.
 * Precedence: ATLAS_UI_BROWSER (required if set) → common executable names/paths.
 * Returns null when discovery finds nothing (caller should skip, not fake a pass).
 */
function resolveBrowserBinary(): string | null {
  const fromEnv = process.env.ATLAS_UI_BROWSER?.trim();
  if (fromEnv) {
    if (!isExecutableCandidate(fromEnv)) {
      throw new Error(
        `ATLAS_UI_BROWSER=${fromEnv} is set but was not found as an executable. ` +
          "Install a Chromium-based browser or point ATLAS_UI_BROWSER at its binary."
      );
    }
    return fromEnv;
  }

  const pathCandidates = [
    "google-chrome",
    "google-chrome-stable",
    "chromium",
    "chromium-browser",
    "chrome"
  ];
  for (const candidate of pathCandidates) {
    const resolved = resolveOnPath(candidate);
    if (resolved) {
      return resolved;
    }
  }

  // Absolute app-bundle paths for macOS hosts where PATH may not include the binary name.
  const absoluteCandidates = [
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Chromium.app/Contents/MacOS/Chromium"
  ];
  for (const candidate of absoluteCandidates) {
    if (existsSync(candidate)) {
      return candidate;
    }
  }

  return null;
}

function resolveOnPath(command: string): string | null {
  const pathEnv = process.env.PATH ?? "";
  for (const dir of pathEnv.split(path.delimiter)) {
    if (!dir) {
      continue;
    }
    const candidate = path.join(dir, command);
    if (existsSync(candidate)) {
      return candidate;
    }
  }
  return null;
}

function isExecutableCandidate(command: string): boolean {
  if (command.includes(path.sep) || path.isAbsolute(command)) {
    return existsSync(command);
  }
  return resolveOnPath(command) != null || existsSync(command);
}

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

  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => resolve());
  });
  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("Failed to bind static server.");
  }
  return {
    port: address.port,
    close: () =>
      new Promise((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      })
  };
}

async function connectBrowser(browserBinary: string): Promise<BrowserSession> {
  const userDataDir = mkdtempSync(path.join(tmpdir(), "atlas-ui-chrome-"));
  const debuggingPort = 9300 + Math.floor(Math.random() * 400);
  let spawnError: Error | null = null;

  const chrome = spawn(
    browserBinary,
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

  chrome.once("error", (error) => {
    spawnError = error instanceof Error ? error : new Error(String(error));
  });

  const cleanupFailedLaunch = () => {
    try {
      chrome.kill("SIGKILL");
    } catch {
      // ignore
    }
    rmSync(userDataDir, { recursive: true, force: true, maxRetries: 10, retryDelay: 50 });
  };

  try {
    const version = await waitForJson<{ webSocketDebuggerUrl?: string }>(
      `http://127.0.0.1:${debuggingPort}/json/version`,
      BROWSER_READY_MS,
      () => {
        if (spawnError) {
          throw new Error(`Failed to start browser (${browserBinary}): ${spawnError.message}`);
        }
        if (chrome.exitCode != null) {
          throw new Error(
            `Browser exited before DevTools became ready (${browserBinary}, code ${chrome.exitCode}).`
          );
        }
      }
    );

    if (!version.webSocketDebuggerUrl) {
      throw new Error("Chrome DevTools endpoint did not become ready.");
    }

    const targets = await waitForJson<Array<{ type: string; webSocketDebuggerUrl?: string }>>(
      `http://127.0.0.1:${debuggingPort}/json/list`,
      CDP_OPEN_MS
    );
    const page = targets.find((target) => target.type === "page" && target.webSocketDebuggerUrl);
    if (!page?.webSocketDebuggerUrl) {
      throw new Error("No Chrome page target available.");
    }

    const client = await openCdp(page.webSocketDebuggerUrl);
    return { chrome, client, userDataDir };
  } catch (error) {
    cleanupFailedLaunch();
    throw error;
  }
}

async function waitForJson<T>(url: string, timeoutMs: number, onTick?: () => void): Promise<T> {
  const deadline = Date.now() + timeoutMs;
  let lastError: Error | null = null;
  while (Date.now() < deadline) {
    onTick?.();
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status} for ${url}`);
      }
      return (await response.json()) as T;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      await delay(100);
    }
  }
  throw lastError ?? new Error(`Timed out waiting for ${url} after ${timeoutMs}ms.`);
}

async function openCdp(url: string): Promise<CdpClient> {
  const socket = new WebSocket(url);
  await withTimeout(
    new Promise<void>((resolve, reject) => {
      socket.addEventListener("open", () => resolve(), { once: true });
      socket.addEventListener("error", () => reject(new Error(`Failed to open CDP socket ${url}`)), {
        once: true
      });
    }),
    CDP_OPEN_MS,
    `CDP websocket open timed out after ${CDP_OPEN_MS}ms`
  );

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
      return withTimeout(
        new Promise((resolve, reject) => {
          pending.set(id, { resolve, reject });
          try {
            socket.send(JSON.stringify({ id, method, params }));
          } catch (error) {
            pending.delete(id);
            reject(error instanceof Error ? error : new Error(String(error)));
          }
        }),
        CDP_COMMAND_MS,
        `CDP ${method} timed out after ${CDP_COMMAND_MS}ms`
      );
    },
    async close() {
      socket.close();
    }
  };
}

async function evaluate<T>(client: CdpClient, expression: string): Promise<T> {
  const result = (await client.send("Runtime.evaluate", {
    expression: `(() => { ${expression} })()`,
    awaitPromise: true,
    returnByValue: true
  })) as {
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

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, message: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  return Promise.race([
    promise.finally(() => {
      if (timer) {
        clearTimeout(timer);
      }
    }),
    new Promise<T>((_, reject) => {
      timer = setTimeout(() => reject(new Error(message)), timeoutMs);
    })
  ]);
}

async function waitForApp(client: CdpClient): Promise<void> {
  const deadline = Date.now() + APP_READY_MS;
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
  throw new Error(`Atlas UI did not become ready within ${APP_READY_MS}ms.`);
}

test("static: served app.js wires dice persistence, Enter roll, and New Run confirm", () => {
  const source = readFileSync(SERVED_APP_PATH, "utf8");
  assert.match(source, /export function startAtlasApp/);
  assert.match(source, /let diceNotation/);
  assert.match(source, /let diceResultText/);
  assert.match(source, /keydown/);
  assert.match(source, /event\.key !== "Enter"/);
  assert.match(source, /NEW_RUN_CONFIRMATION/);
  assert.match(source, /confirmFn\(/);
  assert.match(source, /handleRoll\(/);
});

test("browser: served UI keeps dice result across rerenders and confirms New Run", async (t) => {
  let browserBinary: string | null;
  try {
    browserBinary = resolveBrowserBinary();
  } catch (error) {
    // Explicit ATLAS_UI_BROWSER misconfiguration must fail, not skip.
    throw error;
  }

  if (!browserBinary) {
    t.skip(
      "No Chromium-based browser found for served-UI proof. " +
        "Set ATLAS_UI_BROWSER to a Chrome/Chromium executable to run browser acceptance. " +
        "Static wiring checks still run; this skip is not browser proof."
    );
    return;
  }

  let server: { port: number; close: () => Promise<void> } | undefined;
  let chrome: ChildProcess | undefined;
  let client: CdpClient | undefined;
  let userDataDir: string | undefined;

  t.after(async () => {
    await client?.close().catch(() => undefined);
    if (chrome && chrome.exitCode == null) {
      chrome.kill("SIGKILL");
      await delay(250);
    }
    if (userDataDir) {
      rmSync(userDataDir, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
    }
    await server?.close().catch(() => undefined);
  });

  server = await startStaticServer();

  try {
    const session = await connectBrowser(browserBinary);
    chrome = session.chrome;
    client = session.client;
    userDataDir = session.userDataDir;
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Served-UI browser proof failed to start with ${browserBinary}: ${detail}. ` +
        "Fix the browser prerequisite or unset ATLAS_UI_BROWSER to skip this proof explicitly."
    );
  }

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
