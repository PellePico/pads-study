/* PADS app shell: top tabs, side menu, hash router, home page, progress, theme.
   Loaded LAST (after all subjects/*.js). Subject authors do not need to touch this file. */
(function () {
  "use strict";
  const PADS = window.PADS;
  const { h, ui } = PADS;
  const $ = id => document.getElementById(id);

  /* ---------- progress ---------- */
  const doneKey = (s, t) => "done:" + s + "/" + t;
  PADS.isUnderstood = (s, t) => PADS.store.get(doneKey(s, t), false) === true;
  PADS.setUnderstood = (s, t, v) => { PADS.store.set(doneKey(s, t), !!v); document.dispatchEvent(new CustomEvent("pads:progress")); };
  const subjectProgress = s => s.topics.filter(t => !t.placeholder && PADS.isUnderstood(s.id, t.id)).length;
  const realTopics = s => s.topics.filter(t => !t.placeholder);

  /* ---------- theme ---------- */
  const THEMES = ["auto", "light", "dark"];
  function applyTheme(t) {
    if (t === "light" || t === "dark") document.documentElement.setAttribute("data-theme", t);
    else document.documentElement.removeAttribute("data-theme");
    const b = $("themeBtn");
    if (b) { b.textContent = "Theme: " + t; b.setAttribute("aria-label", "Colour theme: " + t + ". Click to change."); }
  }
  function initTheme() {
    applyTheme(PADS.store.get("theme", "auto"));
    $("themeBtn").onclick = () => {
      const cur = PADS.store.get("theme", "auto");
      const next = THEMES[(THEMES.indexOf(cur) + 1) % THEMES.length];
      PADS.store.set("theme", next);
      applyTheme(next);
    };
  }

  /* ---------- routing ---------- */
  let cleanups = [];
  function runCleanups() { cleanups.forEach(f => { try { f(); } catch (e) { /* ignore */ } }); cleanups = []; }
  function parseHash() {
    const raw = decodeURIComponent((location.hash || "").replace(/^#\/?/, ""));
    const [sid, tid] = raw.split("/");
    return { sid: sid || "", tid: tid || "" };
  }
  PADS.go = hash => { location.hash = hash; };

  function renderTabs(activeSid) {
    const tabs = $("tabs");
    tabs.replaceChildren(...PADS.subjectList().map(s => h("a", { class: "tab", href: "#" + s.id, "aria-current": s.id === activeSid ? "page" : null },
      h("span", { class: "num" }, String(s.order)), s.title)));
    const cur = tabs.querySelector('[aria-current="page"]');
    if (cur && cur.scrollIntoView) { const r = cur.getBoundingClientRect(), tr = tabs.getBoundingClientRect(); if (r.left < tr.left || r.right > tr.right) tabs.scrollLeft += r.left - tr.left - 16; }
    if (!activeSid) $("brand").setAttribute("aria-current", "page"); else $("brand").removeAttribute("aria-current");
  }

  function renderSide(s, tid) {
    const side = $("side");
    side.hidden = false;
    $("shell").classList.remove("wide");
    const items = [h("p", { class: "side-title" }, s.title),
      h("a", { href: "#" + s.id, "aria-current": !tid ? "page" : null }, h("span", { class: "tick", "aria-hidden": "true", style: "border-style:dashed" }), "Overview")];
    s.topics.forEach(t => {
      const done = !t.placeholder && PADS.isUnderstood(s.id, t.id);
      const nq = (t.quiz || []).length;
      const sc = nq ? PADS.quizScore(s.id + "/" + t.id, nq) : null;
      items.push(h("a", { href: "#" + s.id + "/" + t.id, "aria-current": t.id === tid ? "page" : null },
        h("span", { class: "tick" + (done ? " on" : ""), "aria-hidden": "true" }),
        h("span", null, t.title, done ? h("span", { class: "sr-only" }, " (understood)") : null),
        nq ? h("span", { class: "meta", title: "Quiz score" }, sc + "/" + nq) : null));
    });
    side.replaceChildren(...items);
    side.setAttribute("aria-label", s.title + " topics");
    const cur = side.querySelector('[aria-current="page"]');
    if (cur && side.scrollWidth > side.clientWidth) side.scrollLeft = cur.offsetLeft - 16;
  }
  function hideSide() { $("side").hidden = true; $("shell").classList.add("wide"); }

  function route() {
    runCleanups();
    const { sid, tid } = parseHash();
    const main = $("main");
    main.replaceChildren();
    const s = PADS.subjects[sid];
    if (!sid || sid === "home") { renderTabs(""); hideSide(); renderHome(main); document.title = "PADS study"; }
    else if (!s) { renderTabs(""); hideSide(); main.appendChild(notFound("There is no subject called “" + sid + "”.")); }
    else if (!tid) { renderTabs(sid); renderSide(s, ""); renderOverview(main, s); document.title = s.title + " · PADS study"; }
    else {
      const t = s.topics.find(x => x.id === tid);
      renderTabs(sid); renderSide(s, t ? tid : "");
      if (!t) main.appendChild(notFound("“" + s.title + "” has no topic called “" + tid + "”."));
      else { renderTopic(main, s, t); document.title = t.title + " · " + s.title + " · PADS study"; }
    }
    const same = route.last === sid + "/" + tid;
    route.last = sid + "/" + tid;
    if (!same) {
      window.scrollTo(0, 0);
      const h1 = main.querySelector("h1");
      if (h1 && route.count++) { h1.setAttribute("tabindex", "-1"); h1.focus({ preventScroll: true }); }
    }
  }
  route.count = 0;

  function notFound(msg) {
    return h("div", { class: "page notfound" }, h("h1", null, "Not found"), h("p", null, msg), h("p", null, h("a", { href: "#" }, "Go to the start page")));
  }

  /* ---------- topic page ---------- */
  function renderTopic(main, s, t) {
    const key = s.id + "/" + t.id;
    const api = { ui, h, html: PADS.html, subject: s, topic: t, key, onCleanup: f => cleanups.push(f), go: PADS.go, store: PADS.store };
    const page = h("article", { class: "page" });
    const head = h("header", { class: "page-head" },
      h("p", { class: "eyebrow" }, s.title),
      h("h1", null, t.title),
      t.summary ? h("p", { class: "lead", html: t.summary }) : null,
      (t.exam && t.exam.length) || t.sources ? h("div", { class: "badges" },
        (t.exam || []).map(x => h("span", { class: "badge exam" }, x)),
        t.sources ? h("span", { class: "badge" }, "Source: " + t.sources) : null) : null);
    page.appendChild(head);
    const body = h("div", { class: "page", style: "gap:20px" });
    page.appendChild(body);
    try {
      if (typeof t.render === "function") t.render(body, api);
      else PADS.renderBlocks(body, t.blocks, api);
    } catch (e) {
      console.error("[PADS] topic " + key + " failed", e);
      body.appendChild(ui.callout({ kind: "warn", title: "This page has a bug", html: "<p>" + PADS.esc(e.message) + "</p>" }));
    }
    if (t.quiz && t.quiz.length) page.appendChild(ui.quiz({ key, questions: t.quiz }, api));

    // footer: understood + prev/next
    if (!t.placeholder) {
      const idx = s.topics.indexOf(t);
      const prev = s.topics[idx - 1], next = s.topics[idx + 1];
      const cb = h("input", { type: "checkbox", checked: PADS.isUnderstood(s.id, t.id) });
      cb.onchange = () => { PADS.setUnderstood(s.id, t.id, cb.checked); renderSide(s, t.id); };
      page.appendChild(h("footer", { class: "topic-foot" },
        h("label", { class: "understood" }, cb, "I understand this topic"),
        h("nav", { class: "pn", "aria-label": "Previous and next topic" },
          prev ? h("a", { class: "btn", href: "#" + s.id + "/" + prev.id }, "← " + prev.title) : null,
          next ? h("a", { class: "btn primary", href: "#" + s.id + "/" + next.id }, next.title + " →") : null)));
    }
    main.appendChild(page);
  }

  /* ---------- subject overview ---------- */
  function renderOverview(main, s) {
    const page = h("article", { class: "page" });
    const real = realTopics(s);
    page.appendChild(h("header", { class: "page-head" },
      h("p", { class: "eyebrow" }, "Subject " + s.order),
      h("h1", null, s.title),
      s.blurb ? h("p", { class: "lead", html: s.blurb }) : null,
      real.length ? h("div", { class: "badges" }, h("span", { class: "badge" }, subjectProgress(s) + " of " + real.length + " topics understood")) : null));
    if (s.exam && s.exam.length) page.appendChild(ui.callout({ kind: "exam", title: "Where this shows up in the exam", html: "<ul>" + s.exam.map(x => "<li>" + x + "</li>").join("") + "</ul>" }));
    const cards = h("div", { class: "cards" });
    s.topics.forEach((t, i) => {
      const nq = (t.quiz || []).length;
      cards.appendChild(h("a", { class: "card scard", href: "#" + s.id + "/" + t.id },
        h("span", { class: "num" }, String(i + 1).padStart(2, "0") + (PADS.isUnderstood(s.id, t.id) ? "  ✓ understood" : "")),
        h("h3", null, t.title),
        t.summary ? h("p", { html: t.summary }) : null,
        nq ? h("p", { class: "small" }, "Quiz: " + PADS.quizScore(s.id + "/" + t.id, nq) + " / " + nq) : null));
    });
    page.appendChild(cards);
    main.appendChild(page);
  }

  /* ---------- home ---------- */
  const EXAM_MAP = [
    ["Q1", "Write a class hierarchy (<code>Food</code> → <code>Snacks</code>, <code>Beverages</code>), unique IDs, abstract method, <code>random</code>", "oop"],
    ["Q2", "Find syntax errors <b>with line numbers</b> in <code>has_stock</code>, then fix them", "foundations"],
    ["Q3", "Write <code>process_inventory</code>: NumPy indexing, list used as a queue", "datasci"],
    ["Q4", "Debug <code>process_payment</code>: <code>=</code> vs <code>==</code>, misspelled name, logic; explain each", "foundations"],
    ["Q5", "NumPy row totals (<code>axis=1</code>) and boolean indexing on a usage matrix", "datasci"],
    ["Q6", "DFS on a tree given as an adjacency matrix, plus a written explanation", "algorithms"],
  ];
  function renderHome(main) {
    const page = h("article", { class: "page" });
    page.appendChild(h("header", { class: "page-head" },
      h("p", { class: "eyebrow" }, "PADS · Programming, Algorithms and Data Structures · CBS"),
      h("h1", null, "Study PADS one small step at a time"),
      h("p", { class: "lead" }, "Each subject is split into short topics. Every topic has a picture you can step through, code you can run, a list of common mistakes and an exam-style quiz.")));
    const cards = h("div", { class: "cards" });
    PADS.subjectList().forEach(s => {
      const real = realTopics(s);
      const done = subjectProgress(s);
      cards.appendChild(h("a", { class: "card scard", href: "#" + s.id },
        h("span", { class: "num" }, "Subject " + s.order),
        h("h3", null, s.title),
        s.blurb ? h("p", { html: s.blurb }) : null,
        s.covers && s.covers.length ? h("ul", null, s.covers.map(c => h("li", { html: c }))) : null,
        real.length ? h("div", null, h("p", { class: "small" }, done + " of " + real.length + " topics understood"), h("div", { class: "progress" }, h("i", { style: "width:" + (100 * done / real.length) + "%" }))) : h("p", { class: "small" }, "Coming soon")));
    });
    page.appendChild(cards);

    page.appendChild(ui.h({ text: "How the exam maps to the subjects", sub: "Last year's exam (Winter 2025–26): 6 questions, one story (a smart vending machine), written in Jupyter, NumPy allowed." }));
    page.appendChild(ui.table({
      head: ["Question", "What it asked", "Practise in"],
      rows: EXAM_MAP.map(([q, what, sid]) => {
        const s = PADS.subjects[sid];
        return ["<b>" + q + "</b>", what, s ? `<a href="#${sid}">${PADS.esc(s.title)}</a>` : sid];
      }),
    }));
    page.appendChild(h("div", { class: "grid2" },
      ui.callout({ kind: "exam", title: "Patterns to expect", html: "<ul><li>4 of 6 questions: write a short function (5–20 lines).</li><li>2 of 6: find the bugs, say the line number, fix them.</li><li>Half want a short written explanation in a Markdown cell.</li><li>Specs can be loose: write down your assumptions.</li></ul>" }),
      ui.callout({ kind: "tip", title: "How to use this site", html: "<ul><li>Pick a subject in the top bar, then a topic on the left.</li><li>In a code stepper, click it and use <kbd>←</kbd> <kbd>→</kbd>.</li><li>“Run” downloads Python once (about 10 MB). After that it works fast.</li><li>Tick “I understand this topic” at the bottom of a page to track progress. It is saved only in this browser.</li></ul>" })));
    main.appendChild(page);
  }

  /* ---------- boot ---------- */
  function boot() {
    initTheme();
    window.addEventListener("hashchange", route);
    document.addEventListener("pads:progress", () => {
      const { sid, tid } = parseHash();
      const s = PADS.subjects[sid];
      if (s) renderSide(s, s.topics.some(t => t.id === tid) ? tid : "");
    });
    route();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot); else boot();
})();
