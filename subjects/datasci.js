/* Subject 5: NumPy, Pandas & plots (content map topics 12–14).
   Built on the public API in AUTHORING.md only. Every number shown here was checked in real Python
   (numpy 1.26, pandas 2.2). Pandas runs in the Try-it boxes; matplotlib only with the Agg backend
   and without showing a picture, so the plots on these pages are drawn with D.svg. */
(function () {
  "use strict";
  const { h, ui } = PADS;
  const D = ui.draw;

  /* ---------- small helpers for this file only ---------- */
  const row = (...kids) => h("div", { class: "row-wrap" }, ...kids);
  const label = (text, forId) => h("label", { class: "small muted", for: forId }, text);
  const eyebrow = (t, top) => h("p", { class: "eyebrow", style: "margin:" + (top == null ? 12 : top) + "px 0 6px" }, t);
  const outBox = text => h("pre", { class: "st-out" }, text);
  const note = html => h("p", { class: "small", style: "margin:8px 0 0", html });
  const reduceMotion = () => !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);

  /* segmented control: items = [[value, text]]; call .sync(value) to mark the pressed one */
  function seg(items, onPick, aria) {
    const s = h("div", { class: "seg", role: "group", "aria-label": aria });
    items.forEach(([v, t]) => s.appendChild(h("button", { type: "button", "data-v": String(v), onclick: () => onPick(v) }, t)));
    s.sync = cur => [...s.children].forEach(b => b.setAttribute("aria-pressed", String(b.dataset.v === String(cur))));
    return s;
  }
  /* <select>: options = [[value, text]] */
  function select(id, options, value) {
    const s = h("select", { class: "input", id }, options.map(([v, t]) => h("option", { value: String(v) }, t)));
    s.value = String(value);
    return s;
  }
  const setOptions = (s, options, value) => { s.replaceChildren(...options.map(([v, t]) => h("option", { value: String(v) }, t))); s.value = String(value); };

  /* Python/NumPy text for values (checked against real numpy print output) */
  const pyb = b => (b ? "True" : "False");
  const pyFloat = v => (Number.isInteger(v) ? v.toFixed(1) : String(v));
  function npFmt(vals) {                       // print() of a 1-D int or bool array
    if (!vals.length) return "[]";
    const s = vals.map(v => (typeof v === "boolean" ? pyb(v) : String(v)));
    const w = typeof vals[0] === "boolean" ? 5 : Math.max(...s.map(x => x.length));
    return "[" + s.map(x => x.padStart(w)).join(" ") + "]";
  }
  function npFmt2(rows) {                      // print() of a 2-D int array
    const w = Math.max(...rows.flat().map(v => String(v).length));
    return "[" + rows.map(r => "[" + r.map(v => String(v).padStart(w)).join(" ") + "]").join("\n ") + "]";
  }
  const whereRepr = idx => (idx.length ? "(array([" + idx.join(", ") + "]),)" : "(array([], dtype=int64),)");
  const sum = a => a.reduce((x, y) => x + y, 0);

  /* A 2-D grid of cells. m: rows of values. o: { mark(r, c) → mark name, rowLabels, colLabels,
     onCell(r, c), onRow(r), onCol(c), extra(r) → node (a column on the right), cellLabel(r, c) } */
  function grid(m, o) {
    o = o || {};
    const R = m.length, C = m[0].length;
    const cols = (o.rowLabels ? "auto " : "") + `repeat(${C}, minmax(2.4em, 3.6em))` + (o.extra ? " auto" : "");
    const g = h("div", { class: "datasci-grid", style: "grid-template-columns:" + cols });
    const lab = (txt, on, cls, aria) => on ? h("button", { type: "button", class: "datasci-gl " + cls, onclick: on, "aria-label": aria }, txt) : h("span", { class: "datasci-gl " + cls }, txt);
    if (o.colLabels) {
      if (o.rowLabels) g.appendChild(h("span"));
      o.colLabels.forEach((t, c) => g.appendChild(lab(t, o.onCol && (() => o.onCol(c)), "col" + (o.colHi === c ? " hi" : ""), "select column " + c)));
      if (o.extra) g.appendChild(h("span", { class: "datasci-gl col" }, o.extraHead || ""));
    }
    for (let r = 0; r < R; r++) {
      if (o.rowLabels) g.appendChild(lab(o.rowLabels[r], o.onRow && (() => o.onRow(r)), "rowl" + (o.rowHi === r ? " hi" : ""), "select row " + r));
      for (let c = 0; c < C; c++) {
        const mk = o.mark ? o.mark(r, c) : null;
        const cls = "datasci-cell" + (mk ? " mk-" + mk : "");
        g.appendChild(o.onCell
          ? h("button", { type: "button", class: cls, onclick: () => o.onCell(r, c), "aria-label": o.cellLabel ? o.cellLabel(r, c) : "row " + r + ", column " + c + ": " + m[r][c] }, String(m[r][c]))
          : h("div", { class: cls }, String(m[r][c])));
      }
      if (o.extra) g.appendChild(h("div", { class: "datasci-extra" }, o.extra(r)));
    }
    return h("div", { class: "datasci-gridwrap" }, g);
  }

  /* A small DataFrame as an HTML table.
     o: { cols: [names], rows: [objects], index: [labels], indexName, rowClass(i), cellClass(i, col), headClass(col), extra: { head, cell(i) } } */
  const fmtCell = v => (v == null ? "NaN" : String(v));
  function dfTable(o) {
    const t = h("table", { class: "datasci-df" });
    const head = h("tr", null, h("th", { class: "idx" + (o.headClass ? " " + (o.headClass("__index") || "") : "") }, o.indexName || ""),
      o.cols.map(c => h("th", { class: o.headClass ? o.headClass(c) : null }, c)),
      o.extra ? h("th", { class: "datasci-maskcol" }, o.extra.head) : null);
    if (o.posRow) t.appendChild(h("thead", null, h("tr", { class: "pos" }, h("th", { class: "idx" }, "position →"), o.cols.map((c, j) => h("th", { class: o.headClass ? o.headClass(c) : null }, String(j))), o.extra ? h("th") : null), head));
    else t.appendChild(h("thead", null, head));
    const body = h("tbody");
    o.rows.forEach((r, i) => {
      const idx = o.index ? o.index[i] : i;
      body.appendChild(h("tr", { class: o.rowClass ? o.rowClass(i) : null },
        h("th", { class: "idx" + (o.cellClass ? " " + (o.cellClass(i, "__index") || "") : "") }, o.posCol ? [String(idx), h("span", { class: "datasci-pos" }, " #" + i)] : String(idx)),
        o.cols.map(c => h("td", { class: [r[c] == null ? "datasci-nan" : "", typeof r[c] === "number" ? "num" : "", o.cellClass ? o.cellClass(i, c) || "" : ""].join(" ").trim() || null }, fmtCell(r[c]))),
        o.extra ? h("td", { class: "datasci-maskcol" }, o.extra.cell(i)) : null));
    });
    t.appendChild(body);
    return h("div", { class: "datasci-dfwrap" }, t);
  }

  /* SVG plot frame. o: { x0, y0, w, h, xmin, xmax, ymin, ymax, xticks, yticks, xcats, xlabel, ylabel, title, tag(node, part) } */
  function frame(S, o) {
    const X = v => o.x0 + ((v - o.xmin) / (o.xmax - o.xmin)) * o.w;
    const Y = v => o.y0 + o.h - ((v - o.ymin) / (o.ymax - o.ymin)) * o.h;
    const tag = o.tag || (n => n);
    const xa = [tag(S.line(o.x0, o.y0 + o.h, o.x0 + o.w, o.y0 + o.h), "xaxis")];
    const ya = [tag(S.line(o.x0, o.y0, o.x0, o.y0 + o.h), "yaxis")];
    (o.yticks || []).forEach(v => { ya.push(tag(S.line(o.x0 - 4, Y(v), o.x0, Y(v)), "yaxis")); ya.push(tag(S.text(o.x0 - 7, Y(v), String(v), { anchor: "end", muted: true }), "yaxis")); });
    (o.xticks || []).forEach(v => { xa.push(tag(S.line(X(v), o.y0 + o.h, X(v), o.y0 + o.h + 4), "xaxis")); xa.push(tag(S.text(X(v), o.y0 + o.h + 14, String(v), { muted: true }), "xaxis")); });
    if (o.xlabel) tag(S.text(o.x0 + o.w / 2, o.y0 + o.h + 34, o.xlabel, { ui: true, small: true }), "xlabel");
    if (o.ylabel) { const t = tag(S.text(o.x0 - 54, o.y0 + o.h / 2, o.ylabel, { ui: true, small: true }), "ylabel"); t.setAttribute("transform", `rotate(-90 ${o.x0 - 54} ${o.y0 + o.h / 2})`); }
    if (o.title) tag(S.text(o.x0 + o.w / 2, o.y0 - 16, o.title, { ui: true, weight: 600 }), "title");
    return { X, Y };
  }

  /* ---------- course data ---------- */
  const U = [[10, 5, 3], [25, 10, 4], [2, 1, 0], [15, 12, 7]];     // exam Q5 usage_matrix
  const ARR = [1, 2, 3, 4, 5, 4, 4, 7, 2];                         // Exercise 8, E2
  const SALES = [
    [101, "North", "A", 10, 25, 4.2], [102, "South", "A", 15, 25, 4.5], [103, "North", "B", 8, 40, null],
    [104, "West", "B", 12, 40, 3.8], [105, "South", "C", 20, 30, 4.7], [106, "West", "A", 9, 25, 4.0],
    [107, "North", "C", 14, 30, 4.4], [108, "South", "B", 11, 40, null], [109, "West", "C", 18, 30, 4.1],
    [110, "North", "A", 13, 25, 4.6], [111, "South", "C", 16, 30, 4.3], [112, "West", "B", 10, 40, 3.9],
  ].map(([order_id, region, product, units, unit_price, rating]) => ({ order_id, region, product, units, unit_price, rating, revenue: units * unit_price }));
  const SALES_COLS = ["order_id", "region", "product", "units", "unit_price", "rating"];
  const showRating = v => (v == null ? null : pyFloat(v));
  const salesRow = r => Object.assign({}, r, { rating: showRating(r.rating) });

  const SALES_PY = [
    "import numpy as np",
    "import pandas as pd",
    "",
    "sales = pd.DataFrame({                                    # the Exercise 8 data",
    "    'order_id': [101, 102, 103, 104, 105, 106, 107, 108, 109, 110, 111, 112],",
    "    'region': ['North', 'South', 'North', 'West', 'South', 'West', 'North', 'South', 'West', 'North', 'South', 'West'],",
    "    'product': ['A', 'A', 'B', 'B', 'C', 'A', 'C', 'B', 'C', 'A', 'C', 'B'],",
    "    'units': [10, 15, 8, 12, 20, 9, 14, 11, 18, 13, 16, 10],",
    "    'unit_price': [25, 25, 40, 40, 30, 25, 30, 40, 30, 25, 30, 40],",
    "    'rating': [4.2, 4.5, np.nan, 3.8, 4.7, 4.0, 4.4, np.nan, 4.1, 4.6, 4.3, 3.9],",
    "})",
  ].join("\n");
  const withSales = code => SALES_PY + "\n\n" + PADS.dedent(code);
  const USAGE_PY = [
    "usage_matrix = np.array([",
    "    [10,  5,  3],   # Machine 0",
    "    [25, 10,  4],   # Machine 1",
    "    [ 2,  1,  0],   # Machine 2",
    "    [15, 12,  7],   # Machine 3",
    "])",
  ].join("\n");

  /* ================================================================
     TOPIC 1: NumPy arrays & shape
     ================================================================ */

  // --- widget: reshape explorer ---
  function reshapeWidget(el) {
    let rows = 3;
    const s = seg([1, 2, 3, 4, 5, 6, 12].map(r => [r, r + (r === 1 ? " row" : " rows")]), v => { rows = v; draw(); }, "Number of rows");
    const codeBox = h("div"), pic = h("div"), info = h("div"), pr = outBox("");
    function draw() {
      s.sync(rows);
      const ok = 12 % rows === 0, cols = ok ? 12 / rows : null;
      codeBox.replaceChildren(ui.code({ code: [
        "a = np.arange(12)       # 0 to 11",
        ok ? `m = a.reshape(${rows}, ${cols})` : "m = a.reshape(5, -1)    # -1: work it out",
        "print(m.shape, m.ndim, m.size)",
        "print(m)",
      ], active: [2] }));
      if (!ok) {
        pic.replaceChildren(h("p", { class: "datasci-bad", html: "12 numbers cannot fill 5 equal rows (12 ÷ 5 = 2.4). NumPy refuses:" }));
        pr.textContent = "ValueError: cannot reshape array of size 12 into shape (5,newaxis)";
        pr.classList.add("datasci-errout");
        info.replaceChildren();
        return;
      }
      pr.classList.remove("datasci-errout");
      const m = Array.from({ length: rows }, (_, r) => Array.from({ length: cols }, (_, c) => r * cols + c));
      pic.replaceChildren(grid(m, { rowLabels: m.map((_, r) => "row " + r), colLabels: m[0].map((_, c) => "col " + c), mark: r => (r % 2 ? "sorted" : null) }));
      info.replaceChildren(ui.table({ head: ["Ask", "Answer", "Meaning"], code: [0], rows: [
        ["m.shape", `<code>(${rows}, ${cols})</code>`, `${rows} row${rows === 1 ? "" : "s"}, ${cols} column${cols === 1 ? "" : "s"}`],
        ["m.ndim", "<code>2</code>", "two directions: down and across"],
        ["m.size", "<code>12</code>", "how many values in total. Never changes"],
      ] }));
      pr.textContent = `(${rows}, ${cols}) 2 12\n` + npFmt2(m);
    }
    el.append(row(h("span", { class: "small muted" }, "Rows:"), s), h("div", { class: "datasci-two", style: "margin-top:12px" },
      h("div", null, codeBox, eyebrow("Output"), pr), h("div", null, pic, h("div", { style: "margin-top:10px" }, info))),
    note("The numbers fill the grid <b>row by row</b>: 0, 1, 2 … go across first. rows × columns must be 12."));
    draw();
  }

  // --- widget: indexing [row, column] ---
  function indexWidget(el) {
    let sel = { kind: "cell", r: 1, c: 0 };
    const pic = h("div"), codeLine = h("div"), expl = h("p", { style: "margin:8px 0 0" });
    function draw() {
      const mark = (r, c) => sel.kind === "cell" ? (r === sel.r && c === sel.c ? "held" : null) : sel.kind === "row" ? (r === sel.r ? "held" : null) : (c === sel.c ? "held" : null);
      pic.replaceChildren(grid(U, {
        rowLabels: U.map((_, r) => "machine " + r), colLabels: ["item 0", "item 1", "item 2"], mark,
        onCell: (r, c) => { sel = { kind: "cell", r, c }; draw(); }, onRow: r => { sel = { kind: "row", r }; draw(); }, onCol: c => { sel = { kind: "col", c }; draw(); },
        rowHi: sel.kind === "row" ? sel.r : null, colHi: sel.kind === "col" ? sel.c : null,
      }));
      let code, res, txt;
      if (sel.kind === "cell") { code = `usage_matrix[${sel.r}, ${sel.c}]`; res = String(U[sel.r][sel.c]); txt = `Row ${sel.r} (machine ${sel.r}), column ${sel.c} (item ${sel.c}): <b>one number</b>. Row first, then column.`; }
      else if (sel.kind === "row") { code = `usage_matrix[${sel.r}]`; res = npFmt(U[sel.r]); txt = `Only a row number: you get the <b>whole row</b>, a 1-D array of ${U[0].length} values.`; }
      else { code = `usage_matrix[:, ${sel.c}]`; res = npFmt(U.map(r => r[sel.c])); txt = "<code>:</code> means “every row”. So you get column " + sel.c + " from every machine: " + U.length + " values."; }
      codeLine.replaceChildren(ui.code({ code: [`print(${code})`], nonum: true }), outBox(res));
      expl.innerHTML = txt;
    }
    el.append(h("div", { class: "datasci-two" }, pic, h("div", null, eyebrow("Python", 0), codeLine, expl)));
    draw();
  }

  // --- widget: split scissors ---
  function splitWidget(el) {
    let fn = "vsplit", cut = 2;
    const G = Array.from({ length: 4 }, (_, r) => Array.from({ length: 4 }, (_, c) => r * 4 + c));
    const s1 = seg([["vsplit", "np.vsplit (cut rows)"], ["hsplit", "np.hsplit (cut columns)"]], v => { fn = v; draw(); }, "Split function");
    const s2 = seg([[1, "at 1"], [2, "at 2"], [3, "at 3"]], v => { cut = v; draw(); }, "Cut position");
    const pic = h("div"), codeBox = h("div"), pr = outBox("");
    function draw() {
      s1.sync(fn); s2.sync(cut);
      const v = fn === "vsplit";
      const inA = (r, c) => (v ? r < cut : c < cut);
      pic.replaceChildren(grid(G, { mark: (r, c) => (inA(r, c) ? "held" : "cmp"), rowLabels: ["0", "1", "2", "3"], colLabels: ["0", "1", "2", "3"] }));
      const A = v ? G.slice(0, cut) : G.map(r => r.slice(0, cut));
      const B = v ? G.slice(cut) : G.map(r => r.slice(cut));
      const names = v ? ["upper", "lower"] : ["left", "right"];
      codeBox.replaceChildren(ui.code({ code: [
        "grid = np.arange(16).reshape(4, 4)",
        `${names[0]}, ${names[1]} = np.${fn}(grid, [${cut}])   # cut before ${v ? "row" : "column"} ${cut}`,
        `print(${names[0]})`, `print(${names[1]})`] }));
      pr.textContent = npFmt2(A) + "\n" + npFmt2(B);
    }
    el.append(row(s1, s2), h("div", { class: "datasci-two", style: "margin-top:12px" },
      h("div", null, pic, D.legend([["held", "first part"], ["cmp", "second part"]])), h("div", null, codeBox, eyebrow("Output"), pr)),
    note("<code>np.vsplit(grid, 2)</code> (a plain number) means “2 equal pieces”. With 4 rows that is the same as <code>[2]</code>. A list like <code>[1]</code> says <b>where</b> to cut."));
    draw();
  }

  const arrays = {
    id: "arrays",
    title: "NumPy arrays & shape",
    summary: "What an array is, <code>shape</code>/<code>ndim</code>/<code>dtype</code>, <code>reshape</code>, <code>[row, column]</code> indexing, and joining or cutting arrays.",
    exam: ["Q2 stock_array[i]", "Q3 stock[i] -= 1"],
    sources: "Ex8 E1, M2",
    blocks: [
      { type: "h", text: "An array: one type, maths on everything at once" },
      `<p>A NumPy array looks like a list, but every value has the <b>same type</b>, and maths works on the whole array at once. No loop needed.</p>`,
      { type: "code", code: `
          import numpy as np                 # always this short name

          x = np.array([1, 2, 3])            # a list goes in, an array comes out
          print(x)                           # [1 2 3]   no commas: that is an array` },
      { type: "table", caption: "Same symbol, different job", head: ["Python", "With the list [1, 2, 3]", "With np.array([1, 2, 3])"], code: [0], rows: [
        ["x * 2", "<code>[1, 2, 3, 1, 2, 3]</code> (repeats)", "<code>[2 4 6]</code> (each value × 2)"],
        ["x + x", "<code>[1, 2, 3, 1, 2, 3]</code> (joins)", "<code>[2 4 6]</code> (adds value by value)"],
        ["x + 1", "TypeError", "<code>[2 3 4]</code>"],
      ] },

      { type: "h", text: "shape, ndim and dtype" },
      { type: "table", head: ["Code", "Gives", "In words"], code: [0], rows: [
        ["a = np.array([12, 15, 18, 21, 24, 27])", "", "Exercise 8, E1"],
        ["a.ndim", "<code>1</code>", "1 direction: a single row of values"],
        ["a.shape", "<code>(6,)</code>", "6 values. The comma means “a tuple with one number”"],
        ["a.dtype", "<code>int64</code>", "whole numbers"],
        ["b = np.array([[1, 2, 3], [4, 5, 6]])", "", "a list of rows → a 2-D array"],
        ["b.shape", "<code>(2, 3)</code>", "<b>2 rows, 3 columns</b>. Always rows first"],
        ["b.ndim", "<code>2</code>", "two directions"],
        ["np.array([1.5, 2]).dtype", "<code>float64</code>", "one float makes them all floats"],
      ] },
      { type: "callout", kind: "note", title: "int32 or int64?", html: "<p>The Try-it boxes run Python inside your browser. There, whole numbers show as <code>int32</code>. In Jupyter on your laptop you see <code>int64</code>. Both mean “whole numbers”. Nothing is wrong.</p>" },
      { type: "callout", kind: "rule", title: "shape is not a function", html: "<p><code>a.shape</code>, with no brackets after it. <code>a.shape()</code> is a TypeError: <code>'tuple' object is not callable</code>.</p>" },

      { type: "h", text: "reshape: same 12 numbers, new rows × columns", sub: "Pick how many rows. Try 5 too." },
      { type: "widget", render: reshapeWidget },

      { type: "h", text: "Indexing: [row, column]", sub: "Click a cell, a machine label or an item label. This is the exam's usage_matrix." },
      { type: "widget", render: indexWidget },
      { type: "table", head: ["Code", "Gives", "Rule"], code: [0], rows: [
        ["stock = np.array([5, 0, 3])\nstock[2]", "<code>3</code>", "1-D: one index, like a list (exam Q2, Q3)"],
        ["usage_matrix[1, 0]", "<code>25</code>", "2-D: row, then column"],
        ["usage_matrix[1]", "<code>[25 10 &nbsp;4]</code>", "only a row number: the whole row"],
        ["usage_matrix[:, 0]", "<code>[10 25 &nbsp;2 15]</code>", "<code>:</code> = every row, so a whole column"],
        ["usage_matrix[-1]", "<code>[15 12 &nbsp;7]</code>", "negative counts from the end"],
      ] },
      { type: "callout", kind: "exam", title: "Exam Q2 and Q3", html: "<p>The vending machine stock is a 1-D array. <code>stock[item_index]</code> reads one item, and <code>stock[item_index] -= 1</code> sells one. That is all the indexing Q2–Q3 needed.</p>" },

      { type: "h", text: "Join and cut arrays" },
      { type: "table", head: ["Code", "Gives", "What it does"], code: [0], rows: [
        ["np.concatenate((x1, x2))", "<code>[1 2 3 3 2 1]</code>", "x1 = [1 2 3], x2 = [3 2 1] → one long array. Note the <b>double brackets</b>: one tuple goes in"],
        ["np.vstack(([1, 2], [3, 4]))", "<code>[[1 2]<br>&nbsp;[3 4]]</code>", "stack as rows (vertical)"],
        ["np.hstack(([1, 2], [3, 4]))", "<code>[1 2 3 4]</code>", "side by side (horizontal)"],
        ["np.vsplit(grid, [2])", "two arrays", "cut <b>rows</b> before row 2"],
        ["np.hsplit(grid, [2])", "two arrays", "cut <b>columns</b> before column 2"],
      ] },
      { type: "widget", title: "Cut the 4 × 4 grid", intro: "Exercise 8, M2: <code>np.arange(16).reshape(4, 4)</code>, then split it.", render: splitWidget },

      {
        type: "tryit",
        title: "Arrays, shape, indexing, split",
        task: "Run it. Then change <code>reshape(4, 4)</code> to <code>reshape(2, 8)</code> and predict the shape before you run.",
        code: `
          import numpy as np

          a = np.array([12, 15, 18, 21, 24, 27])   # Exercise 8, E1
          print(a)
          print('ndim:', a.ndim, ' shape:', a.shape, ' dtype:', a.dtype)

          grid = np.arange(16).reshape(4, 4)       # 0..15 as 4 rows × 4 columns
          print(grid)
          print(grid[1, 2])                        # row 1, column 2

          upper, lower = np.vsplit(grid, [2])      # cut before row 2
          print(lower)`,
      },
      { type: "mistakes", items: [
        { title: "Values without the list brackets", wrong: "np.array(1, 2, 3)", right: "np.array([1, 2, 3])", why: "<code>np.array</code> wants <b>one</b> list. TypeError: <code>array() takes from 1 to 2 positional arguments but 3 were given</code>." },
        { title: "A missing comma between rows", wrong: "np.array([[1, 2] [3, 4]])", right: "np.array([[1, 2], [3, 4]])", why: "Without the comma Python reads <code>[1, 2][3, 4]</code> as indexing a list. TypeError: <code>list indices must be integers or slices, not tuple</code>." },
        { title: "Calling shape", wrong: "a.shape()", right: "a.shape", why: "<code>shape</code> is a value (a tuple), not a function. TypeError: <code>'tuple' object is not callable</code>." },
        { title: "reshape to the wrong size", wrong: "np.arange(12).reshape(5, 2)", right: "np.arange(12).reshape(6, 2)", why: "rows × columns must equal the number of values. ValueError: <code>cannot reshape array of size 12 into shape (5,2)</code>." },
        { title: "concatenate without the tuple", wrong: "np.concatenate(x1, x2)", right: "np.concatenate((x1, x2))", why: "The second argument is the axis, so <code>x2</code> is read as an axis. TypeError: <code>only integer scalar arrays can be converted to a scalar index</code>." },
      ] },
    ],
    quiz: [
      { type: "predict", q: "What does this print?", code: "import numpy as np\n\nb = np.array([[1, 2, 3], [4, 5, 6]])\nprint(b.shape)", answer: "(2, 3)",
        hint: "How many inner lists (rows)? How many values in each?", explain: "2 rows and 3 columns. The shape always says rows first." },
      { type: "predict", q: "What does this print?", code: "import numpy as np\n\nx = np.array([1, 2, 3])\nprint(x * 2)", answer: "[2 4 6]",
        hint: "With an array, <code>* 2</code> works on each value.", explain: "Each value is doubled. A list would repeat instead: <code>[1, 2, 3, 1, 2, 3]</code>. Arrays print without commas." },
      { type: "mc", q: "What happens here?", code: "np.arange(12).reshape(5, 2)", options: ["a 5 × 2 array, the last 2 numbers are dropped", "<code>ValueError</code>", "a 6 × 2 array", "a 5 × 2 array padded with zeros"], answer: 1,
        hint: "5 × 2 is 10. How many numbers are there?", explain: "12 values cannot fill 10 places. NumPy never drops or adds values: <code>ValueError: cannot reshape array of size 12 into shape (5,2)</code>." },
      { type: "predict", q: "What does this print?", code: "import numpy as np\n\ngrid = np.arange(16).reshape(4, 4)\nprint(grid[2, 1])", answer: "9",
        hint: "Row 2 is <code>8 9 10 11</code>. Now take column 1 of that row.", explain: "Row 2 holds 8, 9, 10, 11. Column 1 is the second of them: 9." },
      { type: "bug", q: "Exam Q2 style. Click every line with a syntax error.", code: `
          import numpy as np
          stock = np.array([5, 0, 3]
          item_index = 1
          if stock[item_index] > 0
              print("in stock")`,
        bugs: [2, 4], notes: { 2: "the <code>(</code> of <code>np.array(</code> is never closed", 4: "missing <code>:</code> at the end of the <code>if</code>" },
        fixed: `
          import numpy as np
          stock = np.array([5, 0, 3])
          item_index = 1
          if stock[item_index] > 0:
              print("in stock")`,
        hint: "Count the brackets on each line. Check the end of every <code>if</code>.", explain: "Python reports the first one (line 2: <code>'(' was never closed</code>). In the exam, list <b>every</b> error with its line number." },
      { type: "write", q: "Write <code>make_grid(n)</code>. It <b>returns</b> the numbers <code>0</code> to <code>n*n - 1</code> as an n × n array. <code>make_grid(2)</code> is <code>[[0 1] [2 3]]</code>.",
        starter: `
          import numpy as np

          def make_grid(n):
              # np.arange, then reshape
              pass

          print(make_grid(3))`,
        checks: [["make_grid(2).tolist()", "[[0, 1], [2, 3]]"], ["make_grid(3).shape", "(3, 3)"], ["int(make_grid(4)[3, 3])", "15"]],
        solution: `
          import numpy as np

          def make_grid(n):
              return np.arange(n * n).reshape(n, n)   # n*n values, n rows, n columns`,
        hint: "<code>np.arange(n * n)</code> gives the numbers. <code>.reshape(n, n)</code> makes the grid. Remember <code>return</code>.",
        explain: "You can chain the two calls. Exercise 8, M2 did the same with <code>np.arange(16).reshape(4, 4)</code>." },
    ],
  };

  /* ================================================================
     TOPIC 2: Masks & np.where
     ================================================================ */
  const OPS = {
    ">": (a, b) => a > b, ">=": (a, b) => a >= b, "<": (a, b) => a < b, "<=": (a, b) => a <= b,
    "==": (a, b) => a === b, "!=": (a, b) => a !== b,
  };

  // --- widget: build a mask ---
  function maskWidget(el) {
    const st = { op1: ">", v1: 3, join: "off", op2: "<", v2: 6 };
    const opOpts = Object.keys(OPS).map(o => [o, o]);
    const o1 = select("datasci-m-op1", opOpts, st.op1), o2 = select("datasci-m-op2", opOpts, st.op2);
    const n1 = h("input", { type: "range", min: "0", max: "8", value: String(st.v1), id: "datasci-m-v1" });
    const n2 = h("input", { type: "range", min: "0", max: "8", value: String(st.v2), id: "datasci-m-v2" });
    const b1 = h("b", { class: "mono" }), b2 = h("b", { class: "mono" });
    const j = seg([["off", "one condition"], ["&", "& (and)"], ["|", "| (or)"]], v => { st.join = v; draw(); }, "Second condition");
    const second = row(label("arr", "datasci-m-op2"), o2, label("value", "datasci-m-v2"), n2, b2);
    const pic = h("div"), codeBox = h("div"), pr = outBox(""), sentence = h("p", { style: "margin:8px 0 0" });
    function draw() {
      st.op1 = o1.value; st.op2 = o2.value; st.v1 = +n1.value; st.v2 = +n2.value;
      b1.textContent = st.v1; b2.textContent = st.v2; j.sync(st.join);
      second.hidden = st.join === "off";
      const c1 = ARR.map(x => OPS[st.op1](x, st.v1)), c2 = ARR.map(x => OPS[st.op2](x, st.v2));
      const mask = ARR.map((x, i) => (st.join === "off" ? c1[i] : st.join === "&" ? c1[i] && c2[i] : c1[i] || c2[i]));
      const kept = ARR.filter((_, i) => mask[i]), idx = mask.map((m, i) => (m ? i : -1)).filter(i => i >= 0);
      const g = h("div", { class: "datasci-mask", style: `grid-template-columns: auto repeat(${ARR.length}, minmax(0, 1fr))` });
      g.append(h("span", { class: "datasci-gl" }, "index"), ...ARR.map((_, i) => h("span", { class: "datasci-gl" }, String(i))));
      g.append(h("span", { class: "datasci-gl" }, "arr"), ...ARR.map((x, i) => h("div", { class: "datasci-cell" + (mask[i] ? " mk-held" : " mk-dim") }, String(x))));
      g.append(h("span", { class: "datasci-gl" }, "mask"), ...mask.map(m => h("div", { class: "datasci-bool " + (m ? "t" : "f") }, pyb(m))));
      pic.replaceChildren(g, eyebrow("arr[mask] keeps the True ones"), D.array(kept, { name: "arr[mask]", index: false, emptyText: "[]  nothing is True" }));
      const cond = (op, v) => `arr ${op} ${v}`;
      const maskSrc = st.join === "off" ? cond(st.op1, st.v1) : `(${cond(st.op1, st.v1)}) ${st.join} (${cond(st.op2, st.v2)})`;
      codeBox.replaceChildren(ui.code({ code: [
        "arr = np.array([1, 2, 3, 4, 5, 4, 4, 7, 2])",
        `mask = ${maskSrc}`,
        "print(mask)",
        "print(arr[mask])       # values",
        "print(np.where(mask))  # positions",
        "print(np.sum(mask))    # how many"], active: [2] }));
      pr.textContent = [npFmt(mask), npFmt(kept), whereRepr(idx), String(kept.length)].join("\n");
      sentence.innerHTML = `<b>${kept.length}</b> of ${ARR.length} values pass. Their positions are <code>${idx.join(", ") || "none"}</code>.`;
    }
    [o1, o2, n1, n2].forEach(x => (x.oninput = draw));
    el.append(
      row(label("arr", "datasci-m-op1"), o1, label("value", "datasci-m-v1"), n1, b1),
      h("div", { style: "margin-top:8px" }, j), h("div", { style: "margin-top:8px" }, second),
      h("div", { class: "datasci-two", style: "margin-top:14px" }, h("div", null, pic, sentence), h("div", null, codeBox, eyebrow("Output"), pr)));
    draw();
  }

  // --- stepper: np.where written as a loop ---
  function whereSteps() {
    const S = [
      { line: 1, now: "Make the array (Exercise 8, E2).", vars: { arr: "[1 2 3 4 5 4 4 7 2]" }, cur: -1, hits: [] },
      { line: 2, now: "An empty list for the positions we find.", vars: { arr: "[…]", positions: "[]" }, cur: -1, hits: [] },
    ];
    const hits = [];
    ARR.forEach((x, i) => {
      S.push({ line: 3, now: `Next position: <b>i = ${i}</b>. <code>arr[${i}]</code> is ${x}.`, vars: { arr: "[…]", positions: PADS.pyrepr(hits), i: String(i) }, cur: i, hits: hits.slice() });
      if (x === 4) {
        S.push({ line: 4, now: `Is ${x} == 4? <b>Yes.</b>`, cur: i, hits: hits.slice(), yes: true });
        hits.push(i);
        S.push({ line: 5, now: `Remember position <b>${i}</b> (not the value 4).`, vars: { arr: "[…]", positions: PADS.pyrepr(hits), i: String(i) }, cur: i, hits: hits.slice(), yes: true });
      } else S.push({ line: 4, now: `Is ${x} == 4? No. Skip line 5.`, cur: i, hits: hits.slice() });
    });
    S.push({ line: 6, now: "The loop is done. These are the positions of the 4s. <code>np.where(arr == 4)[0]</code> gives the same numbers in one line, without a loop.", print: "[3, 5, 6]", cur: -1, hits: hits.slice() });
    return S;
  }
  function whereVisual(el, st) {
    const marks = {}, below = {};
    ARR.forEach((x, i) => {
      if (i === st.cur) { marks[i] = st.yes ? "done" : "cmp"; below[i] = "i"; }
      else if (st.hits.includes(i)) { marks[i] = "done"; below[i] = "✓"; }
      else if (st.cur >= 0 && i < st.cur) marks[i] = "dim";
    });
    el.appendChild(D.array(ARR, { name: "arr", marks, below }));
    el.appendChild(h("div", { style: "margin-top:10px" }, D.array(st.hits, { name: "positions", index: false, emptyText: "[ ]  (empty)" })));
  }

  const masks = {
    id: "masks",
    title: "Masks & np.where",
    summary: "A comparison gives a True/False array (a <b>mask</b>). Use it to keep values, count them, or find their positions with <code>np.where</code>.",
    exam: ["Q5 boolean indexing"],
    sources: "Ex8 E2",
    blocks: [
      { type: "h", text: "A mask is a row of True/False" },
      `<p>Compare an array with a number and you get one True or False <b>per value</b>. That True/False array is called a mask.</p>`,
      { type: "table", caption: "arr = np.array([1, 2, 3, 4, 5, 4, 4, 7, 2])", head: ["Code", "Gives", "In words"], code: [0], rows: [
        ["arr > 3", "<code>[False False False &nbsp;True &nbsp;True &nbsp;True &nbsp;True &nbsp;True False]</code>", "the mask: same length as <code>arr</code>"],
        ["arr[arr > 3]", "<code>[4 5 4 4 7]</code>", "keep the <b>values</b> where the mask is True"],
        ["np.where(arr == 4)", "<code>(array([3, 5, 6]),)</code>", "the <b>positions</b>, packed in a tuple"],
        ["np.where(arr == 4)[0]", "<code>[3 5 6]</code>", "<code>[0]</code> takes the array out of the tuple"],
        ["np.sum(arr > 3)", "<code>5</code>", "True counts as 1, so this counts them"],
      ] },
      { type: "h", text: "Build a mask", sub: "Pick a test. Add a second one with & or |." },
      { type: "widget", render: maskWidget },

      { type: "h", text: "np.where gives positions, not values", sub: "Here is what np.where does for you, written as a loop." },
      {
        type: "stepper",
        title: "Find the positions of the 4s",
        code: `
          arr = np.array([1, 2, 3, 4, 5, 4, 4, 7, 2])
          positions = []
          for i in range(len(arr)):        # i = 0, 1, ..., 8
              if arr[i] == 4:              # the same test as the mask
                  positions.append(i)      # keep the position i
          print(positions)                 # like np.where(arr == 4)[0]`,
        what: {
          1: "Make the array.",
          2: "An empty list to collect positions.",
          3: "Walk over every position 0 … 8.",
          4: "The test. This is what arr == 4 does for every value at once.",
          5: "Store the position i, not the value.",
          6: "After the loop: show the positions.",
        },
        steps: whereSteps(),
        visualTitle: "The array",
        legend: [["cmp", "checking"], ["done", "is a 4: position kept"]],
        visual: whereVisual,
      },
      { type: "table", head: ["You want", "Write", "Gives"], code: [1], rows: [
        ["the values", "arr[arr == 4]", "<code>[4 4 4]</code>"],
        ["the positions", "np.where(arr == 4)[0]", "<code>[3 5 6]</code>"],
        ["how many", "np.sum(arr == 4)", "<code>3</code>"],
        ["a value or a fallback", "np.where(arr > 3, arr, 0)", "<code>[0 0 0 4 5 4 4 7 0]</code>: keep arr where True, else 0"],
      ] },

      { type: "h", text: "Two conditions: &, |, ~ and brackets" },
      { type: "table", head: ["Code", "Gives", "Means"], code: [0], rows: [
        ["arr[(arr >= 3) & (arr <= 5)]", "<code>[3 4 5 4 4]</code>", "<b>both</b> true (Exercise 8, E2)"],
        ["arr[(arr < 2) | (arr > 5)]", "<code>[1 7]</code>", "<b>at least one</b> true"],
        ["arr[~(arr > 3)]", "<code>[1 2 3 2]</code>", "<b>not</b>: flips the mask"],
        ["arr[(arr > 3) and (arr < 6)]", "<span class='bad'>ValueError</span>", "<code>and</code> wants one True/False, not 9"],
        ["arr[arr > 3 & arr < 6]", "<span class='bad'>ValueError</span>", "<code>&</code> runs before <code>&gt;</code>, so it computes <code>3 & arr</code> first"],
      ] },
      { type: "callout", kind: "rule", title: "Brackets around each test", html: "<p>With arrays, use <code>&</code> and <code>|</code>, never <code>and</code>/<code>or</code>, and put each test in its own brackets: <code>(arr &gt;= 3) & (arr &lt;= 5)</code>.</p>" },
      { type: "table", caption: "Masks work on 2-D arrays too", head: ["Code", "Gives", "Note"], code: [0], rows: [
        ["usage_matrix > 10", "a 4 × 3 True/False grid", "one True/False per cell"],
        ["usage_matrix[usage_matrix > 10]", "<code>[25 15 12]</code>", "the kept values come out <b>flat</b> (1-D)"],
      ] },
      {
        type: "tryit",
        title: "Exercise 8, E2",
        task: "Run it. Then find the positions of the values <b>greater than 4</b>.",
        code: `
          import numpy as np

          arr = np.array([1, 2, 3, 4, 5, 4, 4, 7, 2])

          positions_of_4 = np.where(arr == 4)[0]       # positions, not values
          greater_than_3 = arr[arr > 3]                # values
          between_3_and_5 = arr[(arr >= 3) & (arr <= 5)]   # brackets around each test

          print("positions_of_4:", positions_of_4)
          print("greater_than_3:", greater_than_3)
          print("between_3_and_5:", between_3_and_5)
          print("how many > 3:", np.sum(arr > 3))`,
        solution: `
          import numpy as np

          arr = np.array([1, 2, 3, 4, 5, 4, 4, 7, 2])
          print(np.where(arr > 4)[0])     # [4 7]`,
        solutionNote: "5 is at position 4 and 7 at position 7.",
      },
      { type: "mistakes", items: [
        { title: "<code>and</code> instead of <code>&</code>", wrong: "arr[(arr > 3) and (arr < 6)]", right: "arr[(arr > 3) & (arr < 6)]", why: "ValueError: <code>The truth value of an array with more than one element is ambiguous</code>. <code>and</code> needs one True/False." },
        { title: "No brackets around the tests", wrong: "arr[arr > 3 & arr < 6]", right: "arr[(arr > 3) & (arr < 6)]", why: "<code>&</code> is done before <code>&gt;</code> and <code>&lt;</code>, so Python works out <code>3 & arr</code> first. Same ValueError." },
        { title: "Keeping the mask instead of the values", wrong: "big = arr > 3       # True/False", right: "big = arr[arr > 3]  # the values", why: "<code>arr &gt; 3</code> is only the mask. Put it inside <code>arr[...]</code> to get values." },
        { title: "Forgetting <code>[0]</code> after np.where", wrong: "idx = np.where(arr == 4)     # (array([3, 5, 6]),)", right: "idx = np.where(arr == 4)[0]  # [3 5 6]", why: "<code>np.where</code> gives back a tuple with one array per dimension. <code>[0]</code> takes the array out." },
        { title: "<code>=</code> inside the brackets", wrong: "arr[arr = 4]", right: "arr[arr == 4]", why: "<code>=</code> stores; a test needs <code>==</code>. SyntaxError." },
      ] },
    ],
    quiz: [
      { type: "predict", q: "What does this print?", code: "import numpy as np\n\narr = np.array([1, 2, 3, 4, 5, 4, 4, 7, 2])\nprint(arr[arr > 4])", answer: "[5 7]",
        hint: "Which values are bigger than 4? Keep them in order.", explain: "Only 5 and 7 are greater than 4. The 4s are not: 4 &gt; 4 is False." },
      { type: "predict", q: "What does this print?", code: "import numpy as np\n\narr = np.array([1, 2, 3, 4, 5, 4, 4, 7, 2])\nprint(np.where(arr == 4)[0])", answer: "[3 5 6]",
        hint: "Positions start at 0. Where are the 4s?", explain: "The 4s sit at positions 3, 5 and 6. <code>np.where</code> gives positions, and <code>[0]</code> takes them out of the tuple." },
      { type: "mc", q: "Which line gives the <b>values</b> from 3 through 5 (both included)?", options: [
        "<code>arr[arr &gt;= 3 and arr &lt;= 5]</code>", "<code>arr[arr &gt;= 3 & arr &lt;= 5]</code>", "<code>arr[(arr &gt;= 3) & (arr &lt;= 5)]</code>", "<code>np.where((arr &gt;= 3) & (arr &lt;= 5))</code>"], answer: 2,
        wrong: { 0: "<code>and</code> on arrays is a ValueError.", 1: "Without brackets, <code>&</code> runs first: ValueError.", 3: "That gives positions, not values." },
        hint: "Arrays need <code>&</code>, and each test needs its own brackets.", explain: "<code>(arr &gt;= 3) & (arr &lt;= 5)</code> is the mask; <code>arr[...]</code> keeps the values: <code>[3 4 5 4 4]</code>." },
      { type: "predict", q: "What does this print?", code: "import numpy as np\n\narr = np.array([1, 2, 3, 4, 5, 4, 4, 7, 2])\nprint(np.sum(arr > 3))", answer: "5",
        hint: "<code>arr &gt; 3</code> is a mask. What is True when you add it up?", explain: "True counts as 1 and False as 0. Five values are above 3 (4, 5, 4, 4, 7), so the sum is 5." },
      { type: "bug", q: "This should print the coins from 5 to 10. Click the line that crashes.", code: `
          import numpy as np
          coins = np.array([1, 2, 5, 10, 20])
          middle = coins[coins >= 5 and coins <= 10]
          print(middle)`,
        bugs: [3], notes: { 3: "<code>and</code> on arrays: ValueError. Use <code>(coins &gt;= 5) & (coins &lt;= 10)</code>" },
        fixed: `
          import numpy as np
          coins = np.array([1, 2, 5, 10, 20])
          middle = coins[(coins >= 5) & (coins <= 10)]
          print(middle)     # [ 5 10]`,
        hint: "Which word does not work on a whole array?", explain: "A runtime error: lines 1–2 run, then line 3 crashes with <code>The truth value of an array with more than one element is ambiguous</code>." },
      { type: "write", q: "Write <code>count_above(arr, limit)</code>. It <b>returns</b> how many values in <code>arr</code> are greater than <code>limit</code>. Use a mask, no loop.",
        starter: `
          import numpy as np

          def count_above(arr, limit):
              pass

          print(count_above(np.array([1, 2, 3, 4, 5, 4, 4, 7, 2]), 3))`,
        checks: [["int(count_above(np.array([1, 2, 3, 4, 5, 4, 4, 7, 2]), 3))", "5"], ["int(count_above(np.array([5, 6]), 4))", "2"], ["int(count_above(np.array([1, 2]), 10))", "0"]],
        solution: `
          import numpy as np

          def count_above(arr, limit):
              return np.sum(arr > limit)     # True counts as 1`,
        hint: "Make the mask <code>arr &gt; limit</code>, then add it up with <code>np.sum</code>.",
        explain: "<code>len(arr[arr &gt; limit])</code> works too: keep the values, then count them." },
    ],
  };

  /* ================================================================
     TOPIC 3: axis= and summaries (exam Q5)
     ================================================================ */

  // --- widget: summary statistics on a number line ---
  function statsWidget(el) {
    const start = [2, 4, 4, 6, 9];
    const ins = start.map((v, i) => h("input", { type: "range", min: "0", max: "20", value: String(v), id: "datasci-st-" + i, "aria-label": "value " + i }));
    const shown = start.map(() => h("b", { class: "mono datasci-num" }));
    const pic = h("div"), table = h("div"), say = h("p", { style: "margin:8px 0 0" });
    function draw() {
      const x = ins.map(i => +i.value);
      x.forEach((v, i) => (shown[i].textContent = v));
      const s = x.slice().sort((a, b) => a - b), n = x.length;
      const mean = sum(x) / n, median = s[2], p75 = s[3];     // n = 5: numpy's positions 2 and 3 are exact
      const std = Math.sqrt(sum(x.map(v => (v - mean) ** 2)) / n);
      const S = D.svg({ w: 440, h: 124, label: "the five values on a number line with mean, median and 75th percentile" });
      const X = v => 30 + v * 19;
      S.line(X(0), 92, X(20), 92);
      [0, 5, 10, 15, 20].forEach(v => { S.line(X(v), 92, X(v), 97); S.text(X(v), 109, String(v), { muted: true }); });
      const seen = {};
      x.forEach(v => { const k = (seen[v] = (seen[v] || 0) + 1) - 1; S.circle(X(v), 82 - 13 * k, 6, { tone: "muted", cls: "datasci-dot" }); });
      [[mean, "mean", "accent", 8], [median, "median", "done", 22], [p75, "75th pct", "min", 36]].forEach(([v, t, tone, y]) => {
        S.line(X(v), y + 8, X(v), 92, { tone, cls: "datasci-mark" });
        S.text(X(v), y, t, { ui: true, small: true, cls: "datasci-t-" + tone });
      });
      pic.replaceChildren(S.el);
      table.replaceChildren(ui.table({ head: ["Code", "Gives", "What it is"], code: [0], rows: [
        ["np.sum(x)", `<code>${sum(x)}</code>`, "add them all"],
        ["np.mean(x)", `<code>${pyFloat(mean)}</code>`, `the average: ${sum(x)} / 5`],
        ["np.median(x)", `<code>${pyFloat(median)}</code>`, "the middle value after sorting: <code>" + s.join(", ") + "</code>"],
        ["np.percentile(x, 75)", `<code>${pyFloat(p75)}</code>`, "75% of the values are at or below it"],
        ["np.std(x)", `<code>≈ ${std.toFixed(2)}</code>`, "typical distance from the mean"],
        ["np.min(x), np.max(x)", `<code>${s[0]} ${s[4]}</code>`, "smallest and biggest"],
      ] }));
      const gap = mean - median;
      say.innerHTML = Math.abs(gap) < 0.5 ? "Mean and median are close: the values are spread evenly around the middle."
        : gap > 0 ? `The mean (${pyFloat(mean)}) is pulled <b>up</b> by a big value. The median (${pyFloat(median)}) does not care how big it is.`
        : `The mean (${pyFloat(mean)}) is pulled <b>down</b> by a small value. The median (${pyFloat(median)}) stays in the middle.`;
    }
    ins.forEach(i => (i.oninput = draw));
    el.append(h("div", { class: "datasci-sliders" }, ins.map((inp, i) => h("div", { class: "datasci-slider" }, label("x[" + i + "]", inp.id), inp, shown[i]))),
      h("div", { style: "margin-top:10px" }, pic), say, h("div", { style: "margin-top:10px" }, table),
      note("Start values are Exercise 8, M1: <code>[2, 4, 4, 6, 9]</code>. Drag one value to 20 and watch the mean move while the median stays."));
    draw();
  }

  // --- widget: axis=0 / axis=1 with animated arrows ---
  const AXIS_PRINT = {
    sum: { none: "94", 0: "[52 28 14]", 1: "[18 39  3 34]" },
    mean: { none: "7.833333333333333", 0: "[13.   7.   3.5]", 1: "[ 6.         13.          1.         11.33333333]" },
    max: { none: "25", 0: "[25 12  7]", 1: "[10 25  2 15]" },
  };
  function axisWidget(el, api) {
    let axis = "1", fn = "sum", k = 99, timer = null;
    const sA = seg([["none", "no axis"], ["0", "axis=0"], ["1", "axis=1"]], v => { axis = v; play(); }, "Axis");
    const sF = seg([["sum", "np.sum"], ["mean", "np.mean"], ["max", "np.max"]], v => { fn = v; play(); }, "Function");
    const replay = h("button", { type: "button", class: "btn small", onclick: () => play() }, "Replay");
    const pic = h("div"), list = h("ol", { class: "datasci-steps" }), head = h("p", { style: "margin:0 0 6px" }), codeBox = h("div"), pr = outBox("");
    const stop = () => { if (timer) { clearInterval(timer); timer = null; } };
    api.onCleanup(stop);
    const groups = () => (axis === "none" ? [U.flat()] : axis === "0" ? [0, 1, 2].map(c => U.map(r => r[c])) : U.map(r => r.slice()));
    const res = v => (fn === "sum" ? sum(v) : fn === "max" ? Math.max(...v) : sum(v) / v.length);
    const short = x => (fn !== "mean" ? String(x) : Number.isInteger(x) ? x.toFixed(1) : String(+x.toFixed(2)));
    const sentence = v => (fn === "sum" ? `${v.join(" + ")} = ${res(v)}` : fn === "max" ? `max(${v.join(", ")}) = ${res(v)}` : `(${v.join(" + ")}) / ${v.length} = ${short(res(v))}`);
    function play() {
      stop();
      if (reduceMotion()) { k = 99; draw(); return; }
      k = 0; draw();
      timer = setInterval(() => { k++; draw(); if (k >= groups().length) stop(); }, 1000);
    }
    function draw() {
      sA.sync(axis); sF.sync(fn);
      const G = groups(), n = G.length, done = k >= n;
      const x0 = 92, y0 = 52, cw = 56, ch = 46, rx = x0 + 3 * cw + 40, ry = y0 + 4 * ch + 40;
      const H = axis === "0" ? ry + ch + 12 : y0 + 4 * ch + 14;
      const S = D.svg({ w: rx + cw + 6, h: H, label: "usage_matrix with the direction of " + fn + (axis === "none" ? " over everything" : " along axis " + axis) });
      const grp = (r, c) => (axis === "none" ? 0 : axis === "0" ? c : r);
      [0, 1, 2].forEach(c => S.text(x0 + c * cw + cw / 2, y0 - 14, "item " + c, { muted: true }));
      [0, 1, 2, 3].forEach(r => S.text(x0 - 12, y0 + r * ch + ch / 2, "machine " + r, { anchor: "end", muted: true }));
      for (let r = 0; r < 4; r++) for (let c = 0; c < 3; c++) {
        const g = grp(r, c), x = x0 + c * cw, y = y0 + r * ch;
        const tone = !done && g === k ? "cmp" : g < k ? "accent" : null;
        S.box(x + 2, y + 2, cw - 4, ch - 4, { tone, rx: 6 });
        const tx = axis === "0" ? x + 21 : x + cw / 2, ty = axis === "1" ? y + 18 : y + ch / 2;
        S.text(tx, ty, String(U[r][c]));
      }
      for (let g = 0; g < n; g++) {
        if (g > k) continue;
        const cur = !done && g === k;
        let a, box;
        if (axis === "1") { const y = y0 + g * ch; a = S.arrow(x0 + 8, y + 34, rx - 6, y + 34, { tone: cur ? "cmp" : "accent" }); box = [rx, y + 2]; }
        else if (axis === "0") { const x = x0 + g * cw; a = S.arrow(x + 44, y0 + 8, x + 44, ry - 6, { tone: cur ? "cmp" : "accent" }); box = [x + 2, ry]; }
        else { a = S.arrow(x0 + 3 * cw + 6, y0 + 2 * ch, rx - 6, y0 + 2 * ch, { tone: cur ? "cmp" : "accent" }); box = [rx, y0 + 2 * ch - ch / 2 + 2]; }
        if (cur) a.classList.add("datasci-draw");
        const b = S.box(box[0], box[1], cw - 4, ch - 4, { text: short(res(G[g])), tone: "done", rx: 6 });
        if (cur) b.classList.add("datasci-pop");
      }
      if (axis === "1") S.text(rx + cw / 2 - 2, y0 - 14, "result", { muted: true });
      if (axis === "0") S.text(x0 - 12, ry + ch / 2 - 2, "result", { anchor: "end", muted: true });
      if (axis === "none") S.text(rx + cw / 2 - 2, y0 + 2 * ch - ch / 2 - 12, "result", { muted: true });
      pic.replaceChildren(S.el);
      const shape = axis === "none" ? "one plain number (no shape)" : axis === "0" ? "shape <code>(3,)</code>: one value per item (column)" : "shape <code>(4,)</code>: one value per machine (row)";
      head.innerHTML = axis === "none" ? "<b>No axis:</b> all 12 numbers become <b>one</b> number." : axis === "0"
        ? "<b>axis=0:</b> go <b>down</b> each column. The 4 rows collapse into one."
        : "<b>axis=1:</b> go <b>across</b> each row. The 3 columns collapse into one.";
      const nm = g => (axis === "none" ? "everything" : axis === "0" ? "item " + g : "machine " + g);
      list.replaceChildren(...G.map((v, g) => h("li", { class: g === k && !done ? "cur" : g > k ? "later" : null, html: `<b>${nm(g)}:</b> <span class="mono">${sentence(v)}</span>` })));
      const call = `np.${fn}(usage_matrix${axis === "none" ? "" : ", axis=" + axis})`;
      codeBox.replaceChildren(ui.code({ code: [`print(${call})`], nonum: true }));
      pr.textContent = AXIS_PRINT[fn][axis];
      shapeNote.innerHTML = "<code>usage_matrix.shape</code> is <code>(4, 3)</code>. Result: " + shape + ".";
    }
    const shapeNote = h("p", { class: "small", style: "margin:6px 0 0" });
    el.append(row(sA, sF, replay), h("div", { class: "datasci-two", style: "margin-top:12px" },
      pic, h("div", null, head, list, eyebrow("Python"), codeBox, h("div", { style: "margin-top:6px" }, pr, shapeNote))));
    draw();
  }

  // --- widget: totals → mask → np.where (exam Q5) ---
  function thresholdWidget(el) {
    const TOT = U.map(r => sum(r));            // [18, 39, 3, 34]
    let op = ">";
    const sl = h("input", { type: "range", min: "0", max: "45", value: "25", id: "datasci-thr" });
    const tv = h("b", { class: "mono" });
    const sOp = seg([[">", "> (exceeds)"], [">=", ">= (at least)"]], v => { op = v; draw(); }, "Comparison");
    const pic = h("div"), arrays = h("div"), codeBox = h("div"), pr = outBox(""), say = h("p", { style: "margin:8px 0 0" });
    function draw() {
      const thr = +sl.value;
      tv.textContent = thr; sOp.sync(op);
      const mask = TOT.map(t => (op === ">" ? t > thr : t >= thr));
      const idx = mask.map((m, i) => (m ? i : -1)).filter(i => i >= 0);
      const S = D.svg({ w: 440, h: 176, label: "machine totals as bars with the threshold line" });
      const X = v => 92 + v * 7.4;
      TOT.forEach((t, i) => {
        const y = 12 + i * 36;
        S.text(84, y + 13, "machine " + i, { anchor: "end", muted: true });
        S.box(X(0), y, Math.max(2, X(t) - X(0)), 26, { tone: mask[i] ? "done" : null, rx: 4 });
        S.text(X(t) + 8, y + 13, String(t), { anchor: "start" });
      });
      S.line(X(thr), 4, X(thr), 156, { tone: "swap", dashed: true });
      S.text(X(thr), 168, "threshold " + thr, { muted: true });
      pic.replaceChildren(S.el);
      arrays.replaceChildren(
        D.array(TOT, { name: "totals", marks: Object.fromEntries(mask.map((m, i) => [i, m ? "done" : "dim"])) }),
        h("div", { style: "height:8px" }),
        D.array(mask.map(pyb), { name: "mask", index: false, marks: Object.fromEntries(mask.map((m, i) => [i, m ? "done" : "swap"])) }),
        h("div", { style: "height:8px" }),
        D.array(idx, { name: "result", index: false, emptyText: "[]  no machine passes" }));
      codeBox.replaceChildren(ui.code({ code: [
        "totals = np.sum(usage_matrix, axis=1)",
        `mask = totals ${op} ${thr}`,
        "print(totals)",
        "print(mask)",
        "print(np.where(mask)[0])"], active: [2] }));
      pr.textContent = [npFmt(TOT), npFmt(mask), npFmt(idx)].join("\n");
      say.innerHTML = idx.length ? `Machine${idx.length > 1 ? "s" : ""} <b>${idx.join(" and ")}</b> ${op === ">" ? "used more than" : "used at least"} ${thr} items.` : `No machine ${op === ">" ? "used more than" : "used at least"} ${thr} items, so the result is empty.`;
    }
    sl.oninput = draw;
    el.append(row(label("usage_threshold =", "datasci-thr"), sl, tv, sOp), h("div", { class: "datasci-two", style: "margin-top:12px" },
      h("div", null, pic, say), h("div", null, arrays, eyebrow("Python"), codeBox, eyebrow("Output"), pr)),
    note("Try 34 with <code>&gt;</code> and then with <code>&gt;=</code>. “Exceeds” in the exam means <code>&gt;</code>: machine 3 (34) does not exceed 34."));
    draw();
  }

  // --- stepper: the Q5 answer, line by line ---
  function q5Steps() {
    const TOT = U.map(r => sum(r));
    const S = [
      { line: 1, now: "Load NumPy as <code>np</code>. The exam gives you this line.", vars: {}, cur: -1, tot: [], mask: null },
      { line: 3, now: "<code>def</code> only <b>defines</b> the function. Its body does not run yet. Python jumps to line 8.", vars: {}, cur: -1, tot: [], mask: null },
      { line: 8, now: "The 4 × 3 matrix: 4 machines (rows), 3 items (columns).", vars: { usage_matrix: "4 × 3 array" }, cur: -1, tot: [], mask: null },
      { line: 9, now: "The threshold is 25.", vars: { usage_matrix: "4 × 3 array", usage_threshold: "25" }, cur: -1, tot: [], mask: null },
      { line: 11, now: "Call the function. Inside it, the parameters get the same values.", cur: -1, tot: [], mask: null },
    ];
    U.forEach((r, i) => {
      S.push({ line: 4, now: `<code>axis=1</code> goes across each row. Machine ${i}: ${r.join(" + ")} = <b>${TOT[i]}</b>.` + (i === 0 ? " (NumPy does all rows at once. Here you see them one by one.)" : ""), cur: i, tot: TOT.slice(0, i + 1), mask: null });
    });
    S.push({ line: 4, now: "One total per machine: <code>[18 39 &nbsp;3 34]</code>, shape (4,).", vars: { usage_threshold: "25", totals: "[18 39 \u00a03 34]" }, cur: -1, tot: TOT, mask: null });
    S.push({ line: 5, now: "Compare every total with 25: 18 &gt; 25 <b>no</b>, 39 &gt; 25 <b>yes</b>, 3 &gt; 25 <b>no</b>, 34 &gt; 25 <b>yes</b>.", vars: { usage_threshold: "25", totals: "[18 39 \u00a03 34]", mask: "[False \u00a0True False \u00a0True]" }, cur: -1, tot: TOT, mask: TOT.map(t => t > 25) });
    S.push({ line: 6, now: "<code>np.where(mask)</code> gives <code>(array([1, 3]),)</code>. <code>[0]</code> takes the array out. <b>return</b> hands <code>[1 3]</code> back.", vars: { usage_threshold: "25", totals: "[18 39 \u00a03 34]", mask: "[False \u00a0True False \u00a0True]" }, cur: -1, tot: TOT, mask: TOT.map(t => t > 25), res: [1, 3] });
    S.push({ line: 11, now: "Back outside. The returned array gets the name <code>result</code>.", vars: { usage_matrix: "4 × 3 array", usage_threshold: "25", result: "[1 3]" }, cur: -1, tot: TOT, mask: TOT.map(t => t > 25), res: [1, 3] });
    S.push({ line: 12, now: "Print it: machines 1 and 3 are high-demand.", print: "[1 3]", cur: -1, tot: TOT, mask: TOT.map(t => t > 25), res: [1, 3] });
    return S;
  }
  function q5Visual(el, st) {
    el.appendChild(grid(U, {
      rowLabels: U.map((_, r) => "machine " + r), colLabels: ["item 0", "item 1", "item 2", ""].slice(0, 3),
      mark: r => (r === st.cur ? "cmp" : st.res && st.res.includes(r) ? "done" : null),
      extraHead: "total",
      extra: r => r < st.tot.length ? h("span", { class: "datasci-chip" + (st.mask ? (st.mask[r] ? " ok" : " no") : "") }, st.tot[r] + (st.mask ? (st.mask[r] ? "  True" : "  False") : "")) : h("span", { class: "muted" }, "·"),
    }));
    if (st.res) el.appendChild(h("div", { style: "margin-top:10px" }, D.array(st.res, { name: "result", index: false, marks: { 0: "done", 1: "done" } })));
  }

  const axisTopic = {
    id: "axis",
    title: "axis= and summaries",
    summary: "<code>np.sum</code>, <code>np.mean</code>, <code>np.median</code> … on one array, and <code>axis=0</code> / <code>axis=1</code> on a table. This is exam Q5.",
    exam: ["Q4 np.sum", "Q5 row totals"],
    sources: "Ex8 M1; Exam Q5",
    blocks: [
      { type: "callout", kind: "exam", title: "Exam Q5 needs axis=, and the course never taught it", html: "<p>Q5 gave a <code>usage_matrix</code> (machines × items) and a threshold of 25, and asked for the machines whose <b>row total</b> exceeds it. That needs <code>np.sum(usage_matrix, axis=1)</code>, then a mask, then <code>np.where</code>. The answer is <code>[1 3]</code>. This page teaches each piece.</p>" },
      { type: "h", text: "Summaries of one array" },
      `<p>Each function squeezes many values into <b>one</b> number. Drag the values and watch the markers.</p>`,
      { type: "widget", render: statsWidget },
      { type: "callout", kind: "tip", title: "Two spellings, same result", html: "<p><code>np.sum(x)</code> and <code>x.sum()</code> do the same. Exam Q4 used <code>np.sum(coins_inserted)</code> to total the coins.</p>" },

      { type: "h", text: "axis=: which way do you add?", sub: "Pick an axis. The arrows show the direction; the green boxes are the result." },
      { type: "table", caption: "usage_matrix has shape (4, 3): 4 machines (rows) × 3 items (columns)", head: ["Code", "Gives", "Direction", "One value per…"], code: [0], rows: [
        ["np.sum(usage_matrix)", "<code>94</code>", "everything", "the whole table"],
        ["np.sum(usage_matrix, axis=0)", "<code>[52 28 14]</code>", "<b>down</b> each column ↓", "item (column)"],
        ["np.sum(usage_matrix, axis=1)", "<code>[18 39 &nbsp;3 34]</code>", "<b>across</b> each row →", "machine (row)"],
      ] },
      { type: "widget", render: axisWidget },
      { type: "callout", kind: "rule", title: "How to remember it", html: "<ul><li><b>The axis you name disappears.</b> Shape <code>(4, 3)</code>: <code>axis=0</code> removes the 4 → <code>(3,)</code>. <code>axis=1</code> removes the 3 → <code>(4,)</code>.</li><li><b>axis=1 → one result per row.</b> Rows are machines here, so per-machine totals are <code>axis=1</code>.</li><li>Check by size: 4 machines need 4 totals. If you get 3 numbers, you used the wrong axis.</li></ul>" },
      { type: "table", caption: "The same idea works for every summary", head: ["Code", "Gives"], code: [0], rows: [
        ["np.mean(usage_matrix, axis=0)", "<code>[13. &nbsp; 7. &nbsp; 3.5]</code>"],
        ["np.max(usage_matrix, axis=1)", "<code>[10 25 &nbsp;2 15]</code>"],
        ["usage_matrix.sum(axis=1)", "<code>[18 39 &nbsp;3 34]</code> (method spelling)"],
      ] },

      { type: "h", text: "From totals to machine numbers", sub: "Totals → mask → np.where. Move the threshold." },
      { type: "widget", render: thresholdWidget },

      { type: "h", text: "The full Q5 answer, line by line" },
      {
        type: "stepper",
        title: "high_demand_machines",
        code: `
          import numpy as np

          def high_demand_machines(usage_matrix, usage_threshold):
              totals = np.sum(usage_matrix, axis=1)    # one total per machine (row)
              mask = totals > usage_threshold          # True where the total is above
              return np.where(mask)[0]                 # positions of the Trues

          usage_matrix = np.array([[10, 5, 3], [25, 10, 4], [2, 1, 0], [15, 12, 7]])
          usage_threshold = 25

          result = high_demand_machines(usage_matrix, usage_threshold)
          print(result)`,
        what: {
          1: "Import NumPy with its short name.",
          3: "Define the function. Two parameters: the matrix and the threshold.",
          4: "Row totals: axis=1 adds across each row.",
          5: "A mask: one True/False per machine.",
          6: "np.where gives the positions of the Trues. [0] unpacks the tuple. return hands them back.",
          8: "The example matrix from the exam.",
          9: "The example threshold.",
          11: "Call the function and keep what it returns.",
          12: "Show the result.",
        },
        steps: q5Steps(),
        visualTitle: "usage_matrix and the totals",
        legend: [["cmp", "row being added"], ["done", "high-demand machine"]],
        visual: q5Visual,
      },
      { type: "switch", label: "Two answers that both work", items: [
        { label: "NumPy only (best)", blocks: [
          () => h("div", { class: "datasci-clip" }, ui.code({ code: `
              def high_demand_machines(usage_matrix, usage_threshold):
                  totals = np.sum(usage_matrix, axis=1)          # [18 39  3 34]
                  return np.where(totals > usage_threshold)[0]   # [1 3]` })),
          "<p class='small'>Exactly what Q5 asked: “use only NumPy operations (np.sum, comparisons, boolean indexing)”.</p>",
        ] },
        { label: "Loop over the rows (fallback)", blocks: [
          () => h("div", { class: "datasci-clip" }, ui.code({ code: `
              def high_demand_machines(usage_matrix, usage_threshold):
                  result = []
                  for i in range(len(usage_matrix)):             # i = machine number
                      if np.sum(usage_matrix[i]) > usage_threshold:
                          result.append(i)                       # keep the machine number

                  return np.array(result)                        # after the loop` })),
          "<p class='small'>Same answer, <code>[1 3]</code>. Use it if you forget <code>axis=</code>, but the NumPy-only version is what the question wanted.</p>",
        ] },
      ] },
      {
        type: "tryit",
        title: "Exam Q5 with an example call",
        task: "Q5 also wanted “a short example showing how to call your function and print the result”. Run it, then change the threshold to 10 and predict the answer first.",
        code: `
          import numpy as np

          def high_demand_machines(usage_matrix, usage_threshold):
              totals = np.sum(usage_matrix, axis=1)    # one total per machine (row)
              mask = totals > usage_threshold          # True where the total is above
              return np.where(mask)[0]                 # positions of the Trues

          ${USAGE_PY.split("\n").join("\n          ")}
          usage_threshold = 25

          print(np.sum(usage_matrix, axis=1))          # check the totals first
          result = high_demand_machines(usage_matrix, usage_threshold)
          print("High-demand machines:", result)`,
        solution: `print(high_demand_machines(usage_matrix, 10))   # [0 1 3]`,
        solutionNote: "Totals 18, 39, 3, 34. Only machine 2 (3) is not above 10.",
      },
      {
        type: "tryit",
        title: "Exercise 8, M1: summaries",
        code: `
          import numpy as np

          x = np.array([2, 4, 4, 6, 9])

          print("mean:", np.mean(x))                   # 5.0
          print("std:", np.std(x))                     # population standard deviation
          print("median:", np.median(x))               # 4.0
          print("min, max:", np.min(x), np.max(x))
          print("75th percentile:", np.percentile(x, 75))   # 6.0`,
      },
      { type: "mistakes", items: [
        { title: "axis=0 when you want one value per machine", wrong: "np.sum(usage_matrix, axis=0)   # [52 28 14]: per item", right: "np.sum(usage_matrix, axis=1)   # [18 39  3 34]: per machine", why: "4 machines need 4 totals. <code>axis=0</code> gives 3 numbers, one per column." },
        { title: "No axis at all", wrong: "totals = np.sum(usage_matrix)   # 94", right: "totals = np.sum(usage_matrix, axis=1)", why: "Without <code>axis</code> NumPy adds <b>everything</b> into one number." },
        { title: "Testing single cells instead of row totals", wrong: "np.where(usage_matrix > 25)", right: "np.where(np.sum(usage_matrix, axis=1) > 25)[0]", why: "That checks each cell on its own. No single cell is above 25, so you get empty arrays." },
        { title: "Returning the mask", wrong: "return totals > usage_threshold   # [False  True False  True]", right: "return np.where(totals > usage_threshold)[0]   # [1 3]", why: "The question asks for the <b>indices</b> of the machines, not True/False." },
        { title: "<code>&gt;=</code> for “exceeds”", wrong: "mask = totals >= usage_threshold", right: "mask = totals > usage_threshold", why: "“Exceeds” and “greater than” mean strictly bigger. A machine with exactly 25 does not count." },
        { title: "print instead of return", wrong: "print(np.where(mask)[0])", right: "return np.where(mask)[0]", why: "The function must give the result back. Print it outside, in the example call." },
      ] },
    ],
    quiz: [
      { type: "predict", q: "What does this print?", code: `import numpy as np\n\n${USAGE_PY}\nprint(np.sum(usage_matrix, axis=0))`, answer: "[52 28 14]",
        hint: "<code>axis=0</code> goes down each column.", explain: "Column 0: 10 + 25 + 2 + 15 = 52. Column 1: 5 + 10 + 1 + 12 = 28. Column 2: 3 + 4 + 0 + 7 = 14." },
      { type: "mc", q: "<code>usage_matrix</code> has one row per machine. Which line gives <b>one total per machine</b>?", options: [
        "<code>np.sum(usage_matrix)</code>", "<code>np.sum(usage_matrix, axis=0)</code>", "<code>np.sum(usage_matrix, axis=1)</code>", "<code>np.sum(usage_matrix[0])</code>"], answer: 2,
        wrong: { 0: "That adds everything: one number, 94.", 1: "That goes down the columns: one total per item.", 3: "That is only machine 0's total." },
        hint: "One result per row means the columns must disappear.", explain: "<code>axis=1</code> goes across each row: <code>[18 39 &nbsp;3 34]</code>." },
      { type: "predict", q: "What does this print?", code: `import numpy as np\n\n${USAGE_PY}\nprint(np.mean(usage_matrix, axis=1).shape)`, answer: "(4,)",
        hint: "Shape (4, 3). Which number disappears with <code>axis=1</code>?", explain: "<code>axis=1</code> removes the column direction (the 3). One mean per machine: shape <code>(4,)</code>." },
      { type: "bug", q: "This returns the wrong machines. Click the <b>two</b> lines with a logic error. (The task: total usage <b>exceeds</b> the threshold.)", code: `
          def high_demand_machines(usage_matrix, usage_threshold):
              totals = np.sum(usage_matrix, axis=0)
              mask = totals >= usage_threshold
              return np.where(mask)[0]`,
        bugs: [2, 3], notes: { 2: "<code>axis=0</code> gives totals per item; machines need <code>axis=1</code>", 3: "“exceeds” means <code>&gt;</code>, not <code>&gt;=</code>" },
        fixed: `
          def high_demand_machines(usage_matrix, usage_threshold):
              totals = np.sum(usage_matrix, axis=1)
              mask = totals > usage_threshold
              return np.where(mask)[0]`,
        hint: "Check the direction of the sum, and what “exceeds” means.", explain: "Neither line crashes: these are <b>logic</b> errors. Python runs happily and gives a wrong answer, so you must read the task closely." },
      { type: "write", q: "Exam Q5. Write <code>high_demand_machines(usage_matrix, usage_threshold)</code>. It <b>returns</b> the indices of the machines (rows) whose total usage is <b>greater than</b> the threshold. Use NumPy only.",
        starter: `
          import numpy as np

          def high_demand_machines(usage_matrix, usage_threshold):
              # 1. one total per machine (row)
              # 2. compare with the threshold
              # 3. return the indices of the Trues
              pass

          usage_matrix = np.array([[10, 5, 3], [25, 10, 4], [2, 1, 0], [15, 12, 7]])
          print(high_demand_machines(usage_matrix, 25))`,
        checks: [
          ["list(high_demand_machines(usage_matrix, 25))", "[1, 3]"],
          ["list(high_demand_machines(usage_matrix, 34))", "[1]"],
          ["list(high_demand_machines(np.array([[1, 2], [30, 1], [5, 5]]), 10))", "[1]"],
          ["list(high_demand_machines(usage_matrix, 100))", "[]"],
        ],
        solution: `
          import numpy as np

          def high_demand_machines(usage_matrix, usage_threshold):
              totals = np.sum(usage_matrix, axis=1)    # [18 39  3 34]
              mask = totals > usage_threshold          # [False  True False  True]
              return np.where(mask)[0]                 # [1 3]

          usage_matrix = np.array([[10, 5, 3], [25, 10, 4], [2, 1, 0], [15, 12, 7]])
          print(high_demand_machines(usage_matrix, 25))   # [1 3]`,
        hint: "<code>np.sum(..., axis=1)</code>, then <code>&gt;</code>, then <code>np.where(...)[0]</code>.",
        explain: "The check with threshold 34 catches <code>&gt;=</code> (machine 3 has exactly 34). The empty case checks that you return an array even when nothing passes." },
      { type: "explain", q: "In 3–4 sentences, explain what <code>axis=1</code> does in <code>np.sum(usage_matrix, axis=1)</code> and why Q5 needs it.",
        answer: "<p><code>usage_matrix</code> has one row per machine and one column per item, shape (4, 3). <code>axis=1</code> tells NumPy to add <b>across each row</b>, so the columns disappear and we get one total per machine: <code>[18 39 &nbsp;3 34]</code>, shape (4,). Q5 compares each machine's total with the threshold, so it needs exactly one number per machine. Without <code>axis</code> we would get one number for the whole table (94), and with <code>axis=0</code> one total per item.</p>",
        points: ["axis=1 adds across each row", "rows are machines, so one total per machine", "result shape (4,)", "no axis → 94, axis=0 → per item"],
        hint: "Say what the rows are, which direction axis=1 goes, and what shape comes out." },
    ],
  };

  /* ================================================================
     TOPIC 4: Pandas Series & DataFrames
     ================================================================ */

  // --- widget: the parts of a DataFrame ---
  const DF_PARTS = [
    ["index", "Index (row labels)", "print(sales.index)", "RangeIndex(start=0, stop=12, step=1)", "The labels of the rows. If you do not choose any, Pandas numbers them 0, 1, 2, …"],
    ["columns", "Column labels", "print(sales.columns)", "Index(['order_id', 'region', 'product', 'units', 'unit_price', 'rating'], dtype='object')", "The names of the columns. You pick a column by its name."],
    ["column", "One column", "print(sales['units'].head())", "0    10\n1    15\n2     8\n3    12\n4    20\nName: units, dtype: int64", "One column is a <b>Series</b>: values plus the row labels on the left."],
    ["row", "One row", "print(sales.loc[1])", "order_id        102\nregion        South\nproduct           A\nunits            15\nunit_price       25\nrating          4.5\nName: 1, dtype: object", "One row is also a Series. Now the column names are its labels."],
    ["cell", "One value", "print(sales.loc[1, 'units'])", "15", "Row label, then column name."],
    ["shape", "Shape", "print(sales.shape)", "(12, 6)", "12 rows, 6 columns. Like NumPy: rows first, and no brackets after <code>shape</code>."],
  ];
  function dfPartsWidget(el) {
    let part = "column";
    const s = seg(DF_PARTS.map(p => [p[0], p[1]]), v => { part = v; draw(); }, "Part of the table");
    const pic = h("div"), codeBox = h("div"), pr = outBox(""), say = h("p", { style: "margin:8px 0 0" });
    function draw() {
      s.sync(part);
      const P = DF_PARTS.find(p => p[0] === part);
      pic.replaceChildren(dfTable({
        cols: SALES_COLS, rows: SALES.slice(0, 5).map(salesRow),
        headClass: c => (part === "columns" && c !== "__index") || (part === "column" && c === "units") ? "datasci-hl" : "",
        cellClass: (i, c) => {
          if (part === "shape") return "datasci-hl";
          if (part === "index") return c === "__index" ? "datasci-hl" : "";
          if (part === "column") return c === "units" ? "datasci-hl" : "";
          if (part === "row") return i === 1 ? "datasci-hl" : "";
          if (part === "cell") return i === 1 && c === "units" ? "datasci-hl" : "";
          return "";
        },
      }));
      codeBox.replaceChildren(ui.code({ code: [P[2]], nonum: true }));
      pr.textContent = P[3];
      say.innerHTML = P[4];
    }
    el.append(s, h("div", { style: "margin-top:12px" }, pic), h("p", { class: "small muted", style: "margin:4px 0 0" }, "The first 5 of the 12 rows."),
      h("div", { class: "datasci-two", style: "margin-top:10px" }, h("div", null, codeBox, say), h("div", null, eyebrow("Output", 0), pr)));
    draw();
  }

  // --- widget: Series maths lines up by label ---
  function alignWidget(el) {
    let mode = "plus";
    const s = seg([["plus", "s1 + s2"], ["fill", "s1.add(s2, fill_value=0)"]], v => { mode = v; draw(); }, "Operation");
    const pic = h("div"), pr = outBox(""), codeBox = h("div"), say = h("p", { style: "margin:8px 0 0" });
    const L = ["a", "b", "c", "d"], A = { a: 1, b: 2, c: 3 }, B = { b: 10, c: 20, d: 30 };
    function draw() {
      s.sync(mode);
      const res = L.map(k => (k in A && k in B ? A[k] + B[k] : mode === "fill" ? (A[k] || 0) + (B[k] || 0) : null));
      const col = (title, get, cls) => h("div", { class: "datasci-series" }, h("div", { class: "datasci-gl" }, title),
        L.map((k, i) => { const v = get(k, i); return h("div", { class: "datasci-srow" }, h("span", { class: "datasci-gl" }, k), h("span", { class: "datasci-cell " + (v == null ? "mk-gap" : cls(v)) }, v == null ? "—" : String(v))); }));
      pic.replaceChildren(h("div", { class: "datasci-align" },
        col("s1", k => A[k], () => ""), h("span", { class: "datasci-op" }, "+"), col("s2", k => B[k], () => ""), h("span", { class: "datasci-op" }, "="),
        col("result", (k, i) => (res[i] == null ? "NaN" : res[i].toFixed(1)), v => (v === "NaN" ? "mk-swap" : "mk-done"))));
      codeBox.replaceChildren(ui.code({ code: ["s1 = pd.Series([1, 2, 3], index=['a', 'b', 'c'])", "s2 = pd.Series([10, 20, 30], index=['b', 'c', 'd'])", "print(" + (mode === "plus" ? "s1 + s2" : "s1.add(s2, fill_value=0)") + ")"], active: [3] }));
      pr.textContent = L.map((k, i) => k + (res[i] == null ? "     NaN" : res[i].toFixed(1).padStart(8))).join("\n") + "\ndtype: float64";
      say.innerHTML = mode === "plus" ? "Pandas matches the <b>labels</b>, not the positions. <code>a</code> is only in s1 and <code>d</code> only in s2, so they get <b>NaN</b> (missing). One NaN turns the whole result into floats."
        : "<code>fill_value=0</code> treats a missing partner as 0, so <code>a</code> is 1 + 0 and <code>d</code> is 0 + 30.";
    }
    el.append(s, h("div", { class: "datasci-two", style: "margin-top:12px" }, h("div", null, pic, say), h("div", null, codeBox, eyebrow("Output"), pr)));
    draw();
  }

  const pandasBasics = {
    id: "pandas",
    title: "Pandas Series & DataFrames",
    summary: "A DataFrame is a table with labels. Rows are observations, columns are variables. Look at it with <code>head</code>, <code>shape</code>, <code>dtypes</code>, <code>isna().sum()</code>.",
    sources: "Ex8 E3",
    blocks: [
      { type: "callout", kind: "note", title: "Pandas runs in the Try-it boxes", html: "<p>The Try-it boxes on the Pandas pages run real pandas (version 2.2). The first Run downloads it, so it takes a few seconds longer. Last year's exam used NumPy only, but Pandas is core course content (Exercise 8).</p>" },
      { type: "h", text: "Why Pandas?" },
      { type: "table", head: ["", "NumPy array", "Pandas DataFrame"], rows: [
        ["Rows and columns have…", "positions only (0, 1, 2)", "<b>labels</b> too (<code>'units'</code>, <code>103</code>)"],
        ["Types", "one type for everything", "each column its own type (text, int, float)"],
        ["Missing values", "awkward", "built in: <code>NaN</code>"],
        ["Good for", "fast maths on numbers", "real tables: load, clean, filter, group"],
      ] },
      { type: "h", text: "Series, DataFrame, Index" },
      { type: "table", head: ["Thing", "Tiny example", "What it is"], code: [1], rows: [
        ["Series", "pd.Series([4.2, 4.5], index=['a', 'b'])", "<b>one</b> labelled column"],
        ["DataFrame", "pd.DataFrame({'units': [10, 15], 'rating': [4.2, 4.5]})", "a table: several Series that share the row labels"],
        ["Index", "sales.index", "the row labels"],
      ] },
      { type: "code", caption: "The Exercise 8 data. A dict: each key becomes a column", code: SALES_PY },
      { type: "h", text: "The parts of a table", sub: "Pick a part. It lights up, and you see the code that gets it." },
      { type: "widget", render: dfPartsWidget },

      { type: "h", text: "First look: inspect before you analyse" },
      { type: "table", caption: "Exercise 8, E3", head: ["Code", "Gives"], code: [0], rows: [
        ["sales.head()", "the first 5 rows (<code>head(3)</code> for 3)"],
        ["sales.shape", "<code>(12, 6)</code>"],
        ["sales.dtypes", "<code>order_id int64</code>, <code>region object</code> (text), <code>units int64</code>, <code>rating float64</code> …"],
        ["sales.isna().sum()", "missing values per column: 0 everywhere, <b>rating 2</b>"],
        ["sales['units'].describe()", "count 12, mean 13.0, min 8, median (50%) 12.5, max 20 …"],
        ["pd.read_csv('file.csv')", "loads a CSV file into a DataFrame (in Jupyter)"],
      ] },
      { type: "h", text: "Columns: one bracket or two" },
      { type: "table", head: ["Code", "Gives", "Why"], code: [0], rows: [
        ["sales['units']", "a <b>Series</b>", "one name → one column"],
        ["sales[['region', 'units']]", "a <b>DataFrame</b>", "a <b>list</b> of names inside the brackets"],
        ["sales['region', 'units']", "<span class='bad'>KeyError: ('region', 'units')</span>", "Pandas looks for one column called <code>('region', 'units')</code>"],
      ] },

      { type: "h", text: "Series maths lines up by label", sub: "Labels, not positions, decide who is added to whom." },
      { type: "widget", render: alignWidget },
      {
        type: "tryit",
        title: "Exercise 8, E3: inspect the table",
        task: "Run it (the first run loads pandas). Then print only the <code>region</code> and <code>units</code> columns.",
        code: withSales(`
          print(sales.head())            # first 5 rows
          print(sales.shape)             # (rows, columns)
          print(sales.dtypes)            # the type of each column
          print(sales.isna().sum())      # missing values per column`),
        solution: `print(sales[['region', 'units']])     # a list of names → a DataFrame`,
      },
      { type: "mistakes", items: [
        { title: "Two columns with one pair of brackets", wrong: "sales['region', 'units']", right: "sales[['region', 'units']]", why: "Several columns need a <b>list</b> inside: KeyError <code>('region', 'units')</code>." },
        { title: "Calling shape", wrong: "sales.shape()", right: "sales.shape", why: "<code>shape</code> is a tuple, not a function: <code>'tuple' object is not callable</code>." },
        { title: "Wrong capital letters", wrong: "sales['Units']", right: "sales['units']", why: "Column names must match exactly. KeyError: <code>'Units'</code>." },
        { title: "<code>pd.dataframe</code>", wrong: "pd.dataframe({'a': [1]})", right: "pd.DataFrame({'a': [1]})", why: "Capital D and F. AttributeError: <code>module 'pandas' has no attribute 'dataframe'</code>." },
        { title: "Forgetting the import", wrong: "sales = pd.DataFrame({...})", right: "import pandas as pd\nsales = pd.DataFrame({...})", why: "NameError: <code>name 'pd' is not defined</code>." },
      ] },
    ],
    quiz: [
      { type: "predict", tryit: false, q: "With the Exercise 8 <code>sales</code> table, what does this print?", code: "print(sales.shape)", answer: "(12, 6)",
        hint: "12 orders. Count the columns: order_id, region, product, units, unit_price, rating.", explain: "12 rows and 6 columns, rows first." },
      { type: "mc", q: "What is <code>sales['units']</code>?", options: ["a list", "a NumPy array", "a Series", "a DataFrame"], answer: 2,
        hint: "One column, with labels.", explain: "One column is a Series: the values plus the row labels." },
      { type: "mc", q: "What is <code>sales[['units']]</code> (two brackets)?", options: ["a Series", "a DataFrame with one column", "a KeyError", "a list"], answer: 1,
        hint: "The inner brackets make a list of column names.", explain: "A list of names always gives a DataFrame, even with one name in it." },
      { type: "predict", q: "What does this print?", code: "import pandas as pd\n\ns1 = pd.Series([1, 2], index=['a', 'b'])\ns2 = pd.Series([10, 20], index=['b', 'c'])\nprint((s1 + s2)['b'])", answer: "12.0",
        hint: "Which values have the label <code>b</code>? Why might the result be a float?", explain: "<code>b</code> is 2 in s1 and 10 in s2: 12. The labels <code>a</code> and <code>c</code> have no partner and become NaN, and NaN makes the whole Series float, so 12.0." },
      { type: "mc", q: "Why is <code>sales.dtypes</code> for <code>rating</code> <code>float64</code>?", options: ["ratings like 4.2 have decimals, and NaN is a float too", "Pandas makes every column float", "because of <code>unit_price</code>", "it is an error"], answer: 0,
        hint: "What kind of numbers are 4.2 and NaN?", explain: "Ratings have decimals, and NaN (missing) is a float value. Even a whole-number column becomes float once it has a NaN." },
      { type: "write", q: "Write <code>total_units(df)</code>. It <b>returns</b> the sum of the <code>units</code> column.",
        starter: withSales(`
          def total_units(df):
              pass

          print(total_units(sales))`),
        checks: [["int(total_units(sales))", "156"], ["int(total_units(pd.DataFrame({'units': [1, 2, 3]})))", "6"]],
        solution: `
          def total_units(df):
              return df['units'].sum()    # one column, then .sum()`,
        hint: "Pick the column with <code>df['units']</code>, then call <code>.sum()</code>.",
        explain: "Use the parameter <code>df</code>, not the global <code>sales</code>, so the function works for any table." },
    ],
  };

  /* ================================================================
     TOPIC 5: Filtering, loc & iloc
     ================================================================ */
  const NUM_COLS = ["units", "unit_price", "rating"], TXT_COLS = ["region", "product"];
  const distinct = col => [...new Set(SALES.map(r => r[col]).filter(v => v != null))].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
  const pyLit = v => (typeof v === "string" ? "'" + v + "'" : String(v));
  const testRow = (r, c) => { const v = r[c.col]; if (v == null) return c.op === "!="; return OPS[c.op](v, c.val); };   // NaN: only != is True

  function filterWidget(el) {
    const mk = (n, col, op, val) => {
      const cs = select("datasci-f-col" + n, [...TXT_COLS, ...NUM_COLS].map(c => [c, c]), col);
      const os = select("datasci-f-op" + n, [], op), vs = select("datasci-f-val" + n, [], val);
      return { cs, os, vs, col, op, val };
    };
    const A = mk(1, "units", ">", 12), B = mk(2, "rating", ">=", 4.3);
    let join = "off";
    const j = seg([["off", "one condition"], ["&", "& (and)"], ["|", "| (or)"]], v => { join = v; draw(); }, "Second condition");
    const lineB = row(label("and/or", "datasci-f-col2"), B.cs, B.os, B.vs);
    const pic = h("div"), codeBox = h("div"), say = h("p", { style: "margin:8px 0 0" });
    function sync(c) {
      c.col = c.cs.value;
      const num = NUM_COLS.includes(c.col);
      const ops = num ? Object.keys(OPS) : ["==", "!="];
      const vals = distinct(c.col);
      const op = ops.includes(c.os.value) ? c.os.value : ops[0];
      setOptions(c.os, ops.map(o => [o, o]), op);
      const want = vals.map(String).includes(c.vs.value) ? c.vs.value : String(c.val != null && vals.map(String).includes(String(c.val)) ? c.val : vals[Math.floor(vals.length / 2)]);
      setOptions(c.vs, vals.map(v => [v, pyLit(v)]), want);
      c.op = op; c.val = num ? +want : want;
    }
    function draw() {
      sync(A); sync(B); j.sync(join);
      lineB.hidden = join === "off";
      const m1 = SALES.map(r => testRow(r, A)), m2 = SALES.map(r => testRow(r, B));
      const mask = SALES.map((_, i) => (join === "off" ? m1[i] : join === "&" ? m1[i] && m2[i] : m1[i] || m2[i]));
      pic.replaceChildren(dfTable({
        cols: SALES_COLS, rows: SALES.map(salesRow),
        rowClass: i => (mask[i] ? "datasci-keep" : "datasci-drop"),
        headClass: c => (c === A.col || (join !== "off" && c === B.col) ? "datasci-hl" : ""),
        extra: { head: "mask", cell: i => h("span", { class: "datasci-bool " + (mask[i] ? "t" : "f") }, pyb(mask[i])) },
      }));
      const cond = c => `sales['${c.col}'] ${c.op} ${pyLit(c.val)}`;
      const src = join === "off" ? `sales[${cond(A)}]` : `sales[(${cond(A)}) ${join} (${cond(B)})]`;
      codeBox.replaceChildren(ui.code({ code: ["result = " + src, "print(len(result))"], nonum: true }));
      const n = mask.filter(Boolean).length;
      const nanHit = [A, join !== "off" ? B : null].some(c => c && c.col === "rating");
      say.innerHTML = `<b>${n}</b> of 12 rows kept` + (n ? ": orders " + SALES.filter((_, i) => mask[i]).map(r => r.order_id).join(", ") + "." : ".") +
        (nanHit ? " <span class='muted'>Orders 103 and 108 have no rating (NaN). A NaN never passes <code>&gt;</code>, <code>&lt;</code> or <code>==</code>; only <code>!=</code> is True for it.</span>" : "");
    }
    [A, B].forEach(c => [c.cs, c.os, c.vs].forEach(x => (x.onchange = draw)));
    el.append(row(label("Keep rows where", "datasci-f-col1"), A.cs, A.os, A.vs), h("div", { style: "margin-top:8px" }, j), h("div", { style: "margin-top:8px" }, lineB),
      h("div", { style: "margin-top:10px" }, codeBox), say, h("div", { style: "margin-top:10px" }, pic));
    draw();
  }

  // --- widget: loc vs iloc ---
  const SI_COLS = ["region", "product", "units", "unit_price", "rating"];
  function locWidget(el) {
    let mode = "loc";
    const st = { r0: 2, r1: 5, c0: 0, c1: 2 };
    const sm = seg([["loc", "pick by labels (loc)"], ["iloc", "pick by positions (iloc)"]], v => { mode = v; draw(); }, "Mode");
    const sels = {
      r0: select("datasci-l-r0", [], 0), r1: select("datasci-l-r1", [], 0),
      c0: select("datasci-l-c0", [], 0), c1: select("datasci-l-c1", [], 0),
    };
    const pic = h("div"), codeBox = h("div"), say = h("p", { style: "margin:8px 0 0" });
    function draw() {
      sm.sync(mode);
      const L = mode === "loc";
      setOptions(sels.r0, SALES.map((r, i) => [i, L ? String(r.order_id) : String(i)]), st.r0);
      setOptions(sels.r1, SALES.map((r, i) => [i, L ? String(r.order_id) : String(i)]), st.r1);
      setOptions(sels.c0, SI_COLS.map((c, i) => [i, L ? "'" + c + "'" : String(i)]), st.c0);
      setOptions(sels.c1, SI_COLS.map((c, i) => [i, L ? "'" + c + "'" : String(i)]), st.c1);
      const inR = i => i >= st.r0 && i <= st.r1, inC = j => j >= st.c0 && j <= st.c1;
      pic.replaceChildren(dfTable({
        cols: SI_COLS, rows: SALES.map(salesRow), index: SALES.map(r => r.order_id), indexName: "order_id", posRow: true, posCol: true,
        headClass: c => (inC(SI_COLS.indexOf(c)) ? "datasci-hl" : ""),
        cellClass: (i, c) => (c === "__index" ? (inR(i) ? "datasci-hl" : "") : inR(i) && inC(SI_COLS.indexOf(c)) ? "datasci-sel" : ""),
      }));
      const locSrc = `sales_indexed.loc[${SALES[st.r0].order_id}:${SALES[st.r1].order_id}, '${SI_COLS[st.c0]}':'${SI_COLS[st.c1]}']`;
      const ilocSrc = `sales_indexed.iloc[${st.r0}:${st.r1 + 1}, ${st.c0}:${st.c1 + 1}]`;
      codeBox.replaceChildren(ui.code({ code: L ? [locSrc + "    # labels", ilocSrc + "    # the same cells"] : [ilocSrc + "    # positions", locSrc + "    # the same cells"], active: [1], nonum: true }));
      const nr = st.r1 - st.r0 + 1, nc = st.c1 - st.c0 + 1;
      say.innerHTML = `${nr} row${nr > 1 ? "s" : ""} × ${nc} column${nc > 1 ? "s" : ""}. ` +
        `<b>loc</b> goes from label ${SALES[st.r0].order_id} to ${SALES[st.r1].order_id} with <b>both ends included</b>. ` +
        `<b>iloc</b> goes from position ${st.r0} up to ${st.r1 + 1}, and ${st.r1 + 1} is <b>not included</b> (like <code>range</code> and list slices).`;
    }
    Object.entries(sels).forEach(([k, s]) => (s.onchange = () => {
      st[k] = +s.value;
      if (st.r1 < st.r0) { if (k === "r0") st.r1 = st.r0; else st.r0 = st.r1; }
      if (st.c1 < st.c0) { if (k === "c0") st.c1 = st.c0; else st.c0 = st.c1; }
      draw();
    }));
    el.append(sm,
      h("div", { class: "datasci-locctl" },
        row(label("rows from", "datasci-l-r0"), sels.r0, label("to", "datasci-l-r1"), sels.r1),
        row(label("columns from", "datasci-l-c0"), sels.c0, label("to", "datasci-l-c1"), sels.c1)),
      codeBox, say, h("div", { style: "margin-top:10px" }, pic),
      note("Each row shows its label (order_id) and, after #, its position. The top row of the header shows the column positions."));
    draw();
  }

  const filterLoc = {
    id: "filter-loc",
    title: "Filtering, loc & iloc",
    summary: "Keep rows with a True/False mask, just like NumPy. Pick rows and columns by <b>label</b> with <code>loc</code> or by <b>position</b> with <code>iloc</code>.",
    sources: "Ex8 E4, M3",
    blocks: [
      { type: "h", text: "Filter rows with a mask" },
      `<p>Same idea as a NumPy mask. <code>sales['units'] &gt; 12</code> gives one True/False per row. Put it inside <code>sales[...]</code> to keep the True rows.</p>`,
      { type: "table", caption: "Exercise 8, E4", head: ["Code", "Rows kept"], code: [0], rows: [
        ["sales[sales['units'] > 12]", "6: orders 102, 105, 107, 109, 110, 111"],
        ["sales[sales['region'] == 'South']", "4: orders 102, 105, 108, 111"],
        ["sales[(sales['region'] == 'South') & (sales['rating'] >= 4.3)]", "3: orders 102, 105, 111 (108 has no rating)"],
      ] },
      { type: "h", text: "Build a filter", sub: "Choose a column, a test and a value. Kept rows stay bright." },
      { type: "widget", render: filterWidget },
      { type: "callout", kind: "rule", title: "Same rules as NumPy", html: "<p><code>&</code> for and, <code>|</code> for or, <code>~</code> for not, and brackets around each test. <code>and</code>/<code>or</code> give a ValueError.</p>" },

      { type: "h", text: "loc vs iloc: labels vs positions" },
      { type: "code", code: `
          sales_indexed = sales.set_index('order_id')   # order_id becomes the row labels

          by_label = sales_indexed.loc[103:106, 'region':'units']   # labels, end INCLUDED
          by_position = sales_indexed.iloc[0:3, 0:3]                # positions, end EXCLUDED` },
      { type: "table", head: ["", "<code>loc</code>", "<code>iloc</code>"], rows: [
        ["picks by", "<b>labels</b>: <code>103</code>, <code>'units'</code>", "<b>positions</b>: 0, 1, 2 …"],
        ["end of a slice", "<b>included</b>: <code>103:106</code> → 4 rows", "<b>excluded</b>: <code>2:6</code> → positions 2, 3, 4, 5"],
        ["one row", "<code>sales_indexed.loc[103]</code>", "<code>sales_indexed.iloc[2]</code> (the same row)"],
        ["think of", "a dictionary lookup", "list slicing"],
      ] },
      { type: "widget", title: "Pick the same cells two ways", render: locWidget },
      { type: "callout", kind: "warn", title: "After a filter, labels have gaps", html: "<p><code>high = sales[sales['units'] &gt; 12]</code> keeps the labels 1, 4, 6, 8, 9, 10. So <code>high.loc[0]</code> is a <b>KeyError: 0</b> (no row is labelled 0), but <code>high.iloc[0]</code> gives the first kept row (order 102).</p>" },
      {
        type: "tryit",
        title: "Exercise 8, E4 and M3",
        task: "Run it. Then filter for orders from the <b>West</b> with at least 10 units.",
        code: withSales(`
          high_units = sales[sales['units'] > 12]                    # E4
          print(high_units)

          south = sales[(sales['region'] == 'South') & (sales['rating'] >= 4.3)]
          print(south)

          sales_indexed = sales.set_index('order_id')                # M3
          print(sales_indexed.loc[103:106, 'region':'units'])        # labels, end included
          print(sales_indexed.iloc[0:3, 0:3])                        # positions, end excluded`),
        solution: `print(sales[(sales['region'] == 'West') & (sales['units'] >= 10)])   # orders 104, 109, 112`,
      },
      { type: "mistakes", items: [
        { title: "<code>and</code> between two tests", wrong: "sales[(sales['units'] > 12) and (sales['rating'] > 4)]", right: "sales[(sales['units'] > 12) & (sales['rating'] > 4)]", why: "ValueError: <code>The truth value of a Series is ambiguous</code>." },
        { title: "No brackets around the tests", wrong: "sales[sales['units'] > 12 & sales['rating'] > 4]", right: "sales[(sales['units'] > 12) & (sales['rating'] > 4)]", why: "<code>&</code> runs first, on <code>12 & sales['rating']</code>: TypeError <code>Cannot perform 'rand_' with a dtyped [float64] array and scalar of type [bool]</code>." },
        { title: "<code>=</code> instead of <code>==</code>", wrong: "sales[sales['region'] = 'South']", right: "sales[sales['region'] == 'South']", why: "<code>=</code> stores a value. SyntaxError." },
        { title: "A label given to iloc", wrong: "sales_indexed.iloc[103]", right: "sales_indexed.loc[103]", why: "There is no position 103 (only 0–11). IndexError: <code>single positional indexer is out-of-bounds</code>." },
        { title: "Expecting loc to stop before the end", wrong: "sales_indexed.loc[103:106]   # 3 rows?", right: "sales_indexed.loc[103:106]   # 4 rows: 106 is included", why: "Only <code>iloc</code> (and normal Python slicing) leaves the end out." },
      ] },
    ],
    quiz: [
      { type: "predict", tryit: false, q: "What does this print?", code: "print(len(sales[sales['units'] > 12]))", answer: "6",
        hint: "Units: 10, 15, 8, 12, 20, 9, 14, 11, 18, 13, 16, 10. Which are above 12?", explain: "15, 20, 14, 18, 13 and 16: six rows. 12 itself is not &gt; 12." },
      { type: "mc", q: "How many rows does <code>sales_indexed.loc[103:106]</code> give?", options: ["3", "4", "6", "a KeyError"], answer: 1,
        hint: "<code>loc</code> uses labels and includes the end.", explain: "103, 104, 105 and 106: four rows. The end label is included." },
      { type: "mc", q: "Which rows does <code>sales_indexed.iloc[2:6]</code> give? (Order 101 is at position 0.)", options: ["orders 102 to 106", "orders 103 to 106", "orders 103 to 107", "orders 102 to 105"], answer: 1,
        hint: "Positions 2, 3, 4, 5. Position 0 is order 101.", explain: "Position 2 is order 103, and the end (6) is left out, so 103, 104, 105, 106. The same rows as <code>loc[103:106]</code>." },
      { type: "mc", q: "Which line gives the first 3 rows and the first 3 columns <b>by position</b>?", options: ["<code>sales_indexed.loc[0:3, 0:3]</code>", "<code>sales_indexed.iloc[0:3, 0:3]</code>", "<code>sales_indexed.iloc[1:3, 1:3]</code>", "<code>sales_indexed.iloc[0:2, 0:2]</code>"], answer: 1,
        wrong: { 0: "loc wants labels; there is no row labelled 0 here.", 2: "Positions start at 0.", 3: "The end is excluded, so 0:2 is only 2 rows." },
        hint: "Positions → iloc. The end is excluded.", explain: "Exercise 8, M3: <code>iloc[0:3, 0:3]</code> → orders 101–103, columns region, product, units." },
      { type: "bug", q: "Click <b>every</b> line that would crash.", code: `
          south = sales[sales['region'] == 'South']
          good = sales[sales['rating'] >= 4.3 and sales['units'] > 12]
          first = south.loc[0]
          print(good, first)`,
        bugs: [2, 3], notes: { 2: "<code>and</code> on Series: ValueError. Use <code>(…) & (…)</code>", 3: "south keeps labels 1, 4, 7, 10: <code>loc[0]</code> is a KeyError. Use <code>iloc[0]</code>" },
        fixed: `
          south = sales[sales['region'] == 'South']
          good = sales[(sales['rating'] >= 4.3) & (sales['units'] > 12)]
          first = south.iloc[0]
          print(good, first)`,
        hint: "One line uses a word that does not work on whole columns. One line asks for a label that the filter removed.", explain: "Both are runtime errors: Python only finds them when it runs that line." },
      { type: "write", q: "Write <code>south_orders(df)</code>. It <b>returns</b> only the rows where <code>region</code> is <code>'South'</code>.",
        starter: withSales(`
          def south_orders(df):
              pass

          print(south_orders(sales))`),
        checks: [["list(south_orders(sales)['order_id'])", "[102, 105, 108, 111]"], ["len(south_orders(sales))", "4"]],
        solution: `
          def south_orders(df):
              return df[df['region'] == 'South']    # the mask inside df[...]`,
        hint: "Mask: <code>df['region'] == 'South'</code>. Then put it inside <code>df[...]</code>.",
        explain: "Use <code>df</code> both times: inside and outside the brackets." },
    ],
  };

  /* ================================================================
     TOPIC 6: Missing data
     ================================================================ */
  const RATINGS = SALES.map(r => r.rating);
  const MISS = {
    keep: { label: "leave the NaN", code: ["print(sales['rating'].mean())          # mean skips NaN"], out: "4.25", rows: 12, mean: 4.25, say: "<code>mean()</code> simply skips the NaN: it averages the 10 real ratings." },
    drop: { label: "dropna", code: ["sales_complete = sales.dropna(subset=['rating'])", "print(sales_complete.shape)", "print(sales_complete['rating'].mean())"], out: "(10, 6)\n4.25", rows: 10, mean: 4.25, say: "The 2 rows without a rating are removed. You lose those orders (their units and region too)." },
    zero: { label: "fillna(0)", code: ["filled = sales['rating'].fillna(0)", "print(round(filled.mean(), 2))"], out: "3.54", rows: 12, mean: 3.5416666666666665, say: "<b>Bad idea.</b> 0 means “terrible”, not “unknown”. It drags the mean from 4.25 to 3.54, far below every real rating (3.8 to 4.7)." },
    median: { label: "fillna(median)", code: ["median_rating = sales['rating'].median()     # 4.25", "filled = sales['rating'].fillna(median_rating)", "print(filled.mean())"], out: "4.25", rows: 12, mean: 4.25, say: "A typical value, inside the real range, so the mean is not distorted. This is what Exercise 8, M4 asked for. (Here mean and median happen to both be 4.25.)" },
  };
  function missingWidget(el) {
    let mode = "keep";
    const s = seg(Object.keys(MISS).map(k => [k, MISS[k].label]), v => { mode = v; draw(); }, "What to do with NaN");
    const cells = h("div"), pic = h("div"), codeBox = h("div"), pr = outBox(""), say = h("p", { style: "margin:8px 0 0" }), stat = h("p", { class: "datasci-stat" });
    function draw() {
      s.sync(mode);
      const M = MISS[mode];
      const vals = RATINGS.map(v => (v != null ? pyFloat(v) : mode === "zero" ? "0.0" : mode === "median" ? "4.25" : mode === "drop" ? "gone" : "NaN"));
      const marks = {};
      RATINGS.forEach((v, i) => { if (v == null) marks[i] = mode === "keep" ? "swap" : mode === "drop" ? "gap" : mode === "zero" ? "bad" : "done"; });
      cells.replaceChildren(D.array(vals, { name: "rating", marks }));
      const S = D.svg({ w: 440, h: 92, label: "ratings on a number line with the mean" });
      const X = v => 30 + (v / 5) * 380;
      S.line(X(0), 60, X(5), 60);
      [0, 1, 2, 3, 4, 5].forEach(v => { S.line(X(v), 60, X(v), 65); S.text(X(v), 77, String(v), { muted: true }); });
      const used = RATINGS.map(v => (v != null ? v : mode === "zero" ? 0 : mode === "median" ? 4.25 : null)).filter(v => v != null);
      const seen = {};
      used.forEach(v => { const key = Math.round(X(v) / 9), k = (seen[key] = (seen[key] || 0) + 1) - 1; S.circle(X(v), 52 - 9 * k, 4, { tone: "muted", cls: "datasci-dot" }); });
      S.line(X(M.mean), 10, X(M.mean), 60, { tone: mode === "zero" ? "swap" : "accent", cls: "datasci-mark" });
      S.text(X(M.mean) + (mode === "zero" ? -6 : 6), 8, "mean " + (+M.mean.toFixed(2)), { anchor: mode === "zero" ? "end" : "start", ui: true, small: true });
      pic.replaceChildren(S.el);
      codeBox.replaceChildren(ui.code({ code: M.code }));
      pr.textContent = M.out;
      stat.innerHTML = `rows: <b>${M.rows}</b> &nbsp; mean rating: <b>${+M.mean.toFixed(2)}</b>`;
      say.innerHTML = M.say;
    }
    el.append(s, h("div", { class: "datasci-blinkwrap", style: "margin-top:12px" }, cells), stat, pic, say,
      h("div", { style: "margin-top:10px" }, codeBox), eyebrow("Output"), pr);
    draw();
  }

  const missing = {
    id: "missing",
    title: "Missing data",
    summary: "<code>NaN</code> means “no value here”. Find it with <code>isna()</code>, then drop it with <code>dropna</code> or fill it with <code>fillna</code>, usually with the median, not 0.",
    sources: "Ex8 M4",
    blocks: [
      { type: "h", text: "NaN: “no value here”" },
      `<p>Two orders (103 and 108) have no rating. Pandas shows <code>NaN</code> (“not a number”). Most functions skip it.</p>`,
      { type: "table", head: ["Code", "Gives", "In words"], code: [0], rows: [
        ["sales['rating'].isna()", "True for rows 2 and 7", "is it missing? (also called <code>isnull()</code>)"],
        ["sales['rating'].notna()", "the opposite", "is it there? (also <code>notnull()</code>)"],
        ["sales.isna().sum()", "<code>rating 2</code>, all others 0", "how many missing per column"],
        ["sales['rating'].count()", "<code>10</code>", "count skips NaN"],
        ["sales['rating'].mean()", "<code>4.25</code>", "the mean of the 10 real ratings"],
      ] },
      { type: "callout", kind: "warn", title: "Never test with == np.nan", html: "<p><code>np.nan == np.nan</code> is <b>False</b>. So <code>sales['rating'] == np.nan</code> finds nothing. Always use <code>.isna()</code>.</p>" },
      { type: "h", text: "Drop or fill?", sub: "Choose a fix. Watch the row count and the mean." },
      { type: "widget", render: missingWidget },
      { type: "table", head: ["Code", "Rows after", "Use when"], code: [0], rows: [
        ["sales.dropna()", "10", "drop rows with a NaN in <b>any</b> column"],
        ["sales.dropna(subset=['rating'])", "10", "only look at the <code>rating</code> column"],
        ["sales['rating'].fillna(0)", "12", "almost never: 0 is a real (very bad) rating"],
        ["sales['rating'].fillna(sales['rating'].median())", "12", "keep every row with a typical value"],
      ] },
      { type: "callout", kind: "tip", title: "Exercise 8, M4: why the median and not 0?", html: "<p>A missing rating is <b>unknown</b>, not terrible. Filling with 0 treats it as the worst possible rating and pulls the mean from 4.25 to 3.54, below every real rating. The median is a typical value from the data, and an extreme value does not move it.</p>" },
      {
        type: "tryit",
        title: "Exercise 8, M4",
        task: "Run it. Then print the mean of <code>sales_filled['rating']</code> and compare it with the fill-with-0 version.",
        code: withSales(`
          print(sales.isna().sum())                                     # 1. count missing

          sales_complete = sales.dropna(subset=['rating'])              # 2. drop those rows
          print(sales_complete.shape)

          median_rating = sales['rating'].median()                      # 3. fill with the median
          sales_filled = sales.copy()                                   # a copy: sales stays as it was
          sales_filled['rating'] = sales_filled['rating'].fillna(median_rating)

          print('Median rating:', median_rating)
          print('Missing after fill:', sales_filled['rating'].isna().sum())   # 4. check: 0`),
        solution: `
          print(sales_filled['rating'].mean())                    # 4.25
          print(round(sales['rating'].fillna(0).mean(), 2))       # 3.54`,
      },
      { type: "mistakes", items: [
        { title: "Testing with == np.nan", wrong: "sales[sales['rating'] == np.nan]", right: "sales[sales['rating'].isna()]", why: "NaN is never equal to anything, not even itself, so the first line finds 0 rows." },
        { title: "Not storing the result", wrong: "sales['rating'].fillna(4.25)\nprint(sales['rating'].isna().sum())   # still 2", right: "sales['rating'] = sales['rating'].fillna(4.25)", why: "<code>fillna</code> and <code>dropna</code> give back a <b>new</b> object. Store it, or nothing changes." },
        { title: "dropna() on the whole table", wrong: "clean = sales.dropna()", right: "clean = sales.dropna(subset=['rating'])", why: "Without <code>subset</code> a NaN in <b>any</b> column removes the row. Say which column you care about." },
        { title: "Filling with 0", wrong: "sales['rating'].fillna(0)", right: "sales['rating'].fillna(sales['rating'].median())", why: "0 is far outside the real range (3.8–4.7) and drags the mean to 3.54." },
      ] },
    ],
    quiz: [
      { type: "predict", tryit: false, q: "What does this print?", code: "print(sales['rating'].isna().sum())", answer: "2",
        hint: "Count the NaN in the rating column.", explain: "Orders 103 and 108 have no rating. True counts as 1, so the sum is 2." },
      { type: "predict", q: "What does this print?", code: "import numpy as np\n\nprint(np.nan == np.nan)", answer: "False",
        hint: "NaN is never equal to anything.", explain: "NaN is not even equal to itself. That is why you must use <code>isna()</code>." },
      { type: "predict", tryit: false, q: "What does this print?", code: "print(round(sales['rating'].fillna(0).mean(), 2))", answer: "3.54",
        hint: "The 10 real ratings add up to 42.5. Now there are 12 values.", explain: "42.5 / 12 = 3.54. Two zeros pulled the mean down from 4.25." },
      { type: "mc", q: "Why is filling missing ratings with the median better than with 0?", options: [
        "0 is treated as a real, very bad rating and distorts the mean; the median is a typical value",
        "the median is always equal to the mean",
        "<code>fillna(0)</code> gives an error",
        "0 removes the rows"], answer: 0,
        hint: "What does a rating of 0 claim about that order?", explain: "Missing means unknown. 0 claims “terrible”, which pulls the mean to 3.54. The median keeps the filled values inside the real range." },
      { type: "mc", q: "What is <code>sales.dropna().shape</code>?", options: ["(12, 6)", "(10, 6)", "(12, 5)", "(2, 6)"], answer: 1,
        hint: "Which rows have a NaN somewhere?", explain: "Only orders 103 and 108 have a NaN, so 2 rows go and all 6 columns stay." },
      { type: "write", q: "Write <code>fill_missing(df, col)</code>. It <b>returns a copy</b> of <code>df</code> where the NaN in column <code>col</code> are replaced by that column's median. Do not change <code>df</code> itself.",
        starter: withSales(`
          def fill_missing(df, col):
              pass

          print(fill_missing(sales, 'rating'))`),
        checks: [
          ["int(fill_missing(sales, 'rating')['rating'].isna().sum())", "0"],
          ["float(fill_missing(sales, 'rating')['rating'].iloc[2])", "4.25"],
          ["int(sales['rating'].isna().sum())", "2"],
        ],
        solution: `
          def fill_missing(df, col):
              result = df.copy()                                  # leave df as it was
              result[col] = result[col].fillna(result[col].median())
              return result`,
        hint: "<code>result = df.copy()</code>, then <code>result[col] = result[col].fillna(...)</code>, then return it. The last check fails if you change <code>sales</code> itself.",
        explain: "Without <code>.copy()</code> you would change the caller's table too: the third check looks for that." },
    ],
  };

  /* ================================================================
     TOPIC 7: groupby
     ================================================================ */
  const GB_PRINT = {"region|units|sum": "region\nNorth    45\nSouth    62\nWest     49\nName: units, dtype: int64", "region|units|mean": "region\nNorth    11.25\nSouth    15.50\nWest     12.25\nName: units, dtype: float64", "region|units|count": "region\nNorth    4\nSouth    4\nWest     4\nName: units, dtype: int64", "region|units|max": "region\nNorth    14\nSouth    20\nWest     18\nName: units, dtype: int64", "region|revenue|sum": "region\nNorth    1315\nSouth    1895\nWest     1645\nName: revenue, dtype: int64", "region|revenue|mean": "region\nNorth    328.75\nSouth    473.75\nWest     411.25\nName: revenue, dtype: float64", "region|revenue|count": "region\nNorth    4\nSouth    4\nWest     4\nName: revenue, dtype: int64", "region|revenue|max": "region\nNorth    420\nSouth    600\nWest     540\nName: revenue, dtype: int64", "product|units|sum": "product\nA    47\nB    41\nC    68\nName: units, dtype: int64", "product|units|mean": "product\nA    11.75\nB    10.25\nC    17.00\nName: units, dtype: float64", "product|units|count": "product\nA    4\nB    4\nC    4\nName: units, dtype: int64", "product|units|max": "product\nA    15\nB    12\nC    20\nName: units, dtype: int64", "product|revenue|sum": "product\nA    1175\nB    1640\nC    2040\nName: revenue, dtype: int64", "product|revenue|mean": "product\nA    293.75\nB    410.00\nC    510.00\nName: revenue, dtype: float64", "product|revenue|count": "product\nA    4\nB    4\nC    4\nName: revenue, dtype: int64", "product|revenue|max": "product\nA    375\nB    480\nC    600\nName: revenue, dtype: int64"};
  function groupbyWidget(el) {
    const st = { by: "region", col: "units", fn: "sum", phase: 1 };
    const sBy = seg([["region", "region"], ["product", "product"]], v => { st.by = v; draw(); }, "Group by");
    const sCol = seg([["units", "units"], ["revenue", "revenue"]], v => { st.col = v; draw(); }, "Column");
    const sFn = seg([["sum", "sum"], ["mean", "mean"], ["count", "count"], ["max", "max"]], v => { st.fn = v; draw(); }, "Function");
    const sPh = seg([[1, "1 · split"], [2, "2 · apply"], [3, "3 · combine"]], v => { st.phase = v; draw(); }, "Phase");
    const next = h("button", { type: "button", class: "btn small primary", onclick: () => { st.phase = st.phase % 3 + 1; draw(); } }, "Next step");
    const codeBox = h("div"), piles = h("div", { class: "datasci-piles" }), result = h("div"), say = h("p", { style: "margin:8px 0 0" });
    function draw() {
      sBy.sync(st.by); sCol.sync(st.col); sFn.sync(st.fn); sPh.sync(st.phase);
      const keys = distinct(st.by);
      codeBox.replaceChildren(ui.code({ code: [`result = sales_analysis.groupby('${st.by}')['${st.col}'].${st.fn}()`, "print(result)"], nonum: true }));
      piles.replaceChildren(...keys.map((k, gi) => {
        const rows = SALES.filter(r => r[st.by] === k), v = rows.map(r => r[st.col]);
        const r = st.fn === "sum" ? sum(v) : st.fn === "count" ? v.length : st.fn === "max" ? Math.max(...v) : sum(v) / v.length;
        const calc = st.fn === "sum" ? `${v.join(" + ")} = ${r}` : st.fn === "count" ? `${v.length} values → ${r}` : st.fn === "max" ? `max(${v.join(", ")}) = ${r}` : `(${v.join(" + ")}) / ${v.length} = ${r}`;
        return h("div", { class: "datasci-pile datasci-g" + gi },
          h("div", { class: "datasci-pilehead" }, st.by + " = " + pyLit(k)),
          st.phase < 3 ? h("ul", null, rows.map(rr => h("li", { class: "mono" }, `order ${rr.order_id}: `, h("b", null, String(rr[st.col]))))) : null,
          st.phase >= 2 ? h("div", { class: "datasci-calc mono" }, calc) : null,
          st.phase === 3 ? h("div", { class: "datasci-res" }, String(r)) : null);
      }));
      result.replaceChildren(st.phase === 3 ? h("div", null, eyebrow("print(result)", 10), outBox(GB_PRINT[`${st.by}|${st.col}|${st.fn}`])) : h("span"));
      say.innerHTML = st.phase === 1 ? `<b>Split:</b> the 12 rows go into one pile per <code>${st.by}</code> value. Only the <code>${st.col}</code> column is kept.`
        : st.phase === 2 ? `<b>Apply:</b> <code>${st.fn}()</code> runs on each pile on its own.`
        : `<b>Combine:</b> one number per pile, joined into a new Series. Its index is the ${st.by} names, sorted.`;
    }
    el.append(
      h("div", { class: "datasci-ctl" }, row(h("span", { class: "small muted" }, "groupby"), sBy), row(h("span", { class: "small muted" }, "column"), sCol), row(h("span", { class: "small muted" }, "then"), sFn)),
      h("div", { style: "margin-top:10px" }, codeBox), h("div", { style: "margin-top:10px" }, row(sPh, next)), say, piles, result);
    draw();
  }

  const groupby = {
    id: "groupby",
    title: "groupby: split, apply, combine",
    summary: "<code>groupby('region')</code> splits the rows into piles, a function runs on each pile, and the answers are combined into one small table.",
    sources: "Ex8 M7, H1",
    blocks: [
      { type: "h", text: "One number per group" },
      `<p>“Total revenue <b>per region</b>” needs three answers, one for each region. <code>groupby</code> does it in one line.</p>`,
      { type: "code", caption: "sales_analysis: the sales table plus a revenue column (units × unit_price)", code: `
          sales_analysis = sales.copy()                                           # work on a copy
          sales_analysis['revenue'] = sales_analysis['units'] * sales_analysis['unit_price']   # 10 × 25 = 250 …

          revenue_by_region = sales_analysis.groupby('region')['revenue'].sum()
          print(revenue_by_region)          # North 1315, South 1895, West 1645` },
      { type: "table", head: ["Part", "Code", "Does"], code: [1], rows: [
        ["split", "sales_analysis.groupby('region')", "one pile of rows per region"],
        ["pick a column", "['revenue']", "only look at revenue"],
        ["apply + combine", ".sum()", "add up each pile, put the totals in a Series"],
      ] },
      { type: "h", text: "Watch split → apply → combine", sub: "Choose the group, the column and the function. Then press Next step." },
      { type: "widget", render: groupbyWidget },

      { type: "h", text: "Several numbers at once: agg" },
      { type: "code", caption: "Exercise 8, H1: named aggregations, then sort", code: `
          region_summary = sales_analysis.groupby('region').agg(
              mean_units=('units', 'mean'),           # new name=(column, function)
              total_units=('units', 'sum'),
              total_revenue=('revenue', 'sum'),
              orders=('order_id', 'count'),
          )
          region_summary = region_summary.sort_values('total_revenue', ascending=False)   # biggest first
          print(region_summary)` },
      { type: "table", caption: "print(region_summary)", head: ["region", "mean_units", "total_units", "total_revenue", "orders"], num: [1, 2, 3, 4], rows: [
        ["South", "15.50", "62", "1895", "4"], ["West", "12.25", "49", "1645", "4"], ["North", "11.25", "45", "1315", "4"],
      ] },
      { type: "table", caption: "count skips NaN, size does not", head: ["Code", "North", "South", "West"], code: [0], num: [1, 2, 3], rows: [
        ["sales.groupby('region')['rating'].count()", "3", "3", "4"],
        ["sales.groupby('region').size()", "4", "4", "4"],
      ] },
      {
        type: "tryit",
        title: "Exercise 8, H1 and M7",
        task: "Run it. Then change it to group by <code>product</code>. Which product brings in the most revenue?",
        code: withSales(`
          sales_analysis = sales.copy()
          sales_analysis['revenue'] = sales_analysis['units'] * sales_analysis['unit_price']

          revenue_by_region = sales_analysis.groupby('region')['revenue'].sum()     # M7: the numbers behind the bar chart
          print(revenue_by_region)

          region_summary = sales_analysis.groupby('region').agg(                    # H1
              mean_units=('units', 'mean'),
              total_units=('units', 'sum'),
              total_revenue=('revenue', 'sum'),
              orders=('order_id', 'count'),
          )
          print(region_summary.sort_values('total_revenue', ascending=False))`),
        solution: `print(sales_analysis.groupby('product')['revenue'].sum())     # A 1175, B 1640, C 2040: C wins`,
      },
      { type: "mistakes", items: [
        { title: "No column picked, then mean", wrong: "sales.groupby('region').mean()", right: "sales.groupby('region')['units'].mean()", why: "Pandas tries every column, including the text column <code>product</code>: TypeError <code>agg function failed [how-&gt;mean,dtype-&gt;object]</code>." },
        { title: "No column picked, then sum", wrong: "sales.groupby('region').sum()", right: "sales.groupby('region')['units'].sum()", why: "No error, but nonsense: it also “adds” the text, so <code>product</code> becomes <code>'ABCA'</code>, and it adds up the order_ids." },
        { title: "Column name without quotes", wrong: "sales.groupby(region)", right: "sales.groupby('region')", why: "Without quotes Python looks for a variable: NameError <code>name 'region' is not defined</code>." },
        { title: "Forgetting ascending=False", wrong: "summary.sort_values('total_revenue')", right: "summary.sort_values('total_revenue', ascending=False)", why: "Sorting is smallest-first by default. For “strongest first”, turn it round." },
        { title: "count with missing values", wrong: "sales.groupby('region')['rating'].count()   # 3, 3, 4", right: "sales.groupby('region').size()               # 4, 4, 4", why: "<code>count</code> only counts real values. Use <code>size()</code> (or count a column with no NaN, like order_id) for the number of rows." },
      ] },
    ],
    quiz: [
      { type: "predict", tryit: false, q: "What does this print?", code: "print(sales_analysis.groupby('region')['revenue'].sum()['South'])", answer: "1895",
        hint: "South orders: 102 (375), 105 (600), 108 (440), 111 (480).", explain: "375 + 600 + 440 + 480 = 1895." },
      { type: "mc", q: "How many rows does <code>sales.groupby('product')['units'].sum()</code> have?", options: ["1", "3", "4", "12"], answer: 1,
        hint: "One row per group. How many products are there?", explain: "Products A, B and C: three groups, three rows." },
      { type: "predict", tryit: false, q: "What does this print?", code: "print(sales.groupby('region')['rating'].count()['North'])", answer: "3",
        hint: "North has 4 orders, but one has no rating.", explain: "Order 103 (North) has NaN. <code>count</code> skips it, so 3." },
      { type: "mc", q: "Which line gives total revenue per region, <b>highest first</b>?", options: [
        "<code>sales_analysis<wbr>.groupby('region')['revenue']<wbr>.sum()<wbr>.sort_values(ascending=False)</code>",
        "<code>sales_analysis<wbr>.groupby('revenue')['region']<wbr>.sum()</code>",
        "<code>sales_analysis['revenue']<wbr>.sum()<wbr>.sort_values()</code>",
        "<code>sales_analysis<wbr>.groupby('region')<wbr>.sort_values('revenue')</code>"], answer: 0,
        hint: "Group by the category, pick the number column, then sort the result.", explain: "Group by <code>region</code>, sum <code>revenue</code>, then sort the small result from big to small." },
      { type: "write", q: "Write <code>revenue_by_region(df)</code>. It <b>returns</b> a Series with the total <code>revenue</code> per <code>region</code>.",
        starter: withSales(`
          sales_analysis = sales.copy()
          sales_analysis['revenue'] = sales_analysis['units'] * sales_analysis['unit_price']

          def revenue_by_region(df):
              pass

          print(revenue_by_region(sales_analysis))`),
        checks: [["int(revenue_by_region(sales_analysis)['South'])", "1895"], ["int(revenue_by_region(sales_analysis)['North'])", "1315"], ["len(revenue_by_region(sales_analysis))", "3"]],
        solution: `
          def revenue_by_region(df):
              return df.groupby('region')['revenue'].sum()`,
        hint: "<code>df.groupby('region')</code>, then <code>['revenue']</code>, then <code>.sum()</code>.",
        explain: "That Series is exactly what Exercise 8, M7 plotted as a bar chart." },
      { type: "explain", q: "In 3–4 sentences, explain split → apply → combine using <code>sales_analysis.groupby('region')['revenue'].sum()</code>.",
        answer: "<p><b>Split:</b> Pandas puts the 12 rows into one pile per region (North, South, West). <b>Apply:</b> it takes the revenue column of each pile and runs <code>sum()</code> on it, for example South 375 + 600 + 440 + 480 = 1895. <b>Combine:</b> the three totals are joined into a new Series with the region names as the index.</p>",
        points: ["split into one group per region", "apply sum to the revenue of each group", "combine the results into one Series indexed by region"],
        hint: "Name the three steps and say what happens to the rows in each." },
    ],
  };

  /* ================================================================
     TOPIC 8: concat, merge & melt
     ================================================================ */
  const ORD = [{ order_id: 101, product: "A" }, { order_id: 103, product: "B" }, { order_id: 105, product: "C" }, { order_id: 113, product: "D" }];
  const PROD = [{ product: "A", category: "Basic" }, { product: "B", category: "Premium" }, { product: "C", category: "Standard" }, { product: "E", category: "Deluxe" }];
  const MERGED = {   // checked with pandas 2.2: a NaN turns order_id into floats
    inner: [["101", "A", "Basic"], ["103", "B", "Premium"], ["105", "C", "Standard"]],
    left: [["101", "A", "Basic"], ["103", "B", "Premium"], ["105", "C", "Standard"], ["113", "D", null]],
    right: [["101.0", "A", "Basic"], ["103.0", "B", "Premium"], ["105.0", "C", "Standard"], [null, "E", "Deluxe"]],
    outer: [["101.0", "A", "Basic"], ["103.0", "B", "Premium"], ["105.0", "C", "Standard"], ["113.0", "D", null], [null, "E", "Deluxe"]],
  };
  const keyClass = k => (k === "D" ? "datasci-konly-l" : k === "E" ? "datasci-konly-r" : "datasci-kboth");
  function mergeWidget(el) {
    let how = "inner";
    const s = seg([["inner", "inner"], ["left", "left"], ["right", "right"], ["outer", "outer"]], v => { how = v; draw(); }, "how");
    const left = h("div"), right = h("div"), res = h("div"), codeBox = h("div"), say = h("p", { style: "margin:8px 0 0" });
    function draw() {
      s.sync(how);
      const keepL = how === "left" || how === "outer", keepR = how === "right" || how === "outer";
      left.replaceChildren(eyebrow("orders (left)", 0), dfTable({ cols: ["order_id", "product"], rows: ORD,
        rowClass: i => (ORD[i].product === "D" && !keepL ? "datasci-drop" : null), cellClass: (i, c) => (c === "product" ? keyClass(ORD[i].product) : "") }));
      right.replaceChildren(eyebrow("products (right)", 0), dfTable({ cols: ["product", "category"], rows: PROD,
        rowClass: i => (PROD[i].product === "E" && !keepR ? "datasci-drop" : null), cellClass: (i, c) => (c === "product" ? keyClass(PROD[i].product) : "") }));
      const rows = MERGED[how].map(([o, p, c]) => ({ order_id: o, product: p, category: c }));
      res.replaceChildren(eyebrow("result", 0), dfTable({ cols: ["order_id", "product", "category"], rows, cellClass: (i, c) => (c === "product" ? keyClass(rows[i].product) : "") }));
      codeBox.replaceChildren(ui.code({ code: [`result = pd.merge(orders, products, on='product', how='${how}')`], nonum: true }));
      say.innerHTML = {
        inner: "<b>inner</b> (the default): only keys found in <b>both</b> tables. D and E disappear without any warning.",
        left: "<b>left</b>: every row of the left table stays. D has no partner, so its category is NaN.",
        right: "<b>right</b>: every row of the right table stays. E has no order, so its order_id is NaN, and that one NaN turns the whole order_id column into floats (101.0).",
        outer: "<b>outer</b>: everything from both sides. Missing partners become NaN.",
      }[how];
    }
    el.append(s, h("div", { style: "margin-top:10px" }, codeBox), h("div", { class: "datasci-three", style: "margin-top:10px" }, left, right, res), say,
      h("div", { style: "margin-top:6px" }, D.legend([["done", "key in both tables"], ["cmp", "only in orders (D)"], ["min", "only in products (E)"]])));
    draw();
  }

  const MELT_W = [{ order_id: 101, units: 10, unit_price: 25, rating: "4.2" }, { order_id: 102, units: 15, unit_price: 25, rating: "4.5" }, { order_id: 103, units: 8, unit_price: 40, rating: null }];
  const MEAS = ["units", "unit_price", "rating"];
  function meltWidget(el) {
    let k = 0;
    const back = h("button", { type: "button", class: "btn small", onclick: () => { k = (k + 8) % 9; draw(); } }, "Back");
    const fwd = h("button", { type: "button", class: "btn small primary", onclick: () => { k = (k + 1) % 9; draw(); } }, "Next cell");
    const wide = h("div"), long = h("div"), say = h("p", { style: "margin:8px 0 0" });
    const LONG = [];
    MEAS.forEach(m => MELT_W.forEach(r => LONG.push({ order_id: r.order_id, measure: m, value: r[m] == null ? null : pyFloat(+r[m]) })));
    function draw() {
      const mi = Math.floor(k / 3), ri = k % 3, m = MEAS[mi];
      wide.replaceChildren(eyebrow("wide: 3 rows", 0), dfTable({ cols: ["order_id", ...MEAS], rows: MELT_W,
        headClass: c => (c === m ? "datasci-hl" : ""),
        cellClass: (i, c) => (i === ri && c === m ? "datasci-sel" : c === "order_id" && i === ri ? "datasci-hl" : MEAS.includes(c) ? "datasci-m" + MEAS.indexOf(c) : "") }));
      long.replaceChildren(eyebrow("long: 3 × 3 = 9 rows", 0), dfTable({ cols: ["order_id", "measure", "value"], rows: LONG,
        rowClass: i => (i === k ? "datasci-cur" : i > k ? "datasci-later" : null),
        cellClass: (i, c) => (c === "measure" ? "datasci-m" + Math.floor(i / 3) : i === k && c === "value" ? "datasci-sel" : "") }));
      const v = MELT_W[ri][m];
      say.innerHTML = `Cell <b>${m}</b> of order <b>${MELT_W[ri].order_id}</b> becomes long row ${k}: <code>${MELT_W[ri].order_id}, '${m}', ${v == null ? "NaN" : pyFloat(+v)}</code>. Melt goes <b>column by column</b>: first all units, then all unit_price, then all rating.`;
    }
    el.append(ui.code({ code: ["long_metrics = pd.melt(metrics, id_vars='order_id', var_name='measure', value_name='value')"], nonum: true }),
      h("div", { style: "margin-top:10px" }, row(back, fwd)), say, h("div", { class: "datasci-two", style: "margin-top:10px" }, wide, long),
      note("The values all land in one column, so they become floats (10.0): <code>rating</code> has decimals and a NaN."));
    draw();
  }

  const mergeMelt = {
    id: "merge-melt",
    title: "concat, merge & melt",
    summary: "Stack tables with <code>pd.concat</code>, look up extra columns with <code>pd.merge</code> on a key, and turn a wide table into a long one with <code>pd.melt</code>.",
    sources: "Ex8 M5, H2",
    blocks: [
      { type: "h", text: "concat: stack tables on top of each other" },
      { type: "code", code: `
          d1 = pd.DataFrame({'order_id': [101, 102], 'units': [10, 15]})
          d2 = pd.DataFrame({'order_id': [113, 114], 'units': [7, 9], 'rating': [4.0, 3.5]})

          both = pd.concat([d1, d2])                  # a LIST of tables` },
      { type: "switch", label: "concat options", items: [
        { label: "default (outer)", blocks: [{ type: "table", caption: "print(pd.concat([d1, d2])): every column; gaps become NaN", head: ["", "order_id", "units", "rating"], num: [1, 2, 3], rows: [["0", "101", "10", "NaN"], ["1", "102", "15", "NaN"], ["0", "113", "7", "4.0"], ["1", "114", "9", "3.5"]] }, "<p class='small'>The labels 0, 1, 0, 1 repeat. Add <code>ignore_index=True</code> to get 0, 1, 2, 3.</p>"] },
        { label: "join='inner'", blocks: [{ type: "table", caption: "print(pd.concat([d1, d2], join='inner')): only the shared columns", head: ["", "order_id", "units"], num: [1, 2], rows: [["0", "101", "10"], ["1", "102", "15"], ["0", "113", "7"], ["1", "114", "9"]] }] },
      ] },

      { type: "h", text: "merge: look up extra columns by a key" },
      `<p>Exercise 8, M5: each sale has a <code>product</code>. A small <code>products</code> table gives the category of each product. <code>merge</code> matches the two tables on <code>product</code>.</p>`,
      { type: "code", code: `
          products = pd.DataFrame({'product': ['A', 'B', 'C'],
                                   'category': ['Basic', 'Premium', 'Standard']})

          sales_enriched = sales.merge(products, on='product')    # same as pd.merge(sales, products, on='product')
          print(sales_enriched.shape)                              # (12, 7): one new column` },
      `<p>Each product row is used 4 times (many sales, one product): a <b>many-to-one</b> merge. When a key has no partner, <code>how=</code> decides what happens. Below is a made-up small example: product D has no category, and product E was never ordered.</p>`,
      { type: "widget", render: mergeWidget },
      { type: "table", head: ["how=", "Keeps", "Think of"], code: [0], rows: [
        ["'inner'", "keys in both (default)", "the overlap"],
        ["'left'", "every row of the left table", "“add columns to my table”"],
        ["'right'", "every row of the right table", "left, mirrored"],
        ["'outer'", "everything", "nothing is lost; gaps are NaN"],
      ] },

      { type: "h", text: "melt: wide → long", sub: "Step through the cells. Each measure cell becomes its own row." },
      { type: "code", caption: "Exercise 8, H2", code: `
          metrics = sales[['order_id', 'units', 'unit_price', 'rating']]
          long_metrics = pd.melt(metrics, id_vars='order_id', var_name='measure', value_name='value')
          print(long_metrics.shape)      # (36, 3): 12 orders × 3 measures` },
      { type: "widget", render: meltWidget },
      { type: "table", head: ["Argument", "Means"], code: [0], rows: [
        ["id_vars='order_id'", "this column stays as it is and is repeated"],
        ["var_name='measure'", "the name of the new column that holds the old column names"],
        ["value_name='value'", "the name of the new column that holds the numbers"],
      ] },
      `<p>Long tables are what Seaborn likes: one row per observation, so <code>hue='measure'</code> can colour by it.</p>`,
      {
        type: "tryit",
        title: "Exercise 8, M5 and H2",
        task: "Run it. Then print the first 3 rows of <code>sales_enriched</code> to see the new column.",
        code: withSales(`
          products = pd.DataFrame({'product': ['A', 'B', 'C'],
                                   'category': ['Basic', 'Premium', 'Standard']})

          sales_enriched = sales.merge(products, on='product')                  # M5
          print('Shape:', sales_enriched.shape)

          metrics = sales[['order_id', 'units', 'unit_price', 'rating']]        # H2
          long_metrics = pd.melt(metrics, id_vars='order_id', var_name='measure', value_name='value')
          print(long_metrics.shape)
          print(long_metrics.head(13))`),
        solution: `print(sales_enriched.head(3))`,
      },
      { type: "mistakes", items: [
        { title: "concat without a list", wrong: "pd.concat(d1, d2)", right: "pd.concat([d1, d2])", why: "TypeError: <code>concat() takes 1 positional argument but 2 were given</code>. Put the tables in a list." },
        { title: "A misspelt key", wrong: "pd.merge(sales, products, on='Product')", right: "pd.merge(sales, products, on='product')", why: "The key must be a column in <b>both</b> tables, spelled exactly: KeyError <code>'Product'</code>." },
        { title: "Not checking the shape after merge", wrong: "merged = pd.merge(a, b, on='product')", right: "merged = pd.merge(a, b, on='product')\nprint(a.shape, merged.shape)", why: "The default <code>inner</code> silently drops rows without a partner. Compare the row counts." },
        { title: "Forgetting id_vars in melt", wrong: "pd.melt(metrics)", right: "pd.melt(metrics, id_vars='order_id')", why: "Without it, <code>order_id</code> is melted too, and you can no longer tell which order a value belongs to." },
      ] },
    ],
    quiz: [
      { type: "predict", tryit: false, q: "What does this print?", code: "products = pd.DataFrame({'product': ['A', 'B', 'C'], 'category': ['Basic', 'Premium', 'Standard']})\nprint(sales.merge(products, on='product').shape)", answer: "(12, 7)",
        hint: "Every sale finds its product. How many columns are added?", explain: "All 12 rows find a partner, and one new column (category) is added: 6 + 1 = 7." },
      { type: "mc", q: "<code>orders</code> has products A, B, C, D. <code>products</code> has A, B, C, E. Which products does <code>how='left'</code> keep?", options: ["A, B, C", "A, B, C, D", "A, B, C, E", "A, B, C, D, E"], answer: 1,
        hint: "left = keep every row of the left table.", explain: "All 4 orders stay. D has no category, so it gets NaN. E was never ordered, so it is not there." },
      { type: "predict", tryit: false, q: "<code>metrics</code> has 12 rows and the columns <code>order_id, units, unit_price, rating</code>. What does this print?", code: "long_metrics = pd.melt(metrics, id_vars='order_id', var_name='measure', value_name='value')\nprint(len(long_metrics))", answer: "36",
        hint: "Every row has 3 measure cells. Each one becomes a row.", explain: "12 orders × 3 measures = 36 rows." },
      { type: "mc", q: "<code>d1</code> has columns <code>order_id, units</code>. <code>d2</code> has <code>order_id, units, rating</code>. What does <code>pd.concat([d1, d2])</code> put in <code>rating</code> for the d1 rows?", options: ["the rating column is dropped", "NaN", "0", "an error is raised"], answer: 1,
        hint: "The default join is outer: keep every column.", explain: "Every column is kept, and the gaps become NaN. <code>join='inner'</code> would drop <code>rating</code> instead." },
      { type: "mc", q: "In <code>pd.melt(metrics, id_vars='order_id', var_name='measure', value_name='value')</code>, what ends up in the <code>measure</code> column?", options: ["the order numbers", "the old column names: units, unit_price, rating", "the numbers", "True/False"], answer: 1,
        hint: "var_name names the column that holds the old column headers.", explain: "Each long row says which measure it is (<code>measure</code>) and its number (<code>value</code>)." },
    ],
  };

  /* ================================================================
     TOPIC 9: Plotting: which plot when?
     ================================================================ */
  const TIME_V = [5.2, 5.0, 4.8, 5.7, 5.6, 6.1, 6.5, 6.4, 6.9, 7.2];     // Exercise 8, E5
  const REGIONS = [["North", 1315], ["South", 1895], ["West", 1645]];   // revenue by region (M7)
  const PLOT_W = 440, PLOT_H = 262, PA = { x0: 72, y0: 34, w: 340, h: 172 };

  function drawPlot(kind, S, tag) {
    tag = tag || (n => n);
    if (kind === "line") {
      const F = frame(S, Object.assign({}, PA, { xmin: -0.5, xmax: 9.5, ymin: 4, ymax: 8, xticks: [0, 3, 6, 9], yticks: [4, 5, 6, 7, 8], xlabel: "Time", ylabel: "Value", title: "Measurements over time", tag }));
      tag(S.path("M" + TIME_V.map((v, t) => F.X(t) + "," + F.Y(v)).join(" L"), { tone: "accent", cls: "datasci-thick" }), "line");
      TIME_V.forEach((v, t) => tag(S.circle(F.X(t), F.Y(v), 4, { tone: "accent", cls: "datasci-solid" }), "line"));
      return F;
    }
    if (kind === "scatter") {
      const F = frame(S, Object.assign({}, PA, { xmin: 6, xmax: 22, ymin: 150, ymax: 650, xticks: [8, 12, 16, 20], yticks: [200, 400, 600], xlabel: "units", ylabel: "revenue", title: "Revenue vs units per order", tag }));
      SALES.forEach(r => S.circle(F.X(r.units), F.Y(r.revenue), 5, { tone: "accent", cls: "datasci-solid" }));
      return F;
    }
    if (kind === "bar") {
      const F = frame(S, Object.assign({}, PA, { xmin: 0, xmax: 3, ymin: 0, ymax: 2200, yticks: [0, 500, 1000, 1500, 2000], xlabel: "region", ylabel: "revenue", title: "Revenue per region", tag }));
      REGIONS.forEach(([n, v], i) => {
        S.box(F.X(i + 0.2), F.Y(v), F.X(0.6) - F.X(0), F.Y(0) - F.Y(v), { rx: 2, cls: "datasci-bar" });
        S.text(F.X(i + 0.5), F.Y(v) - 9, String(v), { small: true });
        S.text(F.X(i + 0.5), PA.y0 + PA.h + 14, n, { muted: true });
      });
      return F;
    }
    if (kind === "hist") {
      const F = frame(S, Object.assign({}, PA, { xmin: 7, xmax: 21, ymin: 0, ymax: 5, xticks: [8, 11, 14, 17, 20], yticks: [0, 1, 2, 3, 4, 5], xlabel: "units", ylabel: "number of orders", title: "Distribution of units per order", tag }));
      [[8, 4], [11, 3], [14, 3], [17, 2]].forEach(([a, c]) => {
        S.box(F.X(a), F.Y(c), F.X(a + 3) - F.X(a), F.Y(0) - F.Y(c), { rx: 0, cls: "datasci-bar" });
        S.text(F.X(a + 1.5), F.Y(c) - 9, String(c), { small: true });
      });
      return F;
    }
    // box plot of revenue
    const F = frame(S, Object.assign({}, PA, { xmin: 0, xmax: 2, ymin: 150, ymax: 650, yticks: [200, 300, 400, 500, 600], ylabel: "revenue", title: "Revenue per order", tag }));
    const cx = F.X(1.15), bw = 70, q1 = 323.75, med = 410, q3 = 480, lo = 225, hi = 600;
    S.box(cx - bw / 2, F.Y(q3), bw, F.Y(q1) - F.Y(q3), { rx: 0, tone: "accent" });
    S.line(cx - bw / 2, F.Y(med), cx + bw / 2, F.Y(med), { tone: "cmp", cls: "datasci-thick" });
    S.line(cx, F.Y(q3), cx, F.Y(hi)); S.line(cx, F.Y(q1), cx, F.Y(lo));
    S.line(cx - 18, F.Y(hi), cx + 18, F.Y(hi)); S.line(cx - 18, F.Y(lo), cx + 18, F.Y(lo));
    SALES.forEach((r, i) => S.circle(F.X(0.45) + ((i * 7) % 22) - 11, F.Y(r.revenue), 3.5, { tone: "muted", cls: "datasci-dot" }));
    S.text(F.X(0.45), PA.y0 + PA.h + 14, "the 12 values", { muted: true });
    [[hi, "max 600"], [q3, "Q3 480"], [med, "median 410"], [q1, "Q1 323.75"], [lo, "min 225"]].forEach(([v, t]) => S.text(cx + bw / 2 + 26, F.Y(v), t, { anchor: "start", small: true, cls: v === med ? "datasci-t-cmp" : null }));
    return F;
  }
  const GALLERY = {
    line: { name: "Line", when: "x has an <b>order</b>, usually time.", read: "The value climbs from 5.2 to 7.2, with a dip at time 2.", code: "ax.plot(time, value, marker='o', label='measurements')", ex: "Exercise 8, E5" },
    scatter: { name: "Scatter", when: "two numbers per row: does one move with the other?", read: "More units go with more revenue, but the dots do not lie on one line: there are three prices (25, 30, 40).", code: "ax.scatter(sales_analysis['units'], sales_analysis['revenue'])", ex: "Exercise 8, M6" },
    bar: { name: "Bar", when: "one number per <b>category</b>.", read: "South brings in the most (1895), North the least (1315).", code: "revenue_by_region = sales_analysis.groupby('region')['revenue'].sum()\nax.bar(revenue_by_region.index, revenue_by_region.values)", ex: "Exercise 8, M7" },
    hist: { name: "Histogram", when: "how <b>one</b> number is spread out.", read: "Most orders have 8–14 units (4 + 3 + 3); only 2 have 17–20. A slight tail to the right.", code: "ax.hist(sales_analysis['units'], bins=4)    # 4 bins: 8–11, 11–14, 14–17, 17–20", ex: "Exercise 8, M8" },
    box: { name: "Box", when: "a quick summary of a spread: median, middle half, extremes, outliers.", read: "Median 410. The middle half of orders lies between 323.75 and 480. No outliers: the whiskers reach the min (225) and max (600).", code: "ax.boxplot(sales_analysis['revenue'])", ex: "Exercise 8, M8" },
  };
  function galleryWidget(el) {
    let kind = "bar";
    const s = seg(Object.keys(GALLERY).map(k => [k, GALLERY[k].name]), v => { kind = v; draw(); }, "Plot type");
    const pic = h("div"), info = h("div");
    function draw() {
      s.sync(kind);
      const G = GALLERY[kind];
      const S = D.svg({ w: PLOT_W, h: PLOT_H, label: G.name + " plot of the Exercise 8 data" });
      drawPlot(kind, S);
      pic.replaceChildren(S.el);
      info.replaceChildren(
        h("p", { style: "margin:0 0 6px", html: "<b>Use it when</b> " + G.when }),
        h("p", { style: "margin:0 0 10px", html: "<b>It shows:</b> " + G.read }),
        ui.code({ code: G.code }), h("p", { class: "small muted", style: "margin:6px 0 0" }, G.ex));
    }
    el.append(s, h("div", { class: "datasci-two", style: "margin-top:12px" }, pic, info));
    draw();
  }

  const GAME = [
    ["Daily temperature over one month", "line", "Days have an order, and you want to see the change from day to day."],
    ["Do orders with more units have higher revenue?", "scatter", "Two numbers per order: put one on each axis and look at the cloud."],
    ["Total revenue for North, South and West", "bar", "Three categories, one number each."],
    ["How are the 12 <code>units</code> values spread out? Is there a tail?", "hist", "One number column: count how many values fall in each bin."],
    ["Compare the spread of revenue and spot outliers at a glance", "box", "A box shows median, middle half and outliers in one shape."],
    ["How many orders were there of each product?", "bar", "Categories again: count per product (Seaborn's <code>countplot</code> draws exactly this)."],
  ];
  function gameWidget(el) {
    let i = 0, score = 0, answered = false;
    const q = h("p", { class: "datasci-gameq" }), btns = h("div", { class: "row-wrap" }), fb = h("p", { style: "margin:10px 0 0", "aria-live": "polite" });
    const nxt = h("button", { type: "button", class: "btn small primary", onclick: () => { i = (i + 1) % GAME.length; if (i === 0) score = 0; answered = false; draw(); } }, "Next question");
    const count = h("p", { class: "small muted", style: "margin:0 0 6px" });
    function draw() {
      count.textContent = `Question ${i + 1} of ${GAME.length} · score ${score}`;
      q.innerHTML = GAME[i][0];
      btns.replaceChildren(...Object.keys(GALLERY).map(k => h("button", { type: "button", class: "btn small", onclick: () => pick(k) }, GALLERY[k].name)));
      fb.innerHTML = ""; nxt.hidden = true;
    }
    function pick(k) {
      const [, right, why] = GAME[i];
      if (!answered && k === right) score++;
      answered = true;
      count.textContent = `Question ${i + 1} of ${GAME.length} · score ${score}`;
      fb.innerHTML = k === right ? `<span class="datasci-yes">Right ✓</span> ${why}` : `<span class="datasci-no">Not quite ✗</span> A ${GALLERY[k].name.toLowerCase()} is for: ${GALLERY[k].when} Try again.`;
      nxt.hidden = k !== right;
    }
    el.append(count, q, btns, fb, h("div", { style: "margin-top:8px" }, nxt));
    draw();
  }

  // --- widget: error bars and fill_between ---
  function errorWidget(el) {
    const MEAN = [2.1, 2.8, 3.3, 3.7, 4.5, 5.2], ERR = [0.25, 0.30, 0.35, 0.30, 0.45, 0.50];
    const f = h("input", { type: "range", min: "0.5", max: "3", step: "0.5", value: "1", id: "datasci-err-f" });
    const fv = h("b", { class: "mono" });
    const cb1 = h("input", { type: "checkbox", id: "datasci-err-bars", checked: true }), cb2 = h("input", { type: "checkbox", id: "datasci-err-band", checked: true });
    const pic = h("div"), say = h("p", { style: "margin:8px 0 0" });
    function draw() {
      const k = +f.value; fv.textContent = "× " + k;
      const S = D.svg({ w: PLOT_W, h: PLOT_H, label: "means with error bars and a shaded band" });
      const F = frame(S, Object.assign({}, PA, { xmin: 0.5, xmax: 6.5, ymin: 0, ymax: 7, xticks: [1, 2, 3, 4, 5, 6], yticks: [0, 1, 2, 3, 4, 5, 6, 7], xlabel: "x_pos", ylabel: "mean time (s)", title: "Means with uncertainty" }));
      const up = MEAN.map((m, i) => m + ERR[i] * k), dn = MEAN.map((m, i) => m - ERR[i] * k);
      if (cb2.checked) S.path("M" + up.map((v, i) => F.X(i + 1) + "," + F.Y(v)).join(" L") + " L" + dn.map((v, i) => F.X(i + 1) + "," + F.Y(v)).reverse().join(" L") + " Z", { cls: "datasci-band" });
      S.path("M" + MEAN.map((v, i) => F.X(i + 1) + "," + F.Y(v)).join(" L"), { tone: "accent" });
      MEAN.forEach((m, i) => {
        if (cb1.checked) { const x = F.X(i + 1); S.line(x, F.Y(up[i]), x, F.Y(dn[i]), { tone: "accent" }); S.line(x - 6, F.Y(up[i]), x + 6, F.Y(up[i]), { tone: "accent" }); S.line(x - 6, F.Y(dn[i]), x + 6, F.Y(dn[i]), { tone: "accent" }); }
        S.circle(F.X(i + 1), F.Y(m), 4, { tone: "accent", cls: "datasci-solid" });
      });
      pic.replaceChildren(S.el);
      say.innerHTML = `At x = 6 the mean is 5.2 and the error is ${+(0.5 * k).toFixed(2)}, so the bar reaches from <b>${+(5.2 - 0.5 * k).toFixed(2)}</b> to <b>${+(5.2 + 0.5 * k).toFixed(2)}</b>. A wider band means less certainty about the mean.`;
    }
    [f, cb1, cb2].forEach(x => (x.oninput = draw));
    cb1.onchange = cb2.onchange = draw;
    el.append(row(label("err", "datasci-err-f"), f, fv, h("label", { class: "small", for: "datasci-err-bars" }, cb1, " error bars"), h("label", { class: "small", for: "datasci-err-band" }, cb2, " band (fill_between)")),
      h("div", { style: "margin-top:10px" }, pic), say);
    draw();
  }

  const plotChoose = {
    id: "plot-choose",
    title: "Plotting: which plot when?",
    summary: "Start from the question, then pick the plot: line for order, scatter for pairs, bar for categories, histogram and box for spread, error bars for uncertainty.",
    sources: "Ex8 E5, M6–M8, H3",
    blocks: [
      { type: "callout", kind: "note", title: "Plots on this site", html: "<p>The Try-it boxes only show printed text, so the plots here are drawn by the page. In Jupyter you write the Matplotlib code shown next to each plot.</p>" },
      { type: "h", text: "Start from the question" },
      { type: "table", head: ["Your question", "Plot", "Matplotlib", "Exercise 8"], code: [2], rows: [
        ["How does a value change over time (or any order)?", "line", "ax.plot(x, y)", "E5"],
        ["Do two numbers move together?", "scatter", "ax.scatter(x, y)", "M6"],
        ["Compare one number across categories", "bar", "ax.bar(names, values)", "M7"],
        ["How is one number spread out?", "histogram", "ax.hist(values)", "M8"],
        ["Median, middle half, outliers", "box", "ax.boxplot(values)", "M8"],
        ["A mean and how sure we are", "error bars / band", "ax.errorbar(x, mean, yerr=err)", "H3"],
      ] },
      { type: "h", text: "One data set, five plots", sub: "The same sales data (and E5's measurements for the line). Switch between them." },
      { type: "widget", render: galleryWidget },
      { type: "callout", kind: "rule", title: "Bar vs histogram", html: "<p>A <b>bar chart</b> has categories on the x-axis (North, South, West), with gaps between the bars. A <b>histogram</b> has a number line on the x-axis cut into bins (8–11, 11–14 …), and the bars touch.</p>" },
      { type: "h", text: "Pick the plot", sub: "Six questions. Choose the plot that answers each one." },
      { type: "widget", render: gameWidget },

      { type: "h", text: "Uncertainty: error bars and a band", sub: "Exercise 8, H3. Make the errors bigger and watch the band widen." },
      { type: "widget", render: errorWidget },
      { type: "code", code: `
          x_pos = np.arange(1, 7)
          mean = np.array([2.1, 2.8, 3.3, 3.7, 4.5, 5.2])
          err = np.array([0.25, 0.30, 0.35, 0.30, 0.45, 0.50])

          fig, ax = plt.subplots()
          ax.errorbar(x_pos, mean, yerr=err, fmt='o-')                     # dots joined by a line, bars of ± err
          ax.fill_between(x_pos, mean - err, mean + err, alpha=0.3)        # shaded band from mean - err to mean + err
          ax.set_xlabel('Condition')
          ax.set_ylabel('Mean response time (s)')                           # always give the unit
          plt.show()` },
      {
        type: "tryit",
        title: "The numbers behind the plots",
        task: "A plot only draws numbers you can also print. Run it and match each line to the plots above.",
        code: withSales(`
          sales_analysis = sales.copy()
          sales_analysis['revenue'] = sales_analysis['units'] * sales_analysis['unit_price']

          counts, edges = np.histogram(sales_analysis['units'], bins=4)    # what ax.hist(..., bins=4) draws
          print(counts)
          print(edges)

          print(np.percentile(sales_analysis['revenue'], [25, 50, 75]))    # the box of ax.boxplot
          print(sales_analysis.groupby('region')['revenue'].sum())         # the bars of ax.bar`),
      },
      { type: "mistakes", items: [
        { title: "A line between categories", wrong: "ax.plot(['North', 'South', 'West'], totals)", right: "ax.bar(['North', 'South', 'West'], totals)", why: "A line suggests an order and values “between” North and South. Categories have neither: use bars." },
        { title: "A bar chart of raw values to show a spread", wrong: "ax.bar(range(12), sales_analysis['units'])", right: "ax.hist(sales_analysis['units'], bins=4)", why: "12 bars in a row show the order of the rows, not the spread. A histogram counts how many values fall in each range." },
        { title: "No labels or units", wrong: "ax.plot(time, value)", right: "ax.plot(time, value)\nax.set_xlabel('Time (s)')\nax.set_ylabel('Value')", why: "A reader cannot tell what the axes mean. Exercise 8 always asked for both labels and a title." },
        { title: "Too many bins for little data", wrong: "ax.hist(units, bins=50)   # 12 values", right: "ax.hist(units, bins=4)", why: "With 12 values, 50 bins are mostly empty and you see no shape." },
      ] },
    ],
    quiz: [
      { type: "mc", q: "You want to compare <b>total revenue</b> for North, South and West. Which plot?", options: ["line", "scatter", "bar", "histogram"], answer: 2,
        hint: "How many categories, and how many numbers per category?", explain: "One number per category: a bar chart (Exercise 8, M7)." },
      { type: "mc", q: "Does an order with more <code>units</code> also have more <code>revenue</code>? Which plot?", options: ["scatter", "bar", "box", "histogram"], answer: 0,
        hint: "Two numbers per order.", explain: "A scatter puts units on x and revenue on y, one dot per order (Exercise 8, M6)." },
      { type: "mc", q: "How are the 12 <code>units</code> values spread out? Which plot?", options: ["line", "bar of each order", "histogram", "scatter"], answer: 2,
        hint: "One number column, and you want its shape.", explain: "A histogram counts values per bin: 4, 3, 3, 2 for the bins 8–11, 11–14, 14–17, 17–20." },
      { type: "predict", tryit: false, q: "What does this print? (units = 10, 15, 8, 12, 20, 9, 14, 11, 18, 13, 16, 10)", code: "counts, edges = np.histogram(sales['units'], bins=4)\nprint(counts)", answer: "[4 3 3 2]",
        hint: "The bins are 8–11, 11–14, 14–17 and 17–20. A value equal to a bin's start goes into that bin.", explain: "8, 9, 10, 10 → 4. 11, 12, 13 → 3. 14, 15, 16 → 3. 18, 20 → 2 (the last bin includes 20)." },
      { type: "explain", q: "In 2–3 sentences, explain what the box and the line inside a box plot show, using the revenue box plot (Q1 323.75, median 410, Q3 480).",
        answer: "<p>The line inside the box is the median: half of the orders have a revenue below 410. The box goes from the first quartile (323.75) to the third quartile (480), so it holds the middle half of the orders. The whiskers reach the smallest and largest values that are not outliers (225 and 600).</p>",
        points: ["line = median (410)", "box = middle 50%, Q1 to Q3", "whiskers = range without outliers"],
        hint: "Median, quartiles, whiskers." },
      { type: "mc", q: "What does <code>ax.fill_between(x_pos, mean - err, mean + err)</code> draw?", options: ["a line through the means", "a shaded band from mean − err to mean + err", "bars from 0 to the mean", "a histogram of err"], answer: 1,
        hint: "It fills the space between two lines.", explain: "The lower edge is <code>mean - err</code> and the upper edge is <code>mean + err</code>. It shows the same uncertainty as error bars, as one band." },
    ],
  };

  /* ================================================================
     TOPIC 10: Figure anatomy & Seaborn
     ================================================================ */
  const ANAT_CODE = [
    "fig, ax = plt.subplots()                               # a Figure with one Axes",
    "ax.plot(time, value, marker='o', label='measurements')",
    "ax.set_xlabel('Time')",
    "ax.set_ylabel('Value')",
    "ax.set_title('Measurements over time')",
    "ax.legend()                                            # uses the label= from plot",
    "plt.show()",
  ];
  const ANAT = {
    figure: { name: "Figure", line: 1, parts: ["figure", "axes", "line", "legend", "xaxis", "yaxis", "title", "xlabel", "ylabel"], say: "The <b>Figure</b> is the whole canvas, the window or image. It can hold one or more Axes." },
    axes: { name: "Axes", line: 1, parts: ["axes", "line", "legend", "xaxis", "yaxis"], say: "An <b>Axes</b> is one plot area with its own data, x-axis and y-axis. <code>plt.subplots()</code> gives back the Figure and one Axes: <code>fig, ax</code>." },
    xaxis: { name: "x-axis (Axis)", line: 2, parts: ["xaxis"], say: "An <b>Axis</b> is the ruler: the line, ticks and tick labels. Matplotlib picks the ticks from the data when you plot. <code>ax.set_xticks</code> changes them." },
    yaxis: { name: "y-axis (Axis)", line: 2, parts: ["yaxis"], say: "The y-axis ruler. Its range (4 to 8 here) comes from the data unless you set <code>ax.set_ylim</code>." },
    title: { name: "Title", line: 5, parts: ["title"], say: "Says what the plot shows. <code>ax.set_title(...)</code>." },
    xlabel: { name: "x label", line: 3, parts: ["xlabel"], say: "Names the x-axis, ideally with a unit: <code>'Time (s)'</code>." },
    ylabel: { name: "y label", line: 4, parts: ["ylabel"], say: "Names the y-axis." },
    legend: { name: "Legend", line: 6, parts: ["legend"], say: "<code>ax.legend()</code> lists every plotted thing that has a <code>label=</code>. No labels → an empty legend and a warning." },
    line: { name: "Line (an Artist)", line: 2, parts: ["line"], say: "The data. Everything drawn (lines, dots, text, the legend) is an <b>Artist</b>." },
  };
  function anatomyWidget(el) {
    let sel = "axes";
    const s = seg(Object.keys(ANAT).map(k => [k, ANAT[k].name]), v => { sel = v; draw(); }, "Part of the figure");
    const pic = h("div", { class: "datasci-anat has-sel" }), codeBox = h("div"), say = h("p", { style: "margin:8px 0 0" });
    const S = D.svg({ w: PLOT_W, h: PLOT_H + 10, label: "a line plot with its parts labelled" });
    const nodes = [];
    const tag = (n, part) => { n.classList.add("datasci-part"); n.dataset.part = part; nodes.push(n); n.addEventListener("click", () => { sel = part; draw(); }); return n; };
    tag(S.box(2, 2, PLOT_W - 4, PLOT_H + 6, { rx: 10 }), "figure");
    tag(S.box(PA.x0, PA.y0, PA.w, PA.h, { rx: 0, cls: "datasci-axesbg" }), "axes");
    drawPlot("line", S, tag);
    const ly = PA.y0 + PA.h - 34;
    const lg = S.box(PA.x0 + PA.w - 132, ly, 124, 26, { rx: 4 });
    tag(lg, "legend");
    tag(S.line(PA.x0 + PA.w - 124, ly + 13, PA.x0 + PA.w - 100, ly + 13, { tone: "accent" }), "legend");
    tag(S.text(PA.x0 + PA.w - 94, ly + 13, "measurements", { anchor: "start", small: true, ui: true }), "legend");
    pic.appendChild(S.el);
    function draw() {
      s.sync(sel);
      const A = ANAT[sel];
      nodes.forEach(n => n.classList.toggle("datasci-hi", A.parts.includes(n.dataset.part)));
      codeBox.replaceChildren(ui.code({ code: ANAT_CODE, active: [A.line] }));
      say.innerHTML = A.say;
    }
    el.append(s, h("div", { class: "datasci-two", style: "margin-top:12px" }, pic, h("div", null, codeBox, say)), note("You can also click the parts of the picture."));
    draw();
  }

  // --- widget: Seaborn hue ---
  const HUE_TONES = ["accent", "cmp", "min"];
  function hueWidget(el) {
    let hue = "region";
    const s = seg([["none", "no hue"], ["region", "hue='region'"], ["product", "hue='product'"]], v => { hue = v; draw(); }, "hue");
    const pic = h("div"), codeBox = h("div"), say = h("p", { style: "margin:8px 0 0" });
    function draw() {
      s.sync(hue);
      const S = D.svg({ w: PLOT_W, h: PLOT_H, label: "scatter of units against revenue, coloured by " + hue });
      const F = frame(S, Object.assign({}, PA, { xmin: 6, xmax: 22, ymin: 150, ymax: 650, xticks: [8, 12, 16, 20], yticks: [200, 400, 600], xlabel: "units", ylabel: "revenue" }));
      const keys = hue === "none" ? [] : distinct(hue);
      if (hue === "product") [[25, 0], [40, 1], [30, 2]].forEach(([p, i]) => S.line(F.X(7), F.Y(7 * p), F.X(Math.min(21, 640 / p)), F.Y(Math.min(21, 640 / p) * p), { tone: HUE_TONES[i], dashed: true, cls: "datasci-guide" }));
      SALES.forEach(r => S.circle(F.X(r.units), F.Y(r.revenue), 5.5, { tone: hue === "none" ? "accent" : HUE_TONES[keys.indexOf(r[hue])], cls: "datasci-solid" }));
      if (keys.length) {
        const lx = PA.x0 + PA.w - 140, lh = 20 + keys.length * 18, ly = PA.y0 + PA.h - lh - 6;   // bottom right: no dots there
        S.box(lx, ly, 132, lh, { rx: 4 });
        S.text(lx + 8, ly + 10, hue, { anchor: "start", small: true, ui: true, weight: 600 });
        keys.forEach((k, i) => { S.circle(lx + 14, ly + 28 + i * 18, 5, { tone: HUE_TONES[i], cls: "datasci-solid" }); S.text(lx + 26, ly + 28 + i * 18, k + (hue === "product" ? " (" + { A: 25, B: 40, C: 30 }[k] + " each)" : ""), { anchor: "start", small: true, ui: true }); });
      }
      pic.replaceChildren(S.el);
      codeBox.replaceChildren(ui.code({ code: [`sns.scatterplot(data=sales_analysis, x='units', y='revenue'${hue === "none" ? "" : ", hue='" + hue + "'"})`, "plt.show()"], nonum: true }));
      say.innerHTML = hue === "none" ? "One colour. You see that more units go with more revenue, and that the dots scatter around."
        : hue === "region" ? "Colour by region (Exercise 8, M9). North sits low and left, South high and right, West spreads out. But the regions overlap: region does not explain the scatter."
        : "Colour by product: each product sits on its <b>own straight line</b>, because revenue = units × unit_price and each product has one price. This explains the scatter.";
    }
    el.append(s, h("div", { style: "margin-top:10px" }, codeBox), h("div", { class: "datasci-two", style: "margin-top:10px" }, pic, say));
    draw();
  }

  const plotAnatomy = {
    id: "plot-anatomy",
    title: "Figure anatomy & Seaborn",
    summary: "The parts of a Matplotlib figure (Figure, Axes, Axis, Artist), the <code>fig, ax</code> style, and Seaborn's <code>data=</code>, <code>x=</code>, <code>y=</code>, <code>hue=</code>.",
    sources: "Ex8 E5, E6, M9, M10",
    blocks: [
      { type: "h", text: "The parts of a figure" },
      { type: "table", head: ["Part", "What it is", "Tiny example"], code: [2], rows: [
        ["Figure", "the whole canvas", "fig"],
        ["Axes", "one plot area (the name is plural, but it is <b>one</b> plot)", "ax"],
        ["Axis", "the x or y ruler: ticks and tick labels", "ax.set_xticks([0, 3, 6, 9])"],
        ["Artist", "anything drawn: lines, dots, text, legend", "ax.plot(...)"],
      ] },
      { type: "widget", title: "Click the parts", intro: "Exercise 8, E5. Pick a part: it lights up, and the line of code that made it is highlighted.", render: anatomyWidget },
      { type: "h", text: "Explicit style: fig, ax" },
      `<p>The course prefers <code>fig, ax = plt.subplots()</code> and then calling methods on <code>ax</code>. The short <code>plt.</code> style works too, but the method names differ, so don't mix the two.</p>`,
      { type: "table", head: ["pyplot style", "explicit style (preferred)"], code: [0, 1], rows: [
        ["plt.plot(x, y)", "ax.plot(x, y)"],
        ["plt.xlabel('Time')", "ax.set_xlabel('Time')"],
        ["plt.title('Hi')", "ax.set_title('Hi')"],
        ["plt.legend()", "ax.legend()"],
        ["plt.xlim(0, 10)", "ax.set_xlim(0, 10)"],
      ] },
      {
        type: "tryit",
        title: "Build a figure and ask it questions",
        task: "This page cannot show a picture, but the Figure still exists. Run it, then add <code>ax.set_ylabel('Value')</code> and print <code>ax.get_ylabel()</code>.",
        code: `
          import numpy as np
          import matplotlib
          matplotlib.use('Agg')                    # only needed here (no window); not in Jupyter
          import matplotlib.pyplot as plt

          time = np.arange(0, 10)
          value = np.array([5.2, 5.0, 4.8, 5.7, 5.6, 6.1, 6.5, 6.4, 6.9, 7.2])

          fig, ax = plt.subplots()
          ax.plot(time, value, marker='o', label='measurements')
          ax.set_xlabel('Time')
          ax.set_title('Measurements over time')
          ax.legend()

          print(ax.get_title())                    # ask the Axes what is on it
          print(ax.get_xlabel())
          print(len(ax.lines), 'line(s)')
          print(ax.get_legend() is not None)`,
        solution: `
          ax.set_ylabel('Value')
          print(ax.get_ylabel())        # Value`,
      },
      { type: "h", text: "Seaborn: give it the table and the column names" },
      { type: "table", head: ["Code", "Draws"], code: [0], rows: [
        ["sns.scatterplot(data=sales_analysis, x='units', y='revenue')", "a scatter (Exercise 8, E6)"],
        ["sns.scatterplot(data=sales_analysis, x='units', y='revenue', hue='region')", "one colour per region, legend added for you (M9)"],
        ["sns.countplot(data=sales_analysis, x='product')", "bars that count rows per product: 4, 4, 4 (M10)"],
        ["sns.countplot(data=sales_analysis, x='product', hue='region')", "each bar split into one per region"],
      ] },
      `<p>Seaborn is built on Matplotlib. You give it the DataFrame with <code>data=</code> and the column <b>names</b> as strings. <code>hue_order=</code> sets the order of the colours and <code>palette=</code> the colours.</p>`,
      { type: "widget", title: "What hue adds", intro: "Switch the colouring. Which one explains why the dots do not lie on one line?", render: hueWidget },
      { type: "callout", kind: "note", title: "Seaborn is read-only here", html: "<p>Seaborn does not run in these Try-it boxes, so its code is shown, not run. Run it in Jupyter.</p>" },
      { type: "mistakes", items: [
        { title: "pyplot names on ax", wrong: "ax.xlabel('Time')", right: "ax.set_xlabel('Time')", why: "AttributeError: <code>'Axes' object has no attribute 'xlabel'</code>. On <code>ax</code> the setters start with <code>set_</code>." },
        { title: "A legend without labels", wrong: "ax.plot(time, value)\nax.legend()", right: "ax.plot(time, value, label='measurements')\nax.legend()", why: "Matplotlib warns <code>No artists with labels found to put in legend</code> and draws nothing." },
        { title: "Seaborn without data= and quotes", wrong: "sns.scatterplot(x=units, y=revenue)", right: "sns.scatterplot(data=sales_analysis, x='units', y='revenue')", why: "Without quotes Python looks for variables called <code>units</code>: NameError. Give the table and the column names." },
        { title: "hue without quotes", wrong: "sns.scatterplot(data=sales_analysis, x='units', y='revenue', hue=region)", right: "..., hue='region')", why: "NameError: <code>name 'region' is not defined</code>." },
      ] },
    ],
    quiz: [
      { type: "mc", q: "Which object is <b>one plot area</b> with its own x-axis and y-axis?", options: ["Figure", "Axes", "Axis", "Legend"], answer: 1,
        hint: "<code>fig, ax = plt.subplots()</code>: which of the two is the plot area?", explain: "An Axes is one plot. The Figure is the whole canvas that holds it." },
      { type: "mc", q: "You used <code>fig, ax = plt.subplots()</code>. Which line labels the x-axis?", options: ["<code>ax.xlabel('Time')</code>", "<code>ax.set_xlabel('Time')</code>", "<code>fig.set_xlabel('Time')</code>", "<code>ax.label_x('Time')</code>"], answer: 1,
        hint: "On <code>ax</code>, setters start with <code>set_</code>.", explain: "<code>ax.set_xlabel</code>. <code>plt.xlabel</code> is the pyplot spelling of the same thing." },
      { type: "bug", q: "Click the line that crashes.", code: `
          fig, ax = plt.subplots()
          ax.plot(time, value, marker='o', label='measurements')
          ax.xlabel('Time')
          ax.legend()`,
        bugs: [3], notes: { 3: "AttributeError: <code>'Axes' object has no attribute 'xlabel'</code>" },
        fixed: `
          fig, ax = plt.subplots()
          ax.plot(time, value, marker='o', label='measurements')
          ax.set_xlabel('Time')
          ax.legend()`,
        hint: "Which method name belongs to <code>plt</code>, not to <code>ax</code>?", explain: "A runtime error: the plot is already drawn when line 3 crashes." },
      { type: "mc", q: "With <code>hue='product'</code>, the dots of each product lie on a straight line. Why?", options: [
        "Seaborn draws lines through each group", "revenue = units × unit_price, and each product has one fixed price", "the products are sorted", "hue changes the y-axis"], answer: 1,
        hint: "How was the revenue column made?", explain: "Product A always costs 25, so its revenue is 25 × units: a straight line. B (40) and C (30) have steeper lines." },
      { type: "explain", q: "In 2–3 sentences, explain the difference between a Figure and an Axes in Matplotlib.",
        answer: "<p>The Figure is the whole canvas: the image or window that everything sits on. An Axes is one plot inside it, with its own data, x-axis, y-axis, title and legend. <code>fig, ax = plt.subplots()</code> gives you one Figure with one Axes, and you draw by calling methods on <code>ax</code>.</p>",
        points: ["Figure = whole canvas", "Axes = one plot area with its own axes", "plt.subplots() returns both"],
        hint: "Canvas vs plot area." },
    ],
  };

  PADS.registerSubject({
    id: "datasci",
    title: "NumPy, Pandas & plots",
    order: 5,
    blurb: "NumPy arrays, masks and <code>axis=</code> (exam Q5), Pandas tables (filter, <code>loc</code>/<code>iloc</code>, missing data, <code>groupby</code>, merge, melt), and choosing and reading plots.",
    covers: ["NumPy: shape, indexing, masks, <code>np.where</code>", "<code>axis=1</code> row totals (exam Q5)", "Pandas: filter, loc/iloc, NaN, groupby, merge, melt", "Matplotlib anatomy, which plot when, Seaborn <code>hue</code>"],
    exam: [
      "<b>Q5</b>: row totals with <code>np.sum(usage_matrix, axis=1)</code>, a mask, then <code>np.where(...)[0]</code> → <code>[1 3]</code>. <code>axis=</code> was never taught in the course, so start with the <b>axis= and summaries</b> page.",
      "<b>Q2–Q4</b>: index a NumPy array (<code>stock[item_index]</code>) and total it with <code>np.sum</code>.",
      "Pandas and plotting were not in last year's exam (it imported only NumPy), but they are Exercise 8 course content.",
    ],
    topics: [arrays, masks, axisTopic, pandasBasics, filterLoc, missing, groupby, mergeMelt, plotChoose, plotAnatomy],
  });
})();
