/* PADS.py: run Python in the browser with Pyodide.
   - Pyodide is lazy-loaded from jsdelivr the first time someone presses Run (pinned version below).
   - It runs inside a Web Worker made from a Blob, so an infinite loop can be stopped (worker.terminate()).
     If the browser refuses the worker, it falls back to the main thread (then Stop cannot interrupt).
   - Every run gets a FRESH namespace, so Try-it boxes never see each other's variables.
   - input() reads from the "typed input" lines you pass as stdin (one line per input() call).

   API (see AUTHORING.md):
     PADS.py.run(code, { stdin, packages, checks, test, onOutput, onStatus }) → Promise<result>
       result = { status: "ok" | "error" | "offline" | "stopped", stdout, stderr,
                  error: { type, message, line, trace } | null,
                  checks: [{ call, ok, got, want, note }] | null, testError: string | null }
     PADS.py.stop()        stop the running code (restarts Python next time)
     PADS.py.state()       "idle" | "loading" | "ready" | "running"
*/
(function () {
  "use strict";
  const PADS = window.PADS;
  const VERSION = "0.26.4";
  const INDEX_URL = "https://cdn.jsdelivr.net/pyodide/v" + VERSION + "/full/";

  /* This function runs INSIDE the worker (or on the main thread as a fallback).
     It must not use anything from outside its own body except its two arguments. */
  function pyCore(post, importPyodide, indexURL) {
    let py = null, loading = null;
    const PRELUDE = [
      "def input(prompt=''):",
      "    print(prompt, end='')",
      "    if not __pads_lines:",
      "        print()",
      "        raise EOFError('input() wanted a line, but the typed-input box has no more lines')",
      "    __v = __pads_lines.pop(0)",
      "    print(__v)",
      "    return __v",
    ].join("\n");
    const CHECKER = [
      "def __pads_eq(a, b):",
      "    if isinstance(a, float) or isinstance(b, float):",
      "        try:",
      "            return abs(a - b) < 1e-9",
      "        except Exception:",
      "            return False",
      "    try:",
      "        r = (a == b)",
      "        if hasattr(r, 'all'):",
      "            return getattr(a, 'shape', None) == getattr(b, 'shape', None) and bool(r.all())",
      "        return bool(r)",
      "    except Exception:",
      "        return False",
      "def __pads_run_checks(cases):",
      "    import json",
      "    out = []",
      "    for call, want_src in cases:",
      "        try:",
      "            want = eval(want_src)",
      "        except Exception:",
      "            want = want_src",
      "        try:",
      "            got = eval(call)",
      "        except Exception as e:",
      "            out.append({'call': call, 'ok': False, 'got': type(e).__name__ + ': ' + str(e), 'want': repr(want), 'note': 'crashed'})",
      "            continue",
      "        note = ''",
      "        if got is None and want is not None:",
      "            note = 'none'",
      "        out.append({'call': call, 'ok': __pads_eq(got, want), 'got': repr(got), 'want': repr(want), 'note': note})",
      "    return json.dumps(out)",
    ].join("\n");

    function ensure(id) {
      if (py) return Promise.resolve(py);
      if (!loading) {
        post({ id, type: "status", status: "loading" });
        loading = (async () => {
          await importPyodide(indexURL + "pyodide.js");
          py = await self.loadPyodide({ indexURL });
          return py;
        })();
        loading.catch(() => { loading = null; });
      }
      return loading;
    }

    function cleanTrace(msg) {
      const lines = String(msg).replace(/\s+$/, "").split("\n");
      const first = lines.findIndex(l => l.includes('File "<exec>"'));
      let keep = first < 0 ? lines.slice(-3) : lines.slice(first);
      const out = [];
      for (let i = 0; i < keep.length; i++) {
        if (/^\s*File "\/lib\//.test(keep[i])) { if (keep[i + 1] && !/^\s*File /.test(keep[i + 1]) && /^\s{4}/.test(keep[i + 1])) i++; continue; }
        out.push(keep[i].replace('File "<exec>"', 'File "your code"'));
      }
      const lastLine = out[out.length - 1] || "";
      const m = lastLine.match(/^(\w+(?:Error|Exception|Interrupt|Exit)?):?\s?(.*)$/);
      let line = null;
      for (const l of out) { const mm = l.match(/File "your code", line (\d+)/); if (mm) line = +mm[1]; }
      return { type: m ? m[1] : "Error", message: m ? m[2] : lastLine, line, trace: "Traceback (most recent call last):\n" + out.join("\n") };
    }

    return async function onMessage(msg) {
      const id = msg.id;
      try { await ensure(id); }
      catch (e) { post({ id, type: "done", status: "offline", error: { type: "LoadError", message: String(e && e.message || e) } }); return; }
      post({ id, type: "status", status: "running" });

      // stream output, but in chunks and with a cap, so an endless print loop cannot flood the page
      let buf = "", lastPost = Date.now(), total = 0, capped = false;
      const CAP = 60000;
      const flush = () => { if (buf) { post({ id, type: "out", text: buf }); buf = ""; } lastPost = Date.now(); };
      const write = (s, stream) => {
        if (capped) return;
        total += s.length;
        if (total > CAP) { capped = true; flush(); post({ id, type: "out", stream: "sys", text: "\n… output cut off after " + CAP + " characters …\n" }); return; }
        if (stream === "err") { flush(); post({ id, type: "out", stream: "err", text: s }); return; }
        buf += s;
        if (buf.length > 2000 || Date.now() - lastPost > 80) flush();
      };
      py.setStdout({ batched: s => write(s + "\n", "out") });
      py.setStderr({ batched: s => write(s + "\n", "err") });

      let ns = null;
      const result = { id, type: "done", status: "ok", error: null, checks: null, testError: null };
      try {
        const pk = (msg.packages || []).slice();
        if (pk.length) await py.loadPackage(pk);
        await py.loadPackagesFromImports(msg.code + "\n" + (msg.test || ""));
        ns = py.globals.get("dict")();
        const stdinLines = String(msg.stdin || "").replace(/\n$/, "");
        ns.set("__pads_lines", py.toPy(stdinLines === "" ? [] : stdinLines.split("\n")));
        py.runPython(PRELUDE, { globals: ns });
        try {
          await py.runPythonAsync(msg.code, { globals: ns });
        } catch (e) {
          flush();
          result.status = "error";
          result.error = cleanTrace(e && e.message || e);
        }
        if (result.status === "ok" && msg.checks && msg.checks.length) {
          py.runPython(CHECKER, { globals: ns });
          ns.set("__pads_cases", py.toPy(msg.checks));
          const json = py.runPython("__pads_run_checks(__pads_cases)", { globals: ns });
          result.checks = JSON.parse(json);
        }
        if (result.status === "ok" && msg.test) {
          try { await py.runPythonAsync(msg.test, { globals: ns }); }
          catch (e) { const t = cleanTrace(e && e.message || e); result.testError = (t.type + (t.message ? ": " + t.message : "")); }
        }
      } catch (e) {
        result.status = "error";
        result.error = cleanTrace(e && e.message || e);
      } finally {
        flush();
        if (ns && ns.destroy) { try { ns.destroy(); } catch (e) { /* ignore */ } }
      }
      post(result);
    };
  }

  /* ---------- main-thread side ---------- */
  let worker = null, mode = null, handler = null, state = "idle", current = null, seq = 0;

  function onMsg(m) {
    if (!current || m.id !== current.id) return;
    if (m.type === "status") { state = m.status; current.onStatus && current.onStatus(m.status); }
    else if (m.type === "out") {
      if (m.stream === "err") current.stderr += m.text; else current.stdout += m.text;
      current.onOutput && current.onOutput(m.text, m.stream || "out");
    } else if (m.type === "done") {
      const c = current; current = null;
      state = m.status === "offline" ? "idle" : "ready";
      c.resolve({ status: m.status, stdout: c.stdout, stderr: c.stderr, error: m.error, checks: m.checks || null, testError: m.testError || null });
    }
  }

  function start() {
    if (mode) return;
    try {
      const src = "const pyCore = " + pyCore.toString() + ";\n" +
        "const handle = pyCore(m => postMessage(m), u => { importScripts(u); }, " + JSON.stringify(INDEX_URL) + ");\n" +
        "let q = Promise.resolve();\n" +
        "onmessage = e => { q = q.then(() => handle(e.data)); };";
      const url = URL.createObjectURL(new Blob([src], { type: "text/javascript" }));
      worker = new Worker(url);
      worker.onmessage = e => onMsg(e.data);
      worker.onerror = e => {
        // A worker that cannot even start (e.g. blocked) → switch to main thread for this and later runs.
        e.preventDefault && e.preventDefault();
        if (mode === "worker" && current && state === "loading") { worker.terminate(); worker = null; mode = null; fallbackRetry(); }
      };
      mode = "worker";
    } catch (e) {
      useMainThread();
    }
  }

  function useMainThread() {
    mode = "main";
    const load = u => new Promise((res, rej) => {
      if (window.loadPyodide) return res();
      const s = document.createElement("script");
      s.src = u; s.async = true; s.crossOrigin = "anonymous";
      s.onload = () => res(); s.onerror = () => rej(new Error("Could not download " + u));
      document.head.appendChild(s);
    });
    window.self = window.self || window;
    handler = pyCore(m => setTimeout(() => onMsg(m), 0), load, INDEX_URL);
  }

  function fallbackRetry() {
    useMainThread();
    const c = current;
    if (c) handler(c.msg);
  }

  function run(code, opts) {
    opts = opts || {};
    if (current) return Promise.resolve({ status: "busy", stdout: "", stderr: "", error: { type: "Busy", message: "Another box is still running. Press Stop there first." } });
    start();
    return new Promise(resolve => {
      const id = ++seq;
      const msg = { id, code: String(code), stdin: opts.stdin || "", packages: opts.packages || [], checks: opts.checks || null, test: opts.test || "" };
      current = { id, msg, resolve, stdout: "", stderr: "", onOutput: opts.onOutput, onStatus: opts.onStatus };
      if (mode === "worker") worker.postMessage(msg); else handler(msg);
    });
  }

  function stop() {
    if (!current) return false;
    const c = current; current = null;
    if (mode === "worker" && worker) { worker.terminate(); worker = null; mode = null; state = "idle"; }
    c.resolve({ status: "stopped", stdout: c.stdout, stderr: c.stderr, error: null, checks: null, testError: null });
    return mode !== "main";
  }

  PADS.py = { run, stop, state: () => (current ? (state === "loading" ? "loading" : "running") : state), version: VERSION, canStop: () => mode !== "main" };
})();
