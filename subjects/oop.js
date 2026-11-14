/* Subject 3: Classes (OOP) (content map topics 7–9).
   Classes and objects, self, __str__, class vs instance variables, inheritance, abstract methods,
   the exam Q1 drill, errors and tracebacks, try/except/raise/assert and testing.
   Only uses the public API in AUTHORING.md. Local helpers (world(), segCtl()) live in this IIFE. */
(function () {
  "use strict";
  const { h, ui, pyrepr } = PADS;
  const D = ui.draw;
  const esc = PADS.esc;

  /* ================================================================
     Small helpers for this file only
     ================================================================ */
  const row = (...kids) => h("div", { class: "row-wrap" }, ...kids);
  const eyebrow = (t, style) => h("p", { class: "eyebrow", style: style || "margin:12px 0 6px" }, t);

  // segmented control: items are labels; onPick(i) runs on click
  function segCtl(items, onPick, aria, start) {
    const el = h("div", { class: "seg", role: "group", "aria-label": aria });
    let cur = start || 0;
    const set = i => { cur = i; [...el.children].forEach((b, k) => b.setAttribute("aria-pressed", String(k === i))); };
    items.forEach((t, i) => el.appendChild(h("button", { type: "button", onclick: () => { set(i); onPick(i); } }, t)));
    set(cur);
    return { el, set, get: () => cur };
  }

  // restart a CSS animation on an element
  const pop = el => { el.classList.remove("oop-pop"); void el.offsetWidth; el.classList.add("oop-pop"); };

  /* The "objects in memory" picture used by most steppers and widgets.
     o = {
       names: [{ name, to, tone }],                       name tags (left) with arrows to objects
       objs:  [{ id, title, fields: [[key, value, mark]], tone, faded }],   object boxes (middle)
       cls:   { name, vars: [[key, value, mark]], methods: [...] }        the class box (right), optional
       w, label
     }
     mark is an SVG tone: "cmp" (just changed), "accent" (being read), "swap" (wrong), "done", "min". */
  function world(o) {
    const W = o.w || 460;
    const names = o.names || [], objs = o.objs || [];
    const NX = 2, NW = 66, OX = 96, OW = o.cls ? 180 : 300;
    const CX = OX + OW + 22, CW = W - CX - 2;
    const ROW = 20, HEAD = 28;
    const pos = {};
    let y = 6;
    objs.forEach(ob => {
      const nNames = names.filter(n => n.to === ob.id).length;
      const hh = Math.max(HEAD + ob.fields.length * ROW + 6, nNames * 32 + 6, 44);
      pos[ob.id] = { y, h: hh };
      y += hh + 14;
    });
    let H = Math.max(y - 8, 56);
    let clsH = 0;
    if (o.cls) {
      clsH = HEAD + (o.cls.vars || []).length * ROW + (o.cls.methods || []).length * 18 + 10;
      H = Math.max(H, clsH + 10);
    }
    const S = D.svg({ w: W, h: H, label: o.label || "objects in memory" });
    if (!objs.length && !o.cls) { S.text(W / 2, H / 2, "No objects yet.", { muted: true, ui: true }); return S.el; }
    if (o.cls) {
      const c = o.cls;
      S.box(CX, 6, CW, clsH, { tone: "min", dashed: true });
      S.text(CX + 8, 6 + 15, "class " + c.name, { anchor: "start", size: c.name.length > 10 ? 12 : 13, weight: 600 });
      (c.vars || []).forEach(([k, v, mk], i) => {
        const fy = 6 + HEAD + i * ROW + 4;
        if (mk) S.box(CX + 4, fy - 9, CW - 8, 18, { tone: mk, rx: 4 });
        S.text(CX + 10, fy, k + " = " + v, { anchor: "start", size: 13 });
      });
      (c.methods || []).forEach((m, i) => {
        S.text(CX + 10, 6 + HEAD + (c.vars || []).length * ROW + i * 18 + 6, m, { anchor: "start", muted: true });
      });
    }
    objs.forEach(ob => {
      const p = pos[ob.id];
      if (o.cls) S.line(OX + OW, p.y + 14, CX, 6 + 15, { dashed: true, tone: "muted", faded: ob.faded });
      S.box(OX, p.y, OW, p.h, { tone: ob.tone || "accent", faded: ob.faded });
      S.text(OX + 10, p.y + 14, ob.title, { anchor: "start", muted: true, faded: ob.faded });
      if (!ob.fields.length) S.text(OX + 10, p.y + HEAD + 6, "(empty)", { anchor: "start", muted: true, faded: ob.faded });
      ob.fields.forEach(([k, v, mk], i) => {
        const fy = p.y + HEAD + i * ROW + 4;
        if (mk) S.box(OX + 4, fy - 9, OW - 8, 18, { tone: mk, rx: 4 });
        S.text(OX + 10, fy, k + " = " + v, { anchor: "start", size: 13, faded: ob.faded });
      });
    });
    const used = {};
    names.forEach(n => {
      const p = pos[n.to];
      if (!p) return;
      const k = used[n.to] || 0;
      used[n.to] = k + 1;
      const ny = p.y + 4 + k * 32;
      S.box(NX, ny, NW, 26, { text: n.name, tone: n.tone || null, rx: 13, size: 13 });
      S.arrow(NX + NW + 2, ny + 13, OX - 4, ny + 13, { tone: n.tone || "accent" });
    });
    return S.el;
  }
  const worldVisual = (el, st) => el.appendChild(world(st.w));

  // a "big code line" for widgets: dark panel, one line, HTML allowed
  const bigLine = (html, extra) => h("div", { class: "oop-line" + (extra ? " " + extra : ""), html });

  /* ================================================================
     TOPIC 1: Classes & objects
     ================================================================ */

  const P1 = (fields, mk) => ({ id: "a", title: "SocialMediaPost object", fields: fields.map((f, i) => [f[0], f[1], mk && mk[i]]) });
  const P2 = (fields, mk) => ({ id: "b", title: "SocialMediaPost object", fields: fields.map((f, i) => [f[0], f[1], mk && mk[i]]) });
  const SMP_CLS = { name: "SocialMediaPost", vars: [], methods: ["__init__(self, …)"] };
  const blueprintSteps = [
    { line: 1, now: "Python reads the class. This is only the <b>blueprint</b>. No post exists yet.", frames: [{ name: "global", vars: { SocialMediaPost: "<class>" } }],
      w: { cls: SMP_CLS, objs: [] } },
    { line: 7, now: "<code>SocialMediaPost('anand', 'hello')</code>: calling the class makes a <b>new, empty object</b>. Then Python runs <code>__init__</code> on it, with <code>self</code> pointing at the new object.",
      frames: [{ name: "global", vars: { SocialMediaPost: "<class>" } }, { name: "__init__", vars: { self: "the new object", author: "'anand'", content: "'hello'" } }],
      w: { cls: SMP_CLS, objs: [P1([])], names: [{ name: "self", to: "a", tone: "min" }] } },
    { line: 3, now: "<code>self.author = author</code>: stick the attribute <code>author</code> = 'anand' <b>onto this object</b>.",
      w: { cls: SMP_CLS, objs: [P1([["author", "'anand'"]], ["cmp"])], names: [{ name: "self", to: "a", tone: "min" }] } },
    { line: 4, now: "<code>self.content</code> = 'hello'.",
      w: { cls: SMP_CLS, objs: [P1([["author", "'anand'"], ["content", "'hello'"]], [0, "cmp"])], names: [{ name: "self", to: "a", tone: "min" }] } },
    { line: 5, now: "<code>self.likes</code> = 0. Not from an argument: every post just starts at 0.",
      w: { cls: SMP_CLS, objs: [P1([["author", "'anand'"], ["content", "'hello'"], ["likes", "0"]], [0, 0, "cmp"])], names: [{ name: "self", to: "a", tone: "min" }] } },
    { line: 7, now: "<code>__init__</code> is done (it returns nothing). The finished object gets the name <code>post1</code>. The local <code>self</code> is gone.",
      frames: [{ name: "global", vars: { SocialMediaPost: "<class>", post1: "<post 1>" } }],
      w: { cls: SMP_CLS, objs: [P1([["author", "'anand'"], ["content", "'hello'"], ["likes", "0"]])], names: [{ name: "post1", to: "a" }] } },
    { line: 8, now: "Same blueprint, <b>new object</b>. <code>__init__</code> runs again, now with <code>self</code> pointing at the second object, and fills in its <b>own</b> attributes.",
      frames: [{ name: "global", vars: { SocialMediaPost: "<class>", post1: "<post 1>" } }, { name: "__init__", vars: { self: "the new object", author: "'lara'", content: "'hi all'" } }],
      w: { cls: SMP_CLS, objs: [P1([["author", "'anand'"], ["content", "'hello'"], ["likes", "0"]]), P2([["author", "'lara'"], ["content", "'hi all'"], ["likes", "0"]], ["cmp", "cmp", "cmp"])], names: [{ name: "post1", to: "a" }, { name: "self", to: "b", tone: "min" }] } },
    { line: 8, now: "The second object gets the name <code>post2</code>. Two posts, each with its own three attributes.",
      frames: [{ name: "global", vars: { SocialMediaPost: "<class>", post1: "<post 1>", post2: "<post 2>" } }],
      w: { cls: SMP_CLS, objs: [P1([["author", "'anand'"], ["content", "'hello'"], ["likes", "0"]]), P2([["author", "'lara'"], ["content", "'hi all'"], ["likes", "0"]])], names: [{ name: "post1", to: "a" }, { name: "post2", to: "b" }] } },
    { line: 9, now: "Change an attribute from outside: <code>post1.likes</code> becomes 5. Only <code>post1</code> changes. <code>post2.likes</code> is still 0.",
      w: { cls: SMP_CLS, objs: [P1([["author", "'anand'"], ["content", "'hello'"], ["likes", "5"]], [0, 0, "cmp"]), P2([["author", "'lara'"], ["content", "'hi all'"], ["likes", "0"]])], names: [{ name: "post1", to: "a" }, { name: "post2", to: "b" }] } },
    { line: 10, now: "Read one attribute from each object.", print: "5 0",
      w: { cls: SMP_CLS, objs: [P1([["author", "'anand'"], ["content", "'hello'"], ["likes", "5"]], [0, 0, "accent"]), P2([["author", "'lara'"], ["content", "'hi all'"], ["likes", "0"]], [0, 0, "accent"])], names: [{ name: "post1", to: "a" }, { name: "post2", to: "b" }] } },
  ];

  const aliasSteps = [
    { line: 1, now: "Make one post and call it <code>post2</code>.", vars: { post2: "<post>" },
      w: { objs: [{ id: "a", title: "SocialMediaPost object", fields: [["author", "'anand'"], ["likes", "0"]] }], names: [{ name: "post2", to: "a" }] } },
    { line: 2, now: "<code>post3 = post2</code> does <b>not</b> copy. It sticks a second name on the <b>same</b> object.", vars: { post2: "<post>", post3: "<same post>" },
      w: { objs: [{ id: "a", title: "SocialMediaPost object", fields: [["author", "'anand'"], ["likes", "0"]] }], names: [{ name: "post2", to: "a" }, { name: "post3", to: "a", tone: "cmp" }] } },
    { line: 4, now: "Like it through <code>post3</code>. There is only one object, so its likes go 0 → <b>1</b>.",
      w: { objs: [{ id: "a", title: "SocialMediaPost object", fields: [["author", "'anand'"], ["likes", "1", "cmp"]] }], names: [{ name: "post2", to: "a" }, { name: "post3", to: "a", tone: "cmp" }] } },
    { line: 5, now: "Read it through <code>post2</code>: also <b>1</b>, because both names lead to the same box.", print: "1",
      w: { objs: [{ id: "a", title: "SocialMediaPost object", fields: [["author", "'anand'"], ["likes", "1", "accent"]] }], names: [{ name: "post2", to: "a" }, { name: "post3", to: "a" }] } },
    { line: 6, now: "<code>is</code> asks: are these the very same object? <b>Yes.</b>", print: "True",
      w: { objs: [{ id: "a", title: "SocialMediaPost object", fields: [["author", "'anand'"], ["likes", "1"]] }], names: [{ name: "post2", to: "a", tone: "done" }, { name: "post3", to: "a", tone: "done" }] } },
  ];

  // --- widget: == vs is ---
  function eqIsWidget(el) {
    let withEq = false;
    const codeBox = h("div"), pic = h("div"), tbl = h("div"), note = h("p", { class: "small", style: "margin:8px 0 0" });
    const ctl = segCtl(["no __eq__ written", "with __eq__"], i => { withEq = i === 1; draw(); }, "Is __eq__ written?");
    function draw() {
      const src = [
        "class SocialMediaPost:",
        "    def __init__(self, author, content):",
        "        self.author = author",
        "        self.content = content",
      ];
      if (withEq) src.push("", "    def __eq__(self, other):               # what == means", "        return self.author == other.author and self.content == other.content");
      src.push("", "a = SocialMediaPost('anand', 'same words')", "b = SocialMediaPost('anand', 'same words')", "c = a");
      codeBox.replaceChildren(ui.code({ code: src, active: withEq ? [6, 7] : [] }));
      const f = [["author", "'anand'"], ["content", "'same words'"]];
      pic.replaceChildren(world({ w: 400, objs: [{ id: "x", title: "object 1", fields: f }, { id: "y", title: "object 2", fields: f }], names: [{ name: "a", to: "x" }, { name: "c", to: "x", tone: "cmp" }, { name: "b", to: "y" }] }));
      const ok = v => v ? "<span class='ok'>True</span>" : "<span class='bad'>False</span>";
      tbl.replaceChildren(ui.table({ head: ["Python", "Result", "Why"], code: [0], rows: [
        ["a is b", ok(false), "two different boxes"],
        ["a == b", ok(withEq), withEq ? "your <code>__eq__</code> compares author and content: same" : "no <code>__eq__</code>, so <code>==</code> falls back to <code>is</code>"],
        ["a is c", ok(true), "<code>c = a</code>: two names, one box"],
        ["a == c", ok(true), "the same box is always equal to itself"],
      ] }));
      note.innerHTML = withEq ? "Now <code>==</code> compares the <b>contents</b>. <code>is</code> still compares the <b>boxes</b>." : "Without <code>__eq__</code>, Python cannot know what “equal posts” means, so <code>==</code> just checks for the same box.";
      pop(tbl);
    }
    el.append(ctl.el, h("div", { class: "oop-two", style: "margin-top:12px" }, codeBox, h("div", null, pic, tbl, note)));
    draw();
  }

  const classes = {
    id: "classes",
    title: "Classes & objects",
    summary: "A class is a blueprint, an object is one thing built from it. <code>__init__</code> fills in each object's attributes. Plus aliasing and <code>==</code> vs <code>is</code>.",
    exam: ["Q1 classes"],
    sources: "L4 p7–17 · NB §18",
    blocks: [
      { type: "h", text: "Everything is an object", sub: "An object = some data + the operations (methods) that work on it." },
      { type: "table", head: ["Value", "Its class (type)", "A method on it", "Result"], code: [0, 2], rows: [
        ["[3, 1]", "<code>list</code>", "[3, 1].append(8)", "the list becomes <code>[3, 1, 8]</code>"],
        ["'hi'", "<code>str</code>", "'hi'.upper()", "<code>'HI'</code>"],
        ["{'cola': 3}", "<code>dict</code>", "{'cola': 3}.keys()", "<code>dict_keys(['cola'])</code>"],
      ] },
      `<p><b>type = class</b>, and <b>value = instance</b> (an object of that class). <code>int('5')</code> already was “make an object of class int”. Now you write your own classes.</p>`,

      { type: "h", text: "A class is a blueprint" },
      { type: "code", caption: "The course's example (L4 p14)", code: `
          class SocialMediaPost:                         # class name: CapitalWords
              def __init__(self, author, content):       # runs once for every new object
                  self.author = author                   # attribute, from an argument
                  self.content = content
                  self.likes = 0                         # attribute with a start value

          post1 = SocialMediaPost('anand', 'hello')      # make an object (instantiation)
          print(post1.author)                            # 'anand' (read an attribute with a dot)` },
      { type: "table", head: ["Word", "Meaning", "In the example"], code: [2], rows: [
        ["class", "the blueprint: what every post has and can do", "class SocialMediaPost:"],
        ["object / instance", "one thing built from the blueprint", "post1"],
        ["instantiation", "building an object: call the class like a function", "SocialMediaPost('anand', 'hello')"],
        ["attribute", "a variable that lives on one object", "post1.likes"],
        ["method", "a function that lives in the class", "post1.like()"],
        ["<code>__init__</code>", "the set-up method. Python calls it for you on every new object", "def __init__(self, author, content):"],
      ] },

      { type: "h", text: "Blueprint → objects", sub: "Step through it. Watch each call build a new box and __init__ fill it in." },
      {
        type: "stepper",
        title: "Building two posts",
        code: `
          class SocialMediaPost:
              def __init__(self, author, content):
                  self.author = author
                  self.content = content
                  self.likes = 0

          post1 = SocialMediaPost('anand', 'hello')
          post2 = SocialMediaPost('lara', 'hi all')
          post1.likes = 5
          print(post1.likes, post2.likes)`,
        what: {
          1: "Defines the blueprint. Nothing is built yet.",
          2: "__init__ runs on every new object. self = the new object; author and content come from the call.",
          3: "Store author ON this object (self).",
          4: "Store content on this object.",
          5: "Every post starts with 0 likes.",
          7: "Build object 1. Python passes the new object as self, then 'anand' and 'hello'.",
          8: "Build object 2: a separate box with its own attributes.",
          9: "Change one attribute of one object.",
          10: "Read one attribute from each object.",
        },
        steps: blueprintSteps,
        visualTitle: "Objects in memory",
        legend: [["min", "the class (blueprint)"], ["cmp", "just set"]],
        visual: worldVisual,
      },
      { type: "callout", kind: "rule", title: "Two arguments in the call, three in the def", html: "<p>You call <code>SocialMediaPost('anand', 'hello')</code> with 2 values, but <code>__init__</code> has 3 parameters. Python fills in <code>self</code> by itself: it is the new object.</p>" },

      { type: "h", text: "Two names, one object (aliasing)" },
      {
        type: "stepper",
        title: "post3 = post2 is not a copy",
        code: `
          post2 = SocialMediaPost('anand', 'hello')
          post3 = post2                 # NOT a copy: a second name

          post3.like()                  # like through post3...
          print(post2.likes)            # ...shows up through post2
          print(post2 is post3)`,
        what: { 1: "One object, one name.", 2: "A second name for the same object.", 4: "Changes the one object.", 5: "Read through the other name.", 6: "is: the same object?" },
        steps: aliasSteps,
        visualTitle: "Names and objects",
        visual: worldVisual,
      },

      { type: "h", text: "== vs is", sub: "Two posts with the same words: equal? the same?" },
      { type: "table", head: ["Operator", "Asks", "Tiny example"], code: [2], rows: [
        ["<code>is</code>", "the very same object (same box)?", "post3 = post2\npost3 is post2   # True"],
        ["<code>==</code>", "equal contents? Only if <b>you</b> write <code>__eq__</code>. Without it, <code>==</code> works like <code>is</code>.", "[1, 2] == [1, 2]  # True (lists have __eq__)"],
      ] },
      { type: "widget", render: eqIsWidget },

      {
        type: "tryit",
        title: "Build your own posts",
        task: "Run it. Then make a third post <code>post3</code> by <i>you</i>, set its likes to 10, and print all three like counts.",
        code: `
          class SocialMediaPost:
              def __init__(self, author, content):
                  self.author = author
                  self.content = content
                  self.likes = 0

          post1 = SocialMediaPost('anand', 'hello')
          post2 = SocialMediaPost('lara', 'hi all')
          post1.likes = 5

          print(post1.author, post1.likes)       # anand 5
          print(post2.author, post2.likes)       # lara 0
          print(post1)                           # no __str__ yet: an ugly default (see the __str__ page)`,
      },
      { type: "mistakes", items: [
        { title: "Forgetting <code>self.</code> in <code>__init__</code>", wrong: "def __init__(self, name):\n    name = name", right: "def __init__(self, name):\n    self.name = name", why: "<code>name = name</code> only touches a local variable that vanishes. Later <code>obj.name</code> gives <code>AttributeError: 'Food' object has no attribute 'name'</code>." },
        { title: "Misspelling <code>__init__</code>", wrong: "def _init_(self, name):     # one underscore\ndef __int__(self, name):    # int, not init", right: "def __init__(self, name):", why: "Two underscores on each side, and <i>init</i>. Otherwise Python never calls it, and <code>Food('chips')</code> gives <code>TypeError: Food() takes no arguments</code>." },
        { title: "Missing an argument", wrong: "SocialMediaPost('anand')", right: "SocialMediaPost('anand', 'hello')", why: "<code>TypeError: SocialMediaPost.__init__() missing 1 required positional argument: 'content'</code>. Count the parameters after <code>self</code>." },
        { title: "Thinking <code>=</code> copies an object", wrong: "post3 = post2\npost3.like()   # post2 changes too!", right: "post3 = SocialMediaPost('anand', 'hello')   # a real second object", why: "<code>=</code> only adds a name. Build a new object if you want a separate one." },
        { title: "No brackets when building", wrong: "post = SocialMediaPost", right: "post = SocialMediaPost('anand', 'hello')", why: "Without brackets <code>post</code> is the class itself, not a new object." },
      ] },
    ],
    quiz: [
      { type: "predict", q: "What does this print?", code: "class Item:\n    def __init__(self, name):\n        self.name = name\n        self.stock = 0\n\ncola = Item('cola')\nchips = Item('chips')\ncola.stock = 3\nprint(cola.stock, chips.stock)", answer: "3 0",
        hint: "Each object has its own <code>stock</code>.", explain: "<code>cola</code> and <code>chips</code> are two separate boxes. Changing <code>cola.stock</code> leaves <code>chips.stock</code> at 0." },
      { type: "predict", q: "What does this print?", code: "class Item:\n    def __init__(self, name):\n        self.name = name\n        self.stock = 0\n\na = Item('cola')\nb = a\nb.stock = 7\nprint(a.stock)", answer: "7",
        hint: "Does <code>b = a</code> build a new object?", explain: "<code>b = a</code> is a second name for the <b>same</b> object, so changing it through <code>b</code> shows through <code>a</code>." },
      { type: "mc", q: "Two items are built with the same name: <code>x = Item('cola')</code> and <code>y = Item('cola')</code>. <code>Item</code> has no <code>__eq__</code>. What is <code>x == y</code>?",
        options: ["<code>True</code>: same contents", "<code>False</code>: without <code>__eq__</code>, <code>==</code> checks for the same object", "An error"], answer: 1,
        hint: "What does <code>==</code> do when the class never says what “equal” means?", explain: "Without <code>__eq__</code>, <code>==</code> works like <code>is</code>. These are two different objects, so it is False. Write <code>__eq__</code> to compare contents." },
      { type: "bug", q: "Exam style. <code>Item('cola')</code> crashes with <code>TypeError: Item() takes no arguments</code>, and <code>.price</code> is never stored. Click the two buggy lines.", code: `
          class Item:
              def _init_(self, name, price):
                  self.name = name
                  price = price

          cola = Item('cola', 15)
          print(cola.name, cola.price)`,
        bugs: [2, 4], notes: { 2: "<code>_init_</code> needs two underscores on each side: <code>__init__</code>", 4: "<code>price = price</code> only sets a local variable: it must be <code>self.price = price</code>" },
        fixed: `
          class Item:
              def __init__(self, name, price):
                  self.name = name
                  self.price = price

          cola = Item('cola', 15)
          print(cola.name, cola.price)`,
        hint: "Check the spelling of the set-up method, and every line that should store something <i>on</i> the object.", explain: "Line 2 means Python never calls the method (so the call with arguments fails). Line 4 would make <code>cola.price</code> an AttributeError." },
      { type: "write", q: "Write a class <code>Item</code>. <code>Item(name, price)</code> stores <code>name</code> and <code>price</code>, and every item starts with <code>stock</code> = 0.",
        starter: `
          class Item:
              def __init__(self, name, price):
                  pass                  # store the three attributes here

          cola = Item('cola', 15)
          print(cola.name, cola.price, cola.stock)`,
        checks: [["Item('cola', 15).name", "'cola'"], ["Item('cola', 15).price", "15"], ["Item('water', 10).stock", "0"]],
        solution: `
          class Item:
              def __init__(self, name, price):
                  self.name = name          # from the argument
                  self.price = price        # from the argument
                  self.stock = 0            # a start value, not an argument`,
        hint: "Three lines, each starting with <code>self.</code>. <code>stock</code> is not a parameter: just set it to 0.",
        explain: "Attributes that come from the call use the parameter (<code>self.name = name</code>). Start values are written directly (<code>self.stock = 0</code>)." },
    ],
  };

  /* ================================================================
     TOPIC 2: self & methods
     ================================================================ */

  // --- widget: the self translator ---
  function selfWidget(el) {
    const posts = [
      { name: "post1", author: "'anand'", likes: 0, comments: [] },
      { name: "post2", author: "'lara'", likes: 3, comments: [] },
    ];
    let pi = 0, mi = 0, last = null;
    const METHODS = [
      { call: "like()", def: "def like(self):", body: "self.likes += 1", run: p => { p.likes += 1; return { field: "likes", out: null }; }, args: "" },
      { call: "add_comment('nice')", def: "def add_comment(self, comment):", body: "self.comments.append(comment)", run: p => { p.comments.push("'nice'"); return { field: "comments", out: null }; }, args: ", 'nice'" },
      { call: "is_within_limit()", def: "def is_within_limit(self):", body: "return len(self.content) <= 1000", run: () => ({ field: null, out: "True" }), args: "" },
    ];
    const pCtl = segCtl(posts.map(p => p.name), i => { pi = i; last = null; draw(); }, "Which object");
    const mCtl = segCtl(METHODS.map(m => "." + m.call), i => { mi = i; last = null; draw(); }, "Which method");
    const lines = h("div", { class: "oop-trans", "aria-live": "polite" });
    const pic = h("div");
    const result = h("p", { class: "small", style: "margin:8px 0 0" });
    const runBtn = h("button", { type: "button", class: "btn primary small" }, "Run the call");
    const resetBtn = h("button", { type: "button", class: "btn ghost small" }, "Reset objects");
    runBtn.onclick = () => { last = METHODS[mi].run(posts[pi]); draw(true); };
    resetBtn.onclick = () => { posts[0].likes = 0; posts[1].likes = 3; posts.forEach(p => (p.comments = [])); last = null; draw(); };
    function draw(ran) {
      const p = posts[pi], m = METHODS[mi];
      const nm = `<mark class="oop-hl">${p.name}</mark>`;
      lines.replaceChildren(
        h("div", { class: "oop-step" }, h("span", { class: "oop-num" }, "1"), h("span", { class: "small" }, "You write")),
        bigLine(`${nm}.${esc(m.call)}`),
        h("div", { class: "oop-step" }, h("span", { class: "oop-num" }, "2"), h("span", { class: "small" }, "Python turns it into: class name, dot, method, and the object goes in front of the other arguments")),
        bigLine(`SocialMediaPost.${m.call.split("(")[0]}(${nm}${esc(m.args)})`, "oop-pop"),
        h("div", { class: "oop-step" }, h("span", { class: "oop-num" }, "3"), h("span", { class: "small", html: `The first parameter catches it: inside the method, <code>self</code> <b>is</b> <code>${p.name}</code>` })),
        bigLine(`def ${m.def.slice(4).replace("self", '<mark class="oop-hl2">self</mark>')}<br>    ${esc(m.body).replace("self", '<mark class="oop-hl2">self</mark>')}   <span class="oop-cm"># self is ${p.name}</span>`),
      );
      const fields = o => [["author", o.author, null], ["content", "'hi'", null], ["likes", String(o.likes), null], ["comments", "[" + o.comments.join(", ") + "]", null]];
      const objs = posts.map((o, k) => {
        const f = fields(o);
        if (ran && k === pi && last && last.field) f.forEach(x => { if (x[0] === last.field) x[2] = "cmp"; });
        return { id: "p" + k, title: "SocialMediaPost object", fields: f };
      });
      pic.replaceChildren(world({ w: 400, objs, names: [{ name: "post1", to: "p0" }, { name: "post2", to: "p1" }, { name: "self", to: "p" + pi, tone: "min" }] }));
      if (!ran) result.innerHTML = `Press <b>Run the call</b>. Only the object that <code>self</code> points at can change.`;
      else if (last.out) result.innerHTML = `<code>${p.name}.${m.call}</code> changes nothing. It <b>returns</b> <code>${last.out}</code> (the content is short).`;
      else result.innerHTML = `<code>${p.name}.${last.field}</code> changed. The other post was not touched.`;
    }
    el.append(row(h("span", { class: "small muted" }, "Object:"), pCtl.el, h("span", { class: "small muted" }, "Method:"), mCtl.el),
      h("div", { class: "oop-two", style: "margin-top:12px" }, lines, h("div", null, pic, result, row(runBtn, resetBtn))));
    draw();
  }

  // --- stepper data: methods calling methods ---
  const LAC = (likes, comments, mk) => [
    { id: "a", title: "post1", fields: [["author", "'anand'"], ["likes", "0"], ["comments", "[]"]] },
    { id: "b", title: "post2", fields: [["author", "'lara'"], ["likes", likes, mk === "l" ? "cmp" : null], ["comments", comments, mk === "c" ? "cmp" : null]] },
  ];
  const G2 = { post1: "<post>", post2: "<post>" };
  const lacSteps = [
    { line: 17, now: "Build two posts (<code>__init__</code> runs for each, as on the last page).", frames: [{ name: "global", vars: { post1: "<post>" } }],
      w: { objs: LAC("0", "[]").slice(0, 1), names: [{ name: "post1", to: "a" }] } },
    { line: 18, now: "Second post.", frames: [{ name: "global", vars: G2 }], w: { objs: LAC("0", "[]"), names: [{ name: "post1", to: "a" }, { name: "post2", to: "b" }] } },
    { line: 19, now: "<code>post2.like_and_comment('nice')</code> is <code>SocialMediaPost.like_and_comment(post2, 'nice')</code>. A new frame: <b>self = post2</b>, comment = 'nice'.",
      frames: [{ name: "global", vars: G2 }, { name: "like_and_comment", vars: { self: "post2", comment: "'nice'" } }],
      w: { objs: LAC("0", "[]"), names: [{ name: "post1", to: "a" }, { name: "post2", to: "b" }, { name: "self", to: "b", tone: "min" }] } },
    { line: 14, now: "<code>self.like()</code>. self is post2, so this is <code>post2.like()</code>. Without <code>self.</code> Python would not know which post to like.",
      w: { objs: LAC("0", "[]"), names: [{ name: "post1", to: "a" }, { name: "post2", to: "b" }, { name: "self", to: "b", tone: "min" }] } },
    { line: 7, now: "Inside <code>like</code>: another new frame. Its <code>self</code> is again post2 (passed along).",
      frames: [{ name: "global", vars: G2 }, { name: "like_and_comment", vars: { self: "post2", comment: "'nice'" } }, { name: "like", vars: { self: "post2" } }] },
    { line: 8, now: "<code>self.likes += 1</code>: post2's likes go 0 → <b>1</b>.",
      w: { objs: LAC("1", "[]", "l"), names: [{ name: "post1", to: "a" }, { name: "post2", to: "b" }, { name: "self", to: "b", tone: "min" }] } },
    { line: 15, now: "<code>like</code> is done; its frame is gone. Next: <code>self.add_comment(comment)</code>, so <code>post2.add_comment('nice')</code>.",
      frames: [{ name: "global", vars: G2 }, { name: "like_and_comment", vars: { self: "post2", comment: "'nice'" } }],
      w: { objs: LAC("1", "[]"), names: [{ name: "post1", to: "a" }, { name: "post2", to: "b" }, { name: "self", to: "b", tone: "min" }] } },
    { line: 10, now: "A new frame for <code>add_comment</code>: self = post2, comment = 'nice'.",
      frames: [{ name: "global", vars: G2 }, { name: "like_and_comment", vars: { self: "post2", comment: "'nice'" } }, { name: "add_comment", vars: { self: "post2", comment: "'nice'" } }] },
    { line: 11, now: "Append 'nice' to post2's own list.",
      w: { objs: LAC("1", "['nice']", "c"), names: [{ name: "post1", to: "a" }, { name: "post2", to: "b" }, { name: "self", to: "b", tone: "min" }] } },
    { line: 19, now: "Both methods are done; all their frames are gone. Back at the top level.",
      frames: [{ name: "global", vars: G2 }],
      w: { objs: LAC("1", "['nice']"), names: [{ name: "post1", to: "a" }, { name: "post2", to: "b" }] } },
    { line: 20, now: "post1 was never touched.", print: "0 1 ['nice']" },
  ];

  const selfTopic = {
    id: "self",
    title: "self & methods",
    summary: "<code>self</code> is the object left of the dot. <code>post1.like()</code> is really <code>SocialMediaPost.like(post1)</code>.",
    exam: ["Q1 methods"],
    sources: "L4 p14–15 · L5 p3 · NB cell 133",
    blocks: [
      { type: "h", text: "self is the object left of the dot" },
      { type: "table", head: ["You write", "Python runs", "So self is"], code: [0, 1], rows: [
        ["post1.like()", "SocialMediaPost.like(post1)", "<code>post1</code>"],
        ["post2.like()", "SocialMediaPost.like(post2)", "<code>post2</code>"],
        ["post2.add_comment('nice')", "SocialMediaPost.add_comment(post2, 'nice')", "<code>post2</code> (and comment is 'nice')"],
      ] },
      `<p>One method in the class, many objects. <code>self</code> tells the method <b>which</b> object it is working on right now.</p>`,
      { type: "widget", title: "The self translator", intro: "Pick an object and a method. Watch the call turn into the class version, and <code>self</code> point at your object. Then run it.", render: selfWidget },

      { type: "h", text: "Methods", sub: "A method is a function inside the class. Its first parameter is always self." },
      { type: "table", head: ["Kind", "What it does", "Tiny example"], code: [2], rows: [
        ["changes the object (mutating)", "updates <code>self.something</code>", "def like(self):\n    self.likes += 1"],
        ["answers a question (non-mutating)", "<code>return</code>s a value, changes nothing", "def is_within_limit(self):\n    return len(self.content) <= 1000"],
        ["takes extra input", "parameters after <code>self</code>", "def add_comment(self, comment):\n    self.comments.append(comment)"],
      ] },
      { type: "h", text: "Methods calling methods", sub: "Inside the class, reach another method through self." },
      {
        type: "stepper",
        title: "post2.like_and_comment('nice')",
        code: `
          class SocialMediaPost:
              def __init__(self, author):
                  self.author = author
                  self.likes = 0
                  self.comments = []

              def like(self):
                  self.likes += 1

              def add_comment(self, comment):
                  self.comments.append(comment)

              def like_and_comment(self, comment):
                  self.like()                        # NOT like()
                  self.add_comment(comment)

          post1 = SocialMediaPost('anand')
          post2 = SocialMediaPost('lara')
          post2.like_and_comment('nice')
          print(post1.likes, post2.likes, post2.comments)`,
        what: {
          7: "A mutating method: adds one like to whichever post self is.",
          8: "self.likes is the likes of THIS object.",
          10: "Takes one extra argument after self.",
          11: "Append to this object's own list.",
          13: "A method that uses two other methods.",
          14: "Call another method on the same object: self.like().",
          15: "Pass the comment along.",
          17: "Build post1.", 18: "Build post2.",
          19: "Call the method on post2: self will be post2.",
          20: "Show the results.",
        },
        steps: lacSteps,
        visualTitle: "Objects (self in purple)",
        visual: (el, st, ctx) => {
          let w = st.w;
          for (let i = ctx.index; !w && i >= 0; i--) w = ctx.steps[i].w;
          el.appendChild(world(w));
        },
      },

      { type: "h", text: "self is just a name", sub: "The banana demo (L5 p3)" },
      `<p>Python passes the object as the <b>first</b> argument, whatever you call it. <code>self</code> is only the custom everybody follows. Always use <code>self</code>.</p>`,
      {
        type: "tryit",
        title: "The banana demo",
        task: "Run it: it works, because the first parameter catches the object whatever its name. Then remove <code>banana</code> from the brackets and run again to see the classic error.",
        code: `
          class SocialMediaPost:
              def __init__(self, author):
                  self.author = author
                  self.likes = 0

              def like(banana):              # works, but please write self
                  banana.likes += 1

          post1 = SocialMediaPost('anand')
          post1.like()
          print(post1.likes)                 # 1`,
      },
      { type: "callout", kind: "warn", title: "Forgot self in the def?", html: "<p><code>def like():</code> then <code>post1.like()</code> gives <code>TypeError: SocialMediaPost.like() takes 0 positional arguments but 1 was given</code>. The “1 given” is the object Python passed in. There was no parameter to catch it.</p>" },
      {
        type: "tryit",
        title: "Exercise 4: promote an employee",
        task: "<p><code>promote</code> moves an employee one step up the <code>positions</code> list. Run it: the 3rd promotion crashes. Why? (Exercise 4, Q1.)</p><p>Then fix <code>promote</code> so it only moves up if there is a higher position (hint: compare <code>self.level</code> with <code>len(self.positions) - 1</code>).</p>",
        code: `
          class Employee:
              def __init__(self, name):
                  self.name = name
                  self.positions = ['Junior', 'Senior', 'Lead']
                  self.level = 0                         # index into positions

              def promote(self):
                  self.level += 1

              def position(self):
                  return self.positions[self.level]      # read with the index

          e = Employee('Gerry')
          for i in range(3):
              e.promote()
              print(e.name, 'is now', e.position())`,
        hint: "After 2 promotions <code>level</code> is 2 (Lead). The 3rd makes it 3, but the list only has indexes 0, 1, 2: IndexError.",
        solution: `
          class Employee:
              def __init__(self, name):
                  self.name = name
                  self.positions = ['Junior', 'Senior', 'Lead']
                  self.level = 0

              def promote(self):
                  if self.level < len(self.positions) - 1:   # is there a higher position?
                      self.level += 1

              def position(self):
                  return self.positions[self.level]

          e = Employee('Gerry')
          for i in range(3):
              e.promote()
              print(e.name, 'is now', e.position())`,
        solutionNote: "Prints Senior, Lead, Lead. On the Errors page you will make it <code>raise</code> an error instead (Exercise 5, Q12).",
      },
      { type: "mistakes", items: [
        { title: "No <code>self</code> in the def", wrong: "def like():\n    self.likes += 1", right: "def like(self):\n    self.likes += 1", why: "Python always passes the object. <code>TypeError: … takes 0 positional arguments but 1 was given</code>." },
        { title: "Forgetting <code>self.</code> on an attribute", wrong: "def like(self):\n    likes += 1", right: "def like(self):\n    self.likes += 1", why: "Plain <code>likes</code> is a local variable that does not exist yet: <code>UnboundLocalError: cannot access local variable 'likes'…</code>." },
        { title: "Calling another method without <code>self.</code>", wrong: "def like_twice(self):\n    like()", right: "def like_twice(self):\n    self.like()", why: "<code>NameError: name 'like' is not defined</code>. Methods live in the class, so reach them through the object." },
        { title: "Passing the object yourself", wrong: "post1.like(post1)", right: "post1.like()", why: "Python already passes <code>post1</code>. Now there are 2: <code>TypeError: … takes 1 positional argument but 2 were given</code>." },
        { title: "Forgetting the brackets", wrong: "post1.like      # does nothing", right: "post1.like()", why: "Without <code>()</code> you only <i>name</i> the method. It never runs, and there is no error to warn you." },
        { title: "Mixing up whose <code>self</code>", wrong: "def book_vehicle(self, vehicle, hours):\n    self.available = False   # the customer?!", right: "def book_vehicle(self, vehicle, hours):\n    vehicle.available = False", why: "Assignment 2: inside <code>Customer.book_vehicle</code>, <code>self</code> is the customer. The car is the <code>vehicle</code> parameter." },
      ] },
    ],
    quiz: [
      { type: "mc", q: "In <code>post2.add_comment('wow')</code>, what are <code>self</code> and <code>comment</code> inside the method?",
        options: ["self is <code>SocialMediaPost</code>, comment is 'wow'", "self is <code>post2</code>, comment is 'wow'", "self is 'wow', comment is missing", "self is <code>post1</code>"], answer: 1,
        hint: "The object left of the dot goes first.", explain: "It runs as <code>SocialMediaPost.add_comment(post2, 'wow')</code>: <code>self</code> catches post2 and <code>comment</code> catches 'wow'." },
      { type: "predict", q: "What does this print?", code: "class Counter:\n    def __init__(self):\n        self.n = 0\n\n    def add(self, k):\n        self.n += k\n\na = Counter()\nb = Counter()\na.add(2)\nb.add(5)\na.add(1)\nprint(a.n, b.n)", answer: "3 5",
        hint: "Each call changes only the object left of the dot.", explain: "a: 0 + 2 + 1 = 3. b: 0 + 5 = 5. Each object keeps its own <code>n</code>." },
      { type: "bug", q: "Click every line that will make this crash when <code>c.restock(5)</code> runs.", code: `
          class Item:
              def __init__(self, name):
                  self.name = name
                  self.stock = 0

              def restock(amount):
                  stock += amount

          c = Item('cola')
          c.restock(5)`,
        bugs: [6, 7], notes: { 6: "missing <code>self</code>: <code>def restock(self, amount):</code>", 7: "missing <code>self.</code>: <code>self.stock += amount</code>" },
        fixed: `
          class Item:
              def __init__(self, name):
                  self.name = name
                  self.stock = 0

              def restock(self, amount):
                  self.stock += amount

          c = Item('cola')
          c.restock(5)`,
        hint: "Two different <code>self</code> problems: one in the def line, one in the body.", explain: "Line 6 crashes first (TypeError: 2 arguments given, 1 expected). After fixing it, line 7 would crash (UnboundLocalError) because <code>stock</code> is not a local variable." },
      { type: "predict", q: "What does this print?", code: "class Employee:\n    def __init__(self, name):\n        self.name = name\n        self.salary = 100\n\n    def give_raise(self):\n        self.salary = self.salary * 2\n\n    def give_two_raises(self):\n        self.give_raise()\n        self.give_raise()\n\ne = Employee('Ann')\ne.give_two_raises()\nprint(e.salary)", answer: "400",
        hint: "Each <code>give_raise</code> doubles the salary.", explain: "100 → 200 → 400. <code>give_two_raises</code> calls the other method twice through <code>self</code>." },
      { type: "write", q: "Add two methods to <code>Item</code>: <code>restock(self, amount)</code> adds <code>amount</code> to <code>stock</code>, and <code>is_available(self)</code> <b>returns</b> <code>True</code> if <code>stock</code> is above 0.",
        starter: `
          class Item:
              def __init__(self, name):
                  self.name = name
                  self.stock = 0

              # your two methods here

          cola = Item('cola')
          print(cola.is_available())     # False
          cola.restock(3)
          print(cola.stock, cola.is_available())`,
        test: "c = Item('cola')\nassert c.is_available() == False, 'a new item has stock 0, so is_available() should be False'\nc.restock(3)\nassert c.stock == 3, 'after restock(3), stock should be 3'\nc.restock(2)\nassert c.stock == 5, 'restock should ADD: 3 + 2 = 5'\nassert c.is_available() == True, 'with stock 5, is_available() should be True'",
        solution: `
          class Item:
              def __init__(self, name):
                  self.name = name
                  self.stock = 0

              def restock(self, amount):
                  self.stock += amount           # change THIS item

              def is_available(self):
                  return self.stock > 0          # True or False`,
        hint: "Both start with <code>def …(self …):</code>. One changes <code>self.stock</code>, the other <code>return</code>s a comparison.",
        explain: "<code>restock</code> is mutating (no return needed). <code>is_available</code> answers a question, so it must <b>return</b>." },
      { type: "explain", q: "In 2–3 sentences, explain what <code>self</code> is and why every method needs it.",
        answer: "<p><code>self</code> is the object the method was called on: in <code>post1.like()</code>, Python runs <code>SocialMediaPost.like(post1)</code>, so <code>self</code> is <code>post1</code>. The class has one copy of each method for all objects, so the method needs <code>self</code> to know whose attributes to read and change (<code>self.likes</code>).</p>",
        points: ["self = the object left of the dot", "Python passes it automatically as the first argument", "it lets one method work on many different objects"],
        hint: "Think about what <code>post1.like()</code> turns into." },
    ],
  };

  /* ================================================================
     TOPIC 3: __str__ & printing
     ================================================================ */

  // --- widget: print(chips) without / with / with a broken __str__ ---
  function strWidget(el) {
    let v = 0;
    const codeBox = h("div"), out = h("pre", { class: "st-out" }), pic = h("div"), note = h("p", { class: "small", style: "margin:8px 0 0" });
    const VERS = [
      { lab: "no __str__", body: [], out: "<__main__.Food object at 0x10a3c2f50>", note: "Python does not know how to describe a Food, so it shows the class name and the memory address. Not useful." },
      { lab: "with __str__ (return)", body: ["", "    def __str__(self):", "        return f'{self.name}: {self.calories} kcal'"], out: "chips: 150 kcal", note: "<code>print</code> asks the object to describe itself: it calls <code>chips.__str__()</code> and prints the string that comes back." },
      { lab: "__str__ prints (bug)", body: ["", "    def __str__(self):", "        print(f'{self.name}: {self.calories} kcal')"], out: "chips: 150 kcal\nTypeError: __str__ returned non-string (type NoneType)", note: "The <code>print</code> inside runs first (that is the first line), but the method gives back <code>None</code>. <code>__str__</code> must <b>return</b> a string." },
    ];
    const ctl = segCtl(VERS.map(x => x.lab), i => { v = i; draw(); }, "Version");
    function draw() {
      const V = VERS[v];
      const src = ["class Food:", "    def __init__(self, name, calories):", "        self.name = name", "        self.calories = calories", ...V.body, "", "chips = Food('chips', 150)", "print(chips)"];
      codeBox.replaceChildren(ui.code({ code: src, active: V.body.length ? [6, 7] : [], bad: v === 2 ? [7] : [] }));
      out.textContent = V.out;
      out.classList.toggle("oop-errout", v === 2);
      const S = D.svg({ w: 400, h: 200, label: "how print finds the text" });
      S.box(130, 6, 140, 34, { text: "print(chips)", tone: "accent" });
      S.arrow(200, 42, 200, 66, { tone: "accent" });
      S.box(110, 70, 180, 40, { text: "Food has __str__?", tone: "cmp" });
      const yes = v > 0;
      S.arrow(150, 112, 80, 146, { tone: yes ? (v === 1 ? "done" : "swap") : null, faded: !yes, label: "yes" });
      S.arrow(250, 112, 320, 146, { tone: yes ? null : "accent", faded: yes, label: "no" });
      S.box(4, 150, 170, 44, { text: "call chips.__str__()", sub: v === 2 ? "gives back None ✗" : "gives back a string", tone: yes ? (v === 1 ? "done" : "swap") : null, faded: !yes });
      S.box(226, 150, 170, 44, { text: "use the default", sub: "<…object at 0x…>", tone: yes ? null : "accent", faded: yes });
      pic.replaceChildren(S.el);
      note.innerHTML = V.note;
      pop(out);
    }
    el.append(ctl.el, h("div", { class: "oop-two", style: "margin-top:12px" }, h("div", null, codeBox, eyebrow("Output"), out), h("div", null, pic, note)));
    draw();
  }

  const strSteps = [
    { line: 8, now: "Build the object (as before).", frames: [{ name: "global", vars: { chips: "<Food>" } }] },
    { line: 9, now: "<code>print(chips)</code>: print needs text. It asks the object: <i>“describe yourself”</i>. That means calling <code>chips.__str__()</code>." },
    { line: 5, now: "A new frame. <code>self</code> is <code>chips</code>.", frames: [{ name: "global", vars: { chips: "<Food>" } }, { name: "__str__", vars: { self: "chips" } }] },
    { line: 6, now: "Build the f-string with the real values: <code>f'{self.name}: {self.calories} kcal'</code> → <b>'chips: 150 kcal'</b>. Return it.", frames: [{ name: "global", vars: { chips: "<Food>" } }, { name: "__str__", vars: { self: "chips" }, note: "returning 'chips: 150 kcal'" }] },
    { line: 9, now: "Back in <code>print</code>. It got a string, so it shows it (without quotes).", frames: [{ name: "global", vars: { chips: "<Food>" } }], print: "chips: 150 kcal" },
    { line: 10, now: "<code>str(chips)</code> also calls <code>__str__</code>. Now the text is stored in a variable.", frames: [{ name: "global", vars: { chips: "<Food>", text: "'chips: 150 kcal'" } }] },
    { line: 11, now: "An f-string calls it too.", print: "I ate chips: 150 kcal" },
  ];

  const strTopic = {
    id: "str",
    title: "__str__ & printing",
    summary: "<code>print(obj)</code> asks the object to describe itself by calling <code>__str__</code>. It must <b>return</b> a string.",
    exam: ["Q1 print a selection of objects"],
    sources: "NB §18.1, cells 133–134",
    blocks: [
      { type: "h", text: "Why print(obj) looks ugly", sub: "Switch between the versions." },
      { type: "widget", render: strWidget },
      { type: "callout", kind: "rule", title: "The one rule", html: "<p><code>__str__(self)</code> must <b>return</b> a string. Never <code>print</code> inside it. Python prints what you return.</p>" },

      { type: "h", text: "What happens inside print(chips)" },
      {
        type: "stepper",
        title: "print asks the object",
        code: `
          class Food:
              def __init__(self, name, calories):
                  self.name = name
                  self.calories = calories
              def __str__(self):
                  return f'{self.name}: {self.calories} kcal'

          chips = Food('chips', 150)
          print(chips)
          text = str(chips)
          print(f'I ate {text}')`,
        what: {
          5: "Two underscores on each side. Python calls it for you.",
          6: "Build the description from this object's attributes and give it back.",
          8: "Make one Food.",
          9: "print calls chips.__str__() behind the scenes.",
          10: "str() calls __str__ too.",
          11: "Put the text inside another string.",
        },
        steps: strSteps,
      },
      { type: "table", caption: "Who calls __str__ for you?", head: ["You write", "Uses __str__?", "Result (chips = Food('chips', 150))"], code: [0], rows: [
        ["print(chips)", "<span class='ok'>yes</span>", "<code>chips: 150 kcal</code>"],
        ["str(chips)", "<span class='ok'>yes</span>", "<code>'chips: 150 kcal'</code>"],
        ["f'{chips}'", "<span class='ok'>yes</span>", "<code>'chips: 150 kcal'</code>"],
        ["print([chips])", "<span class='bad'>no</span>", "<code>[&lt;__main__.Food object at 0x…&gt;]</code>"],
      ] },
      { type: "callout", kind: "exam", title: "Exam Q1: “print a small selection”", html: "<p>Loop and print each object, so <code>__str__</code> is used:</p>", code: "for food in snacks[:5]:      # the first 5\n    print(food)              # calls __str__ for each one" },

      { type: "h", text: "Building the string" },
      { type: "table", head: ["Way", "Tiny example (calories = 150)", "Gives"], code: [1], rows: [
        ["f-string (easiest)", "f'{self.name}: {self.calories} kcal'", "<code>'chips: 150 kcal'</code>"],
        ["<code>+</code> with <code>str()</code>", "self.name + ': ' + str(self.calories) + ' kcal'", "<code>'chips: 150 kcal'</code>"],
        ["<code>+</code> without <code>str()</code>", "self.name + ': ' + self.calories", "<span class='bad'>TypeError: can only concatenate str (not \"int\") to str</span>"],
      ] },
      {
        type: "tryit",
        title: "Exercise 4 Q6: give Employee a __str__",
        task: "Write <code>__str__</code> so that <code>print(e)</code> shows <code>Gerry (Junior), salary 3000</code>.",
        code: `
          class Employee:
              def __init__(self, name, position, salary):
                  self.name = name
                  self.position = position
                  self.salary = salary

              # write __str__ here

          e = Employee('Gerry', 'Junior', 3000)
          print(e)`,
        expectOutput: "Gerry (Junior), salary 3000",
        hint: "<code>def __str__(self):</code> then <code>return f'{self.name} ({self.position}), salary {self.salary}'</code>.",
        solution: `
          class Employee:
              def __init__(self, name, position, salary):
                  self.name = name
                  self.position = position
                  self.salary = salary

              def __str__(self):
                  return f'{self.name} ({self.position}), salary {self.salary}'

          e = Employee('Gerry', 'Junior', 3000)
          print(e)`,
      },
      { type: "mistakes", items: [
        { title: "Printing instead of returning", wrong: "def __str__(self):\n    print(self.name)", right: "def __str__(self):\n    return self.name", why: "<code>TypeError: __str__ returned non-string (type NoneType)</code>. The same print-vs-return mix-up as in functions." },
        { title: "Returning a number", wrong: "def __str__(self):\n    return self.calories", right: "def __str__(self):\n    return str(self.calories)", why: "<code>TypeError: __str__ returned non-string (type int)</code>." },
        { title: "Gluing a number with <code>+</code>", wrong: "return 'Food ' + self.id", right: "return f'Food {self.id}'", why: "<code>TypeError: can only concatenate str (not \"int\") to str</code>. f-strings convert for you." },
        { title: "Misspelling the name", wrong: "def _str_(self):\ndef __str(self):", right: "def __str__(self):", why: "No error at all: Python simply never calls it, and you still see <code>&lt;…object at 0x…&gt;</code>. Two underscores on each side." },
        { title: "Forgetting <code>self.</code> inside", wrong: "return f'{name}: {calories} kcal'", right: "return f'{self.name}: {self.calories} kcal'", why: "<code>NameError: name 'name' is not defined</code>. The attributes live on <code>self</code>." },
      ] },
    ],
    quiz: [
      { type: "predict", q: "What does this print?", code: "class Coin:\n    def __init__(self, value):\n        self.value = value\n\n    def __str__(self):\n        return f'{self.value} kr coin'\n\nc = Coin(5)\nprint(c)", answer: "5 kr coin",
        hint: "print calls <code>__str__</code> and shows what it returns.", explain: "<code>print(c)</code> → <code>c.__str__()</code> → <code>'5 kr coin'</code>, shown without quotes." },
      { type: "mc", q: "Same <code>Coin</code> class. What does <code>print([Coin(5), Coin(10)])</code> show?",
        options: ["<code>[5 kr coin, 10 kr coin]</code>", "<code>['5 kr coin', '10 kr coin']</code>", "<code>[&lt;__main__.Coin object at 0x…&gt;, &lt;__main__.Coin object at 0x…&gt;]</code>", "An error"], answer: 2,
        hint: "Is <code>__str__</code> used for the items inside a printed list?", explain: "Printing a list shows each item with <code>repr()</code>, not <code>__str__</code>. Loop and print each coin instead." },
      { type: "mc", q: "What happens?", code: "class Coin:\n    def __init__(self, value):\n        self.value = value\n\n    def __str__(self):\n        print(f'{self.value} kr coin')\n\nprint(Coin(5))",
        options: ["It prints <code>5 kr coin</code> once", "It prints <code>5 kr coin</code>, then <code>None</code>", "It prints <code>5 kr coin</code>, then crashes with a TypeError", "It crashes before printing anything"], answer: 2,
        hint: "The inner <code>print</code> runs first. What does the method return?", explain: "The inner <code>print</code> shows the text, then the method returns <code>None</code>, and the outer <code>print</code> fails: <code>TypeError: __str__ returned non-string (type NoneType)</code>." },
      { type: "bug", q: "<code>print(Food('chips', 150))</code> should show <code>chips: 150 kcal</code>. Click every buggy line.", code: `
          class Food:
              def __init__(self, name, calories):
                  self.name = name
                  self.calories = calories

              def __str__(self):
                  return self.name + ': ' + self.calories + ' kcal'`,
        bugs: [7], notes: { 7: "<code>self.calories</code> is an int: <code>+</code> cannot glue it to text. Use <code>str(self.calories)</code> or an f-string." },
        fixed: `
          class Food:
              def __init__(self, name, calories):
                  self.name = name
                  self.calories = calories

              def __str__(self):
                  return f'{self.name}: {self.calories} kcal'`,
        hint: "Which value is not a string?", explain: "This is a runtime error: <code>TypeError: can only concatenate str (not \"int\") to str</code>." },
      { type: "write", q: "Write <code>__str__</code> for <code>Vehicle</code> so that <code>str(Vehicle('V1', 120))</code> is <code>'Vehicle V1: 120 kr/hour'</code>.",
        starter: `
          class Vehicle:
              def __init__(self, vehicle_id, price):
                  self.vehicle_id = vehicle_id
                  self.price = price

              # __str__ here

          print(Vehicle('V1', 120))`,
        checks: [["str(Vehicle('V1', 120))", "'Vehicle V1: 120 kr/hour'"], ["str(Vehicle('E7', 80))", "'Vehicle E7: 80 kr/hour'"]],
        solution: `
          class Vehicle:
              def __init__(self, vehicle_id, price):
                  self.vehicle_id = vehicle_id
                  self.price = price

              def __str__(self):
                  return f'Vehicle {self.vehicle_id}: {self.price} kr/hour'`,
        hint: "An f-string with <code>{self.vehicle_id}</code> and <code>{self.price}</code>. Return it.",
        explain: "Watch the exact text: spaces, the colon and <code>kr/hour</code>." },
    ],
  };

  /* ================================================================
     TOPIC 4: Class vs instance variables
     ================================================================ */

  // --- stepper data: the unique-ID counter (right and buggy versions) ---
  function counterSteps(buggy) {
    const people = [["e1", "'Gerry'"], ["e2", "'Vincent'"], ["e3", "'Gerry'"]];
    let next = 1;
    const made = []; // [{ id, title, fields }]
    const names = [];
    const cls = (mk) => ({ name: "Employee", vars: [["next_id", String(next), mk]], methods: ["__init__(self, name)"] });
    const snap = (extra) => made.map(o => ({ id: o.id, title: o.title, fields: o.fields.map(f => f.slice()) , ...(extra && extra[o.id] || {}) }));
    const S = [{ line: 2, now: "The class body runs once. <code>next_id = 1</code> is a <b>class variable</b>: it lives on the blueprint, <b>one copy</b> for everyone.", vars: { "Employee.next_id": "1" }, w: { cls: cls("cmp"), objs: [] } }];
    people.forEach(([nm, who], k) => {
      const ob = { id: "o" + k, title: "Employee object", fields: [] };
      made.push(ob);
      const nmList = names.slice();
      const withSelf = () => nmList.concat([{ name: "self", to: ob.id, tone: "min" }]);
      S.push({ line: 9 + k, now: `<code>Employee(${who})</code>: a new empty object; <code>__init__</code> runs with <b>self</b> pointing at it.`, w: { cls: cls(), objs: snap(), names: withSelf() } });
      ob.fields.push(["name", who, "cmp"]);
      S.push({ line: 5, now: `<code>self.name = ${who}</code>: an <b>instance variable</b>, stored on this object only.`, w: { cls: cls(), objs: snap(), names: withSelf() } });
      ob.fields[0][2] = null;
      if (!buggy) {
        ob.fields.push(["id", String(next), "cmp"]);
        S.push({ line: 6, now: `Read the shared counter: <code>Employee.next_id</code> is ${next}, so <b>self.id = ${next}</b>.`, w: { cls: cls("accent"), objs: snap(), names: withSelf() } });
        ob.fields[1][2] = null;
        next++;
        S.push({ line: 7, now: `<code>Employee.next_id += 1</code> changes the <b>class</b> copy: ${next - 1} → <b>${next}</b>. The next employee will get ${next}.`, vars: { "Employee.next_id": String(next) }, w: { cls: cls("cmp"), objs: snap(), names: withSelf() } });
      } else {
        ob.fields.push(["id", "1", "cmp"]);
        S.push({ line: 6, now: `<code>self.next_id</code>: the object has no <code>next_id</code>, so Python looks on the class and finds <b>1</b>. self.id = 1.`, w: { cls: cls("accent"), objs: snap(), names: withSelf() } });
        ob.fields[1][2] = null;
        ob.fields.push(["next_id", "2", "swap"]);
        S.push({ line: 7, now: "<code>self.next_id += 1</code> means <code>self.next_id = self.next_id + 1</code> = 1 + 1. The <b>assignment</b> sticks a new <code>next_id = 2</code> note <b>on this object</b>. The class copy stays <b>1</b>!", w: { cls: cls(), objs: snap(), names: withSelf() } });
        ob.fields[2][2] = null;
      }
      names.push({ name: nm, to: ob.id });
      S.push({ line: 9 + k, now: `<code>__init__</code> is done. The object gets the name <code>${nm}</code>.`, w: { cls: cls(), objs: snap(), names: names.slice() } });
    });
    S.push({ line: 12, now: buggy ? "Every employee got ID 1. <b>Not unique!</b> No error, just a wrong answer (a Wing 3 bug)." : "Three different IDs, even for two people both called Gerry. The counter is ready for the next one: 4.",
      print: buggy ? "1 1 1 1" : "1 2 3 4", w: { cls: cls(buggy ? "swap" : "done"), objs: snap(), names: names.slice() } });
    return S;
  }
  const counterCode = buggy => `
    class Employee:
        next_id = 1                          # class variable: ONE shared copy

        def __init__(self, name):
            self.name = name                 # instance variable: one per object
            self.id = ${buggy ? "self.next_id   " : "Employee.next_id"}      # take the next free number
            ${buggy ? "self.next_id += 1    " : "Employee.next_id += 1"}        # ${buggy ? "BUG: makes a note on self" : "bump it through the CLASS"}

    e1 = Employee('Gerry')
    e2 = Employee('Vincent')
    e3 = Employee('Gerry')
    print(e1.id, e2.id, e3.id, Employee.next_id)`;
  const counterStepper = buggy => ({
    type: "stepper",
    title: buggy ? "self.next_id += 1 (bug)" : "Employee.next_id += 1 (right)",
    code: counterCode(buggy),
    what: {
      1: "The blueprint.",
      2: "A class variable: written in the class body, not inside a method. One copy, shared.",
      4: "Runs for every new employee.",
      5: "An instance variable: each object gets its own.",
      6: buggy ? "Reads next_id: not on the object, so Python finds the class one." : "Read the shared counter through the class name.",
      7: buggy ? "An assignment through self creates an instance variable on the object." : "Change the shared counter through the class name.",
      9: "Build employee 1.", 10: "Build employee 2.", 11: "Build employee 3.", 12: "Show the IDs and the counter.",
    },
    steps: counterSteps(buggy),
    visualTitle: "The blueprint (purple) and the objects",
    legend: [["cmp", "just changed"], ["held", "being read"], ["swap", "the bug"]],
    visual: worldVisual,
  });

  const classVars = {
    id: "class-vars",
    title: "Class vs instance variables",
    summary: "A class variable lives on the blueprint (one shared copy); <code>self.x</code> lives on each object. The unique-ID counter, <code>isinstance</code> and <code>@property</code>.",
    exam: ["Q1 unique ID"],
    sources: "NB §20, cells 146–151 · L5 p42–43",
    blocks: [
      { type: "h", text: "Two kinds of variables" },
      { type: "table", head: ["", "Class variable", "Instance variable"], rows: [
        ["Written where?", "in the class body, outside any method", "inside a method, as <code>self.x = …</code>"],
        ["How many copies?", "<b>one</b>, shared by all objects", "one <b>per object</b>"],
        ["Tiny example", "<code>next_id = 1</code>", "<code>self.name = name</code>"],
        ["Change it with", "<code>Employee.next_id += 1</code>", "<code>self.name = 'Ann'</code>"],
        ["Good for", "counters, settings for all (<code>interest_rate</code>)", "what makes each object different"],
      ] },

      { type: "h", text: "The unique-ID counter", sub: "This is exam Q1's “unique ID”. Step through both versions." },
      { type: "switch", label: "How the counter is bumped", items: [
        { label: "Employee.next_id += 1 (right)", blocks: [counterStepper(false)] },
        { label: "self.next_id += 1 (bug)", blocks: [counterStepper(true)] },
      ] },
      { type: "callout", kind: "rule", title: "Reading vs assigning through self", html: "<p><b>Reading</b> <code>self.x</code>: Python looks on the object first, then on the class. <b>Assigning</b> <code>self.x = …</code> always writes on the object. So change a class variable through the <b>class name</b>.</p>" },
      { type: "callout", kind: "exam", title: "Exam Q1 and Exercise 4 Q7", html: "<p>“Each instance must have a unique ID” = a class counter, read into <code>self.id</code>, then bumped through the class. Exercise 4 Q3 asked if a user-typed ID guarantees uniqueness: <b>no</b>, two people can type the same number. The counter can't repeat.</p>" },

      { type: "h", text: "An object can hide a class variable", sub: "BankAccount (NB cell 149)" },
      { type: "code", code: `
          class BankAccount:
              interest_rate = 0.05                 # class variable

              def __init__(self, owner, balance):
                  self.owner = owner
                  self.balance = balance

          acct1 = BankAccount('anand', 500)
          acct3 = BankAccount('lara', 100)
          acct3.interest_rate = 0.10               # makes a NEW variable on acct3 only

          print(acct3.interest_rate)               # 0.1   acct3's own
          print(acct1.interest_rate)               # 0.05  found on the class
          print(BankAccount.interest_rate)         # 0.05  unchanged` },
      { type: "table", caption: "Where Python finds acct.interest_rate", head: ["Look in", "acct3", "acct1"], rows: [
        ["1. the object", "<span class='ok'>found 0.1 ✓</span> (stop)", "not here"],
        ["2. its class", "<span class='muted'>not checked</span>", "<span class='ok'>found 0.05 ✓</span>"],
      ] },
      {
        type: "tryit",
        title: "A shared list by accident (Assignment 2 bug)",
        task: "<code>rental_history</code> is a class variable, so all vehicles share <b>one</b> list. Run it: the bike shows Ann's rental. Fix it by making the list in <code>__init__</code> with <code>self.</code>.",
        code: `
          class Vehicle:
              rental_history = []                  # one list for ALL vehicles

              def __init__(self, vehicle_id):
                  self.vehicle_id = vehicle_id

              def rent(self, customer):
                  self.rental_history.append(customer)   # reads the shared list

          car = Vehicle('C1')
          bike = Vehicle('B1')
          car.rent('Ann')
          print(bike.rental_history)               # ['Ann'] ?!`,
        expectOutput: "[]",
        solution: `
          class Vehicle:
              def __init__(self, vehicle_id):
                  self.vehicle_id = vehicle_id
                  self.rental_history = []         # a NEW list for each vehicle

              def rent(self, customer):
                  self.rental_history.append(customer)

          car = Vehicle('C1')
          bike = Vehicle('B1')
          car.rent('Ann')
          print(bike.rental_history)               # []`,
        solutionNote: "<code>.append</code> does not assign, so it never makes a private copy: it changes the one shared list.",
      },

      { type: "h", text: "type() vs isinstance()" },
      { type: "table", head: ["Python", "Result", "Why"], code: [0], rows: [
        ["isinstance(5, (int, float))", "<code>True</code>", "a tuple of types: any of them is fine"],
        ["isinstance('5', (int, float))", "<code>False</code>", "text is not a number"],
        ["isinstance(m, Employee)", "<code>True</code>", "m = Manager(…), and a Manager <b>is an</b> Employee"],
        ["type(m) == Employee", "<code>False</code>", "<code>type</code> wants the exact class: Manager"],
      ] },
      `<p>Use <code>isinstance</code> to check input (Exercise 5 Q14: “salary must be a number”): <code>if not isinstance(salary, (int, float)): raise TypeError(…)</code>.</p>`,

      { type: "h", text: "@property: an attribute that checks itself", sub: "Bonus (NB §19.3). Not needed for Q1, but nice to recognise." },
      {
        type: "tryit",
        title: "CheckedCircle",
        task: "Run it. Then remove the <code>#</code> before the last line: setting a negative radius is refused.",
        code: `
          class CheckedCircle:
              def __init__(self, radius):
                  self.radius = radius                  # goes through the setter below

              @property
              def radius(self):                         # runs when you READ c.radius
                  return self._radius

              @radius.setter
              def radius(self, value):                  # runs when you SET c.radius = ...
                  if value < 0:
                      raise ValueError("Radius can't be negative")
                  self._radius = value

          c = CheckedCircle(5)
          print(c.radius)                               # 5
          c.radius = 2                                  # allowed
          print(c.radius)                               # 2
          # c.radius = -5                               # ValueError`,
      },
      { type: "mistakes", items: [
        { title: "Bumping the counter through <code>self</code>", wrong: "self.next_id += 1", right: "Employee.next_id += 1", why: "Through <code>self</code> it makes a private copy on the object. The class counter never moves, so every ID is 1." },
        { title: "Forgetting the class name when reading", wrong: "self.id = next_id", right: "self.id = Employee.next_id", why: "Plain <code>next_id</code> is not a variable in the method: <code>NameError: name 'next_id' is not defined</code>." },
        { title: "Forgetting to bump at all", wrong: "self.id = Employee.next_id", right: "self.id = Employee.next_id\nEmployee.next_id += 1", why: "Then every object gets the same ID." },
        { title: "A list as a class variable", wrong: "class Vehicle:\n    rental_history = []", right: "def __init__(self):\n    self.rental_history = []", why: "One list shared by every vehicle. Per-object data belongs in <code>__init__</code>." },
        { title: "Checking type with <code>==</code>", wrong: "type(salary) == int", right: "isinstance(salary, (int, float))", why: "<code>type ==</code> rejects 3000.5 and ignores subclasses." },
      ] },
    ],
    quiz: [
      { type: "predict", q: "What does this print?", code: "class Ticket:\n    next_number = 100\n\n    def __init__(self):\n        self.number = Ticket.next_number\n        Ticket.next_number += 1\n\na = Ticket()\nb = Ticket()\nc = Ticket()\nprint(a.number, c.number, Ticket.next_number)", answer: "100 102 103",
        hint: "Start at 100 and add 1 after each ticket.", explain: "a gets 100, b 101, c 102. After c the counter is 103." },
      { type: "predict", q: "What does this print?", code: "class Ticket:\n    next_number = 100\n\n    def __init__(self):\n        self.number = self.next_number\n        self.next_number += 1\n\na = Ticket()\nb = Ticket()\nprint(a.number, b.number, Ticket.next_number)", answer: "100 100 100",
        hint: "Does <code>self.next_number += 1</code> change the class variable?", explain: "The assignment through <code>self</code> makes a new <code>next_number</code> on each object. The class copy stays 100, so every ticket gets 100." },
      { type: "mc", q: "Where should a <b>unique-ID counter</b> live?", options: ["In <code>__init__</code> as <code>self.next_id = 1</code>", "In the class body as <code>next_id = 1</code>, changed with <code>ClassName.next_id += 1</code>", "In a local variable inside <code>__init__</code>", "As a parameter of <code>__init__</code>"], answer: 1,
        hint: "It must be shared by all objects and survive between calls.", explain: "<code>self.next_id = 1</code> would reset to 1 for every object. Only a class variable is shared and remembered." },
      { type: "predict", q: "What does this print?", code: "class Shop:\n    discount = 0.1\n\ns1 = Shop()\ns2 = Shop()\ns2.discount = 0.5\nShop.discount = 0.2\nprint(s1.discount, s2.discount)", answer: "0.2 0.5",
        hint: "s2 has its own <code>discount</code>; s1 does not.", explain: "s1 has no own copy, so it reads the class: 0.2 (after the change). s2 got its own 0.5, which hides the class one." },
      { type: "write", q: "Write <code>Customer</code>: <code>Customer(name)</code> stores the name and gives each customer a unique <code>customer_id</code>, starting at <b>1</b>. Use a class counter.",
        starter: `
          class Customer:
              # class counter here

              def __init__(self, name):
                  pass

          a = Customer('Ann')
          b = Customer('Bo')
          print(a.customer_id, b.customer_id)`,
        test: "x = Customer('X')\ny = Customer('Y')\nz = Customer('X')\nassert x.name == 'X', 'store the name in self.name'\nassert y.customer_id == x.customer_id + 1 and z.customer_id == y.customer_id + 1, 'each new customer should get the next number'\nassert len({x.customer_id, y.customer_id, z.customer_id}) == 3, 'IDs must be unique'\nassert Customer.next_id == z.customer_id + 1, 'call the class counter next_id and bump it through Customer.next_id'",
        solution: `
          class Customer:
              next_id = 1                              # shared counter

              def __init__(self, name):
                  self.name = name
                  self.customer_id = Customer.next_id  # take the next number
                  Customer.next_id += 1                # bump it through the CLASS`,
        hint: "Copy the Employee pattern: <code>next_id = 1</code> in the class body; in <code>__init__</code> read it into <code>self.customer_id</code>, then <code>Customer.next_id += 1</code>.",
        explain: "The test calls the counter <code>next_id</code>. Any name works in your own code, as long as it is a class variable bumped through the class." },
    ],
  };

  /* ================================================================
     TOPIC 5: Inheritance & super()
     ================================================================ */

  // --- widget: inheritance tree with animated method lookup ---
  const TREE = {
    object: { x: 125, y: 4, w: 190, parent: null, methods: ["__init__  (default)", "__str__   (default)", "__eq__    (same as is)"], keys: ["__init__", "__str__", "__eq__"] },
    SocialMediaPost: { x: 125, y: 104, w: 190, parent: "object", methods: ["__init__", "like", "is_within_limit  (1000)", "__str__"], keys: ["__init__", "like", "is_within_limit", "__str__"] },
    InstagramPost: { x: 4, y: 236, w: 190, parent: "SocialMediaPost", methods: ["__init__  (+ hashtags)"], keys: ["__init__"] },
    XPost: { x: 246, y: 236, w: 190, parent: "SocialMediaPost", methods: ["is_within_limit  (280)"], keys: ["is_within_limit"] },
  };
  const boxH = c => 30 + TREE[c].methods.length * 18;
  function chain(c) { const out = []; for (let k = c; k; k = TREE[k].parent) out.push(k); return out; }

  function lookupWidget(el, api) {
    const OBJS = [["insta", "InstagramPost"], ["xp", "XPost"], ["post", "SocialMediaPost"]];
    const CALLS = [["like()", "like"], ["is_within_limit()", "is_within_limit"], ["print(obj)", "__str__"], ["__init__ (building it)", "__init__"], ["obj == other", "__eq__"], ["share()", "share"]];
    let oi = 0, ci = 0, timer = null, state = { checked: [], found: null, cur: null, done: false };
    const pic = h("div"), log = h("ol", { class: "oop-log", "aria-live": "polite" }), result = h("p", { class: "oop-result" });
    const stop = () => { if (timer) { clearTimeout(timer); timer = null; } };
    api.onCleanup(stop);
    const oCtl = segCtl(OBJS.map(o => o[0] + " = " + o[1] + "(…)"), i => { oi = i; run(); }, "Which object");
    const cCtl = segCtl(CALLS.map(c => c[0]), i => { ci = i; run(); }, "Which call");
    const again = h("button", { type: "button", class: "btn small" }, "Replay");
    again.onclick = () => run();
    function draw() {
      const S = D.svg({ w: 440, h: 330, label: "inheritance tree with method lookup" });
      const cls = OBJS[oi][1];
      Object.keys(TREE).forEach(k => {
        const t = TREE[k];
        if (t.parent) { const p = TREE[t.parent]; S.arrow(t.x + t.w / 2, t.y, p.x + p.w / 2, p.y + boxH(t.parent) + 2, { tone: "muted" }); }
      });
      Object.keys(TREE).forEach(k => {
        const t = TREE[k], hh = boxH(k);
        const isCur = state.cur === k, isFound = state.found === k && state.done, wasChecked = state.checked.includes(k) && !isFound && !isCur;
        const tone = isFound ? "done" : isCur ? "cmp" : wasChecked ? "swap" : k === cls ? "accent" : null;
        S.box(t.x, t.y, t.w, hh, { tone, faded: !chain(cls).includes(k) });
        S.text(t.x + 10, t.y + 15, k + (wasChecked ? "  ✗" : isFound ? "  ✓" : ""), { anchor: "start", size: 13, weight: 600, faded: !chain(cls).includes(k) });
        t.methods.forEach((m, i) => {
          const my = t.y + 34 + i * 18;
          if (isFound && t.keys[i] === CALLS[ci][1]) S.box(t.x + 4, my - 9, t.w - 8, 18, { tone: "done", rx: 4 });
          S.text(t.x + 12, my, m, { anchor: "start", small: true, faded: !chain(cls).includes(k) });
        });
      });
      const t = TREE[cls];
      S.box(t.x + 35, 300, 120, 26, { text: OBJS[oi][0], rx: 13, tone: "min" });
      S.arrow(t.x + 95, 298, t.x + 95, t.y + boxH(cls) + 3, { tone: "min" });
      pic.replaceChildren(S.el);
    }
    function run() {
      stop();
      const cls = OBJS[oi][1], key = CALLS[ci][1], ch = chain(cls);
      state = { checked: [], found: null, cur: null, done: false };
      log.replaceChildren();
      result.textContent = "";
      let k = 0;
      const reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const tick = () => {
        if (k >= ch.length) {
          state.cur = null; state.done = true; draw();
          result.innerHTML = `<span class="oop-bad">Not found anywhere.</span> <code>AttributeError: '${cls}' object has no attribute '${key}'</code>`;
          return;
        }
        const c = ch[k];
        state.cur = c; state.checked.push(c);
        const hit = TREE[c].keys.includes(key);
        log.appendChild(h("li", { html: `Look in <b>${c}</b>: ${hit ? `<span class="oop-ok">found <code>${key}</code> ✓</span>` : `no <code>${key}</code> here ✗`}` }));
        if (hit) {
          state.found = c; state.done = true; state.cur = null; draw();
          const extra = c === cls ? "its own class has it, so this one is used (it <b>overrides</b> any parent version)." : `inherited from <b>${c}</b>.`;
          result.innerHTML = `Runs <code>${c}.${key}(${OBJS[oi][0]}${key === "__eq__" ? ", other" : ""})</code>: ${extra}`;
          return;
        }
        draw();
        k++;
        timer = setTimeout(tick, reduce ? 0 : 650);
      };
      draw();
      timer = setTimeout(tick, reduce ? 0 : 300);
    }
    el.append(h("p", { class: "small muted", style: "margin:0 0 6px" }, "1. Pick an object"), oCtl.el,
      h("p", { class: "small muted", style: "margin:12px 0 6px" }, "2. Pick what to call"), row(cCtl.el, again),
      h("div", { class: "oop-two", style: "margin-top:12px" }, pic, h("div", null, eyebrow("Python searches upwards", "margin:0 0 6px"), log, result)));
    run();
  }

  // --- stepper data: super().__init__ relay ---
  const SI = (fields) => ({ id: "i", title: "InstagramPost object", fields });
  const GI = { insta: "<post>" };
  const superSteps = [
    { line: 14, now: "Build an InstagramPost. A new empty object; Python looks for <code>__init__</code> and finds <b>InstagramPost's own</b>.", frames: [{ name: "global", vars: {} }, { name: "InstagramPost.__init__", vars: { self: "new object", author: "'anand'", content: "'hi'", hashtags: "['cbs']" } }],
      w: { objs: [SI([])], names: [{ name: "self", to: "i", tone: "min" }] } },
    { line: 11, now: "<code>super().__init__(author, content)</code>: hand <code>author</code> and <code>content</code> <b>up</b> to the parent's <code>__init__</code>. Note: no <code>self</code> in the brackets. super() passes it.",
      frames: [{ name: "global", vars: {} }, { name: "InstagramPost.__init__", vars: { self: "new object", author: "'anand'", content: "'hi'", hashtags: "['cbs']" } }, { name: "SocialMediaPost.__init__", vars: { self: "same object", author: "'anand'", content: "'hi'" } }] },
    { line: 3, now: "The <b>parent</b> sets up its part, on the <b>same</b> object.", w: { objs: [SI([["author", "'anand'", "min"]])], names: [{ name: "self", to: "i", tone: "min" }] } },
    { line: 4, now: "…content…", w: { objs: [SI([["author", "'anand'"], ["content", "'hi'", "min"]])], names: [{ name: "self", to: "i", tone: "min" }] } },
    { line: 5, now: "…and likes = 0. The parent's <code>__init__</code> is done; its frame goes away.", w: { objs: [SI([["author", "'anand'"], ["content", "'hi'"], ["likes", "0", "min"]])], names: [{ name: "self", to: "i", tone: "min" }] } },
    { line: 12, now: "Back in the child. Now add what is <b>new</b> in InstagramPost: <code>self.hashtags</code>.",
      frames: [{ name: "global", vars: {} }, { name: "InstagramPost.__init__", vars: { self: "new object", author: "'anand'", content: "'hi'", hashtags: "['cbs']" } }],
      w: { objs: [SI([["author", "'anand'"], ["content", "'hi'"], ["likes", "0"], ["hashtags", "['cbs']", "cmp"]])], names: [{ name: "self", to: "i", tone: "min" }] } },
    { line: 14, now: "Done. The name <code>insta</code> goes on the finished object: 3 attributes from the parent, 1 of its own.", frames: [{ name: "global", vars: GI }],
      w: { objs: [SI([["author", "'anand'"], ["content", "'hi'"], ["likes", "0"], ["hashtags", "['cbs']"]])], names: [{ name: "insta", to: "i" }] } },
    { line: 15, now: "<code>like()</code> is not in InstagramPost, so Python finds it in SocialMediaPost (inherited).", w: { objs: [SI([["author", "'anand'"], ["content", "'hi'"], ["likes", "1", "cmp"], ["hashtags", "['cbs']"]])], names: [{ name: "insta", to: "i" }] } },
    { line: 16, now: "All four attributes are there.", print: "anand 1 ['cbs']" },
  ];

  // override vs extend vs inherit
  const depositVersion = (body, out, note) => el => {
    el.append(h("div", { class: "oop-two" }, ui.code({ code: [
      "class BankAccount:",
      "    def __init__(self, owner, balance):",
      "        self.owner = owner",
      "        self.balance = balance",
      "",
      "    def deposit(self, amount):",
      "        self.balance += amount",
      "",
      "class BusinessAccount(BankAccount):",
      "    def __init__(self, owner, balance, fee):",
      "        super().__init__(owner, balance)",
      "        self.fee = fee",
      ...body,
      "",
      "acct = BusinessAccount('cbs', 500, 5)",
      "acct.deposit(100)",
      "print(acct.balance)"], active: body.length ? [14, 15] : [] }),
    h("div", null, eyebrow("Output", "margin:0 0 6px"), h("pre", { class: "st-out" }, out), h("p", { class: "small", style: "margin:8px 0 0", html: note }))));
  };

  const inheritance = {
    id: "inheritance",
    title: "Inheritance & super()",
    summary: "A subclass gets everything from its parent, then adds or replaces. Python finds a method by searching upwards. <code>super().__init__</code> lets the parent set up its part.",
    exam: ["Q1 Food → Snacks, Beverages"],
    sources: "L4 p18–22 · NB §19, cells 138–141 · L5 p4, p42",
    blocks: [
      { type: "h", text: "A subclass is a special kind of its parent" },
      { type: "code", code: `
          class InstagramPost(SocialMediaPost):     # parent class in the brackets
              def __init__(self, author, content, hashtags):
                  super().__init__(author, content) # let the parent set up its part
                  self.hashtags = hashtags          # then add what is new

          class XPost(SocialMediaPost):
              def is_within_limit(self):            # same name as the parent's: replaces it
                  return len(self.content) <= 280` },
      { type: "table", head: ["Word", "Meaning", "Example"], rows: [
        ["superclass / parent", "the general class", "<code>SocialMediaPost</code>, <code>Food</code>"],
        ["subclass / child", "a special kind of it", "<code>XPost</code>, <code>Snacks</code>"],
        ["inherit", "the child gets all the parent's methods for free", "<code>insta.like()</code> works without writing <code>like</code> again"],
        ["override", "the child writes a method with the <b>same name</b>: it replaces the parent's", "<code>XPost.is_within_limit</code> (280, not 1000)"],
        ["extend", "the child's method calls the parent's with <code>super()</code>, then adds more", "<code>InstagramPost.__init__</code>"],
      ] },

      { type: "h", text: "How Python finds a method", sub: "Start at the object's own class. Go up one parent at a time. Stop at the first hit." },
      { type: "widget", title: "Method lookup", intro: "Pick an object and a call. The search climbs the tree: amber = looking now, red ✗ = not here, green ✓ = found and used.", render: lookupWidget },
      { type: "code", caption: "The search order is called the MRO (method resolution order)", code: `
          print(XPost.__mro__)
          # (<class '__main__.XPost'>, <class '__main__.SocialMediaPost'>, <class 'object'>)` },

      { type: "h", text: "super().__init__: let the parent do its part" },
      {
        type: "stepper",
        title: "Building an InstagramPost",
        code: `
          class SocialMediaPost:
              def __init__(self, author, content):
                  self.author = author
                  self.content = content
                  self.likes = 0
              def like(self):
                  self.likes += 1

          class InstagramPost(SocialMediaPost):
              def __init__(self, author, content, hashtags):
                  super().__init__(author, content)
                  self.hashtags = hashtags

          insta = InstagramPost('anand', 'hi', ['cbs'])
          insta.like()
          print(insta.author, insta.likes, insta.hashtags)`,
        what: {
          2: "The parent's set-up: author, content, likes.",
          9: "The child: in brackets, its parent.",
          10: "The child's own __init__ takes one extra parameter.",
          11: "Call the parent's __init__ on this same object. No self in the brackets.",
          12: "Add the child's extra attribute.",
          14: "Build the object. Python uses InstagramPost.__init__.",
          15: "like is inherited from the parent.",
          16: "Read all four attributes.",
        },
        steps: superSteps,
        visualTitle: "The object (purple rows = set by the parent)",
        visual: (el, st, ctx) => { let w = st.w; for (let i = ctx.index; !w && i >= 0; i--) w = ctx.steps[i].w; el.appendChild(world(w)); },
      },
      { type: "callout", kind: "warn", title: "Without super().__init__", html: "<p>If the child's <code>__init__</code> forgets <code>super().__init__(author, content)</code>, the parent's set-up never runs. Then <code>insta.likes</code> gives <code>AttributeError: 'InstagramPost' object has no attribute 'likes'</code>.</p>" },

      { type: "h", text: "Inherit, override or extend?", sub: "BusinessAccount takes a fee of 5 on every deposit (NB cell 147)." },
      { type: "switch", label: "deposit in BusinessAccount", items: [
        { label: "inherit (no deposit)", render: depositVersion([], "600", "BusinessAccount has no <code>deposit</code>, so the parent's runs: 500 + 100 = 600. The fee is ignored.") },
        { label: "override", render: depositVersion(["", "    def deposit(self, amount):", "        self.balance += amount - self.fee"], "595", "The child's <code>deposit</code> <b>replaces</b> the parent's: 500 + (100 − 5) = 595. But it copies the parent's logic.") },
        { label: "extend with super()", render: depositVersion(["", "    def deposit(self, amount):", "        super().deposit(amount - self.fee)"], "595", "The child takes off the fee and lets the <b>parent</b> do the rest: 595. If the parent's deposit changes later (say, adds a log), the child gets it for free.") },
      ] },
      {
        type: "tryit",
        title: "Exercise 6: which give_raise runs?",
        task: "Predict both salaries before you run. Then add a <code>Director(Manager)</code> class that does <b>not</b> write <code>give_raise</code>, and check which version a Director gets.",
        code: `
          class Employee:
              def __init__(self, name, salary):
                  self.name = name
                  self.salary = salary

              def give_raise(self):
                  self.salary = self.salary * 1.05          # 5% raise

          class Manager(Employee):
              def give_raise(self):                         # overrides Employee's
                  self.salary = self.salary * 1.20          # 20% raise

          e = Employee('Ann', 1000)
          m = Manager('Bo', 1000)
          e.give_raise()
          m.give_raise()
          print(e.salary, m.salary)                         # 1050.0 1200.0`,
        hint: "<code>class Director(Manager): pass</code>. Its lookup goes Director → Manager (found) → stop.",
      },
      { type: "mistakes", items: [
        { title: "<code>super</code> without brackets (Assignment 2)", wrong: "super.__init__(author, content)", right: "super().__init__(author, content)", why: "<code>super</code> must be called: <code>super()</code>. Without <code>()</code> you get <code>TypeError: descriptor '__init__' requires a 'super' object…</code>." },
        { title: "Passing <code>self</code> to <code>super()</code>", wrong: "super().__init__(self, author, content)", right: "super().__init__(author, content)", why: "<code>super()</code> already passes <code>self</code>. Now there is one argument too many: <code>TypeError: … takes 3 positional arguments but 4 were given</code>." },
        { title: "Calling the parent by name without <code>self</code>", wrong: "Vehicle.__init__(vehicle_id, price)", right: "Vehicle.__init__(self, vehicle_id, price)\n# or simply:\nsuper().__init__(vehicle_id, price)", why: "Through the class name, nobody passes <code>self</code> for you. (Assignment 2 Part 2 bug.)" },
        { title: "Forgetting <code>super().__init__</code>", wrong: "def __init__(self, author, content, hashtags):\n    self.hashtags = hashtags", right: "def __init__(self, author, content, hashtags):\n    super().__init__(author, content)\n    self.hashtags = hashtags", why: "The parent's attributes are never made: AttributeError later." },
        { title: "Brackets after the parent's name", wrong: "class XPost(SocialMediaPost()):", right: "class XPost(SocialMediaPost):", why: "In the class line you name the parent. With <code>()</code> you would build a post object instead: TypeError." },
      ] },
    ],
    quiz: [
      { type: "predict", q: "What does this print?", code: "class Animal:\n    def sound(self):\n        return '...'\n    def speak(self):\n        return 'I say ' + self.sound()\n\nclass Dog(Animal):\n    def sound(self):\n        return 'woof'\n\nprint(Dog().speak())", answer: "I say woof",
        hint: "<code>speak</code> is inherited. Inside it, <code>self</code> is the Dog. Where does <code>self.sound()</code> look first?", explain: "<code>speak</code> is found in Animal, but <code>self.sound()</code> searches from the object's own class: Dog has <code>sound</code>, so 'woof'." },
      { type: "mc", q: "<code>class Snacks(Food):</code> has no <code>__init__</code>. What happens on <code>Snacks()</code>?",
        options: ["TypeError: Snacks has no __init__", "Python uses Food's <code>__init__</code>", "The object is built with no attributes at all", "Python uses object's empty <code>__init__</code>, skipping Food"], answer: 1,
        hint: "Method lookup: Snacks first, then its parent.", explain: "Lookup finds <code>__init__</code> in Food, so Food's set-up runs on the new Snacks object. This is exactly what the Q1 model answer relies on." },
      { type: "bug", q: "Assignment 2 style. Click every line with a bug.", code: `
          class Vehicle:
              def __init__(self, vehicle_id, price):
                  self.vehicle_id = vehicle_id
                  self.price = price

          class Car(Vehicle):
              def __init__(self, vehicle_id, price, seats):
                  super.__init__(vehicle_id, price)
                  self.seats = seats

          class Bicycle(Vehicle):
              def __init__(self, vehicle_id, price):
                  Vehicle.__init__(vehicle_id, price)`,
        bugs: [8, 13], notes: { 8: "<code>super</code> needs brackets: <code>super().__init__(vehicle_id, price)</code>", 13: "through the class name you must pass <code>self</code>: <code>Vehicle.__init__(self, vehicle_id, price)</code>" },
        fixed: `
          class Vehicle:
              def __init__(self, vehicle_id, price):
                  self.vehicle_id = vehicle_id
                  self.price = price

          class Car(Vehicle):
              def __init__(self, vehicle_id, price, seats):
                  super().__init__(vehicle_id, price)
                  self.seats = seats

          class Bicycle(Vehicle):
              def __init__(self, vehicle_id, price):
                  super().__init__(vehicle_id, price)`,
        hint: "Two different ways of calling the parent's <code>__init__</code>, both wrong.", explain: "Both are runtime errors (TypeError) that only appear when you build a Car or a Bicycle." },
      { type: "predict", q: "What does this print?", code: "class BankAccount:\n    interest_rate = 0.05\n    def __init__(self, balance):\n        self.balance = balance\n    def add_interest(self):\n        self.balance = self.balance * (1 + self.interest_rate)\n\nclass BusinessAccount(BankAccount):\n    interest_rate = 0.03\n\na = BankAccount(500)\nb = BusinessAccount(500)\na.add_interest()\nb.add_interest()\nprint(a.balance, b.balance)", answer: "525.0 515.0",
        hint: "<code>self.interest_rate</code> is looked up from the object's class upwards.", explain: "For b, Python finds <code>interest_rate</code> in BusinessAccount first (0.03): 500 × 1.03 = 515.0. A class variable can be overridden like a method." },
      { type: "write", q: "Write <code>Car(Vehicle)</code>: <code>Car(vehicle_id, price, seats)</code> lets Vehicle store the id and price (use <code>super()</code>) and stores <code>seats</code> itself. Then override <code>describe(self)</code> to <b>return</b> <code>'Car C1, 4 seats'</code> for <code>Car('C1', 100, 4)</code>.",
        starter: `
          class Vehicle:
              def __init__(self, vehicle_id, price):
                  self.vehicle_id = vehicle_id
                  self.price = price

              def describe(self):
                  return f'Vehicle {self.vehicle_id}'

          # your Car class here

          c = Car('C1', 100, 4)
          print(c.describe(), c.price)`,
        checks: [["Car('C1', 100, 4).describe()", "'Car C1, 4 seats'"], ["Car('C1', 100, 4).price", "100"], ["Car('X', 50, 2).seats", "2"], ["isinstance(Car('X', 50, 2), Vehicle)", "True"]],
        solution: `
          class Vehicle:
              def __init__(self, vehicle_id, price):
                  self.vehicle_id = vehicle_id
                  self.price = price

              def describe(self):
                  return f'Vehicle {self.vehicle_id}'

          class Car(Vehicle):
              def __init__(self, vehicle_id, price, seats):
                  super().__init__(vehicle_id, price)   # Vehicle stores id and price
                  self.seats = seats                    # the new part

              def describe(self):                       # overrides Vehicle.describe
                  return f'Car {self.vehicle_id}, {self.seats} seats'`,
        hint: "<code>class Car(Vehicle):</code>, then <code>super().__init__(vehicle_id, price)</code> and <code>self.seats = seats</code>.",
        explain: "<code>price</code> is set by Vehicle's <code>__init__</code>, called through <code>super()</code>. <code>describe</code> with the same name replaces the parent's version for Cars." },
      { type: "explain", q: "In 3–4 sentences, explain the difference between <b>overriding</b> a method and <b>extending</b> it with <code>super()</code>. Use <code>BusinessAccount.deposit</code> as your example.",
        answer: "<p>Overriding means the subclass writes a method with the same name, which completely replaces the parent's version for objects of the subclass. Extending also writes a method with the same name, but inside it calls the parent's version with <code>super()</code>, adding something before or after. In <code>BusinessAccount.deposit</code>, <code>super().deposit(amount - self.fee)</code> takes off the fee and then reuses BankAccount's deposit logic instead of copying it. This avoids duplicated code: if the parent's deposit changes, the child gets the change too.</p>",
        points: ["override = same name, replaces the parent's method", "extend = same name, but calls super().method(...) inside", "extending reuses the parent's code instead of copying it"],
        hint: "What happens to the parent's code in each case?" },
    ],
  };

  /* ================================================================
     TOPIC 6: Abstract methods & polymorphism
     ================================================================ */

  // --- widget: the abstract slot ---
  function abstractWidget(el) {
    const TRY = [
      ["Shape()", "Shape", "TypeError: Can't instantiate abstract class Shape without an implementation for abstract method 'area'", true],
      ["Circle(5).area()", "Circle", "78.53975", false],
      ["Square(5).area()", "Square", "25", false],
      ["Triangle(3)", "Triangle", "TypeError: Can't instantiate abstract class Triangle without an implementation for abstract method 'area'", true],
    ];
    let ti = 1;
    const pic = h("div"), out = h("pre", { class: "st-out" }), note = h("p", { class: "small", style: "margin:8px 0 0" });
    const ctl = segCtl(TRY.map(t => t[0]), i => { ti = i; draw(); }, "What to build", ti);
    const NOTES = [
      "Shape has an empty <code>area</code> slot. Python refuses to build an object with an unfilled slot.",
      "Circle fills the slot with its own formula, so it can be built: 3.14159 × 5² = 78.53975.",
      "Square fills it differently: 5² = 25.",
      "Triangle forgot to write <code>area</code>. Its slot is still empty, so it cannot be built either. The error comes when you <b>build</b> it, not when you call <code>area</code>.",
    ];
    function draw() {
      const t = TRY[ti];
      const S = D.svg({ w: 440, h: 220, label: "abstract class with an empty slot" });
      const hot = k => t[1] === k;
      S.box(130, 6, 180, 64, { tone: hot("Shape") ? "swap" : "min", dashed: true });
      S.text(140, 22, "Shape(ABC)", { anchor: "start", size: 13, weight: 600 });
      S.box(140, 36, 160, 26, { text: "area(): ??? must fill", tone: "cmp", dashed: true, rx: 6, size: 12 });
      const kids = [["Circle", 4, "3.14159 * r ** 2", false], ["Square", 152, "side ** 2", false], ["Triangle", 300, "(forgot area)", true]];
      kids.forEach(([n, x, f, empty]) => {
        S.arrow(x + 68, 120, 220, 72, { tone: "muted" });
        S.box(x, 122, 136, 70, { tone: hot(n) ? (empty ? "swap" : "done") : null });
        S.text(x + 10, 138, n + "(Shape)", { anchor: "start", size: 13, weight: 600 });
        S.box(x + 8, 152, 120, 30, { text: empty ? "area: empty ✗" : "area ✓", sub: null, tone: empty ? "swap" : "done", dashed: empty, rx: 6, size: 12 });
        S.text(x + 68, 206, f, { muted: true, small: true });
      });
      pic.replaceChildren(S.el);
      out.textContent = t[2];
      out.classList.toggle("oop-errout", t[3]);
      note.innerHTML = NOTES[ti];
      pop(out);
    }
    el.append(ctl.el, h("div", { style: "margin-top:12px" }, pic), eyebrow("Python says"), out, note);
    draw();
  }

  // --- stepper data: polymorphism feed ---
  const FEED = [["SocialMediaPost", "SocialMediaPost", "1000", "True"], ["XPost", "XPost", "280", "False"], ["InstagramPost", "SocialMediaPost", "1000", "True"]];
  function feedSteps() {
    const S = [{ line: 1, now: "A list with three <b>different kinds</b> of post. Each has 300 characters of content.", cur: -1, res: [] }];
    const res = [];
    FEED.forEach(([cls, owner, lim, r], k) => {
      S.push({ line: 5, now: `Round ${k + 1}: <code>post</code> is the ${cls}.`, vars: { post: `<${cls}>` }, cur: k, res: res.slice() });
      res.push(r);
      S.push({ line: 6, now: `<code>post.is_within_limit()</code>: Python searches from <b>${cls}</b> upwards and finds it in <b>${owner}</b> (limit ${lim}). Is 300 ≤ ${lim}? <b>${r}</b>.`, print: `${cls} ${r}`, cur: k, res: res.slice() });
    });
    S.push({ line: 5, now: "Same line of code, three objects, two different behaviours. That is <b>polymorphism</b>.", cur: -1, res: res.slice() });
    return S;
  }
  function feedVisual(el, st) {
    const wrap = h("div", { class: "oop-feed" });
    FEED.forEach(([cls, owner, lim], k) => {
      const r = st.res[k];
      wrap.appendChild(h("div", { class: "oop-card" + (k === st.cur ? " mk-held" : "") },
        h("b", null, cls), h("span", { class: "small muted" }, "'x' * 300"),
        h("span", { class: "small" }, "limit " + lim + (owner !== cls ? " (inherited)" : "")),
        h("span", { class: "small " + (r === "True" ? "oop-ok" : r === "False" ? "oop-bad" : "muted") }, r ? "→ " + r : "not yet")));
    });
    el.appendChild(wrap);
  }

  const abstractTopic = {
    id: "abstract",
    title: "Abstract methods & polymorphism",
    summary: "An abstract method is an empty slot every subclass must fill. One call, many behaviours (polymorphism). Plus operator overloading and the <code>random</code> tools Q1 needs.",
    exam: ["Q1 abstract category method"],
    sources: "L4 p24 · NB §19.2, §29 · L5 p10",
    blocks: [
      { type: "h", text: "Abstract method: a slot the children must fill" },
      { type: "code", caption: "L4 p24 / NB cell 143", code: `
          from abc import ABC, abstractmethod      # 1. import the two tools

          class Shape(ABC):                        # 2. the parent inherits from ABC
              @abstractmethod                      # 3. mark the method as abstract
              def area(self):
                  pass                             #    no body: each child writes its own

          class Circle(Shape):
              def __init__(self, radius):
                  self.radius = radius
              def area(self):                      # fills the slot
                  return 3.14159 * self.radius ** 2

          class Square(Shape):
              def __init__(self, side):
                  self.side = side
              def area(self):                      # fills it differently
                  return self.side ** 2` },
      { type: "widget", title: "Try to build each one", render: abstractWidget },
      { type: "table", caption: "The recipe (all three are needed)", head: ["Step", "Code", "Forget it and…"], code: [1], rows: [
        ["import", "from abc import ABC, abstractmethod", "NameError: name 'ABC' is not defined"],
        ["parent inherits from ABC", "class Food(ABC):", "the decorator does nothing: <code>Food()</code> builds fine, no error"],
        ["decorate the method", "@abstractmethod", "it is a normal method; children may skip it"],
      ] },
      { type: "callout", kind: "exam", title: "Exam Q1: “an abstract method that assigns a category”", html: "<p>Food gets <code>@abstractmethod def assign_category(self)</code>. Snacks fills it with <code>random.choice(['vegan', 'non-vegan'])</code>, Beverages with <code>random.choice(['normal', 'diet', 'zero'])</code>. Then <code>Food()</code> is impossible, which is right: there is no “plain food”.</p>" },

      { type: "h", text: "Polymorphism: one call, many behaviours", sub: "NB cell 218" },
      {
        type: "stepper",
        title: "The same line on three kinds of post",
        code: `
          feed = [SocialMediaPost('anand', 'x' * 300),
                  XPost('anand', 'x' * 300),
                  InstagramPost('anand', 'x' * 300)]

          for post in feed:
              print(type(post).__name__, post.is_within_limit())`,
        what: { 1: "A list of three posts of different classes.", 5: "Each round, post is the next object.", 6: "The same call. Which is_within_limit runs depends on the object's class." },
        steps: feedSteps(),
        visualTitle: "The feed",
        visual: feedVisual,
      },
      `<p>The loop never asks “what kind of post is this?”. Each object brings its own method. In Q1, <code>Food.__init__</code> calls <code>self.assign_category()</code> and each subclass answers in its own way.</p>`,

      { type: "h", text: "Operator overloading", sub: "Teach + < == len to work on your class (NB §29)." },
      { type: "table", head: ["You write", "Python calls", "Write it to…"], code: [0, 1], rows: [
        ["a == b", "a.__eq__(b)", "compare contents"],
        ["a < b", "a.__lt__(b)", "make <code>sorted()</code>, <code>max()</code> work"],
        ["a + b", "a.__add__(b)", "make <code>sum()</code> work (return a <b>new</b> object)"],
        ["len(a)", "a.__len__()", "return a number"],
        ["x in a", "a.__contains__(x)", "return True / False"],
        ["print(a)", "a.__str__()", "return a string"],
      ] },
      {
        type: "tryit",
        title: "Engagement (NB cell 216)",
        task: "Run it. Then add <code>__eq__</code> so that two Engagements with the same total are equal, and test <code>Engagement(1, 1) == Engagement(2, 0)</code>.",
        code: `
          class Engagement:
              def __init__(self, likes=0, retweets=0):
                  self.likes = likes
                  self.retweets = retweets

              def total(self):
                  return self.likes + self.retweets

              def __add__(self, other):                    # e1 + e2
                  return Engagement(self.likes + other.likes, self.retweets + other.retweets)

              def __lt__(self, other):                     # e1 < e2
                  return self.total() < other.total()

              def __str__(self):
                  return f'{self.likes} likes, {self.retweets} RTs'

          e1 = Engagement(100, 10)
          e2 = Engagement(50, 20)
          print(e1 + e2)                     # 150 likes, 30 RTs
          print(e1 < e2)                     # False: 110 < 70 is False
          print(max([e1, e2]))               # max uses __lt__: 100 likes, 10 RTs`,
      },

      { type: "h", text: "random: what Q1 needs", sub: "Barely shown in the course, so learn these two." },
      { type: "table", head: ["Call", "Gives", "Careful"], code: [0], rows: [
        ["random.randint(50, 300)", "a whole number from 50 to 300", "<b>both</b> ends included (unlike <code>range</code>)"],
        ["random.choice(['vegan', 'non-vegan'])", "one item of the list", "pass <b>one</b> list, not two separate strings"],
        ["random.random()", "a float from 0.0 up to (not including) 1.0", "not needed for Q1"],
      ] },
      {
        type: "tryit",
        title: "Roll some values",
        task: "Run it a few times: the numbers change every time. Then try <code>random.choice('vegan', 'non-vegan')</code> (two arguments) to see the error.",
        code: `
          import random

          for i in range(5):
              print(random.randint(50, 300), random.choice(['normal', 'diet', 'zero']))

          rolls = [random.randint(1, 3) for i in range(1000)]
          print(min(rolls), max(rolls))       # 1 3: both ends can come up`,
      },
      { type: "mistakes", items: [
        { title: "Forgetting <code>(ABC)</code> on the parent", wrong: "class Food:\n    @abstractmethod\n    def assign_category(self):\n        pass", right: "class Food(ABC):\n    @abstractmethod\n    def assign_category(self):\n        pass", why: "Without <code>ABC</code> the decorator has no effect: <code>Food()</code> builds fine and nothing is enforced." },
        { title: "A different name in the child", wrong: "class Snacks(Food):\n    def get_category(self):", right: "class Snacks(Food):\n    def assign_category(self):", why: "The slot is only filled by the <b>same</b> name. Otherwise <code>Snacks()</code> fails: <code>Can't instantiate abstract class Snacks…</code>." },
        { title: "Building the abstract parent", wrong: "f = Food()", right: "s = Snacks()", why: "Abstract classes can't be built. Build the children." },
        { title: "<code>choice</code> with separate arguments", wrong: "random.choice('vegan', 'non-vegan')", right: "random.choice(['vegan', 'non-vegan'])", why: "<code>TypeError: Random.choice() takes 2 positional arguments but 3 were given</code>. And <code>random.choice('vegan')</code> picks one <b>letter</b>." },
        { title: "Forgetting the import", wrong: "random.randint(50, 300)", right: "import random\nrandom.randint(50, 300)", why: "<code>NameError: name 'random' is not defined</code>." },
      ] },
    ],
    quiz: [
      { type: "mc", q: "What happens?", code: "from abc import ABC, abstractmethod\n\nclass Food(ABC):\n    @abstractmethod\n    def assign_category(self):\n        pass\n\nclass Snacks(Food):\n    def category(self):\n        return 'vegan'\n\ns = Snacks()",
        options: ["It works; <code>s.category()</code> is 'vegan'", "TypeError when building <code>Snacks()</code>: the abstract method is not filled", "TypeError only when calling <code>s.assign_category()</code>", "SyntaxError"], answer: 1,
        hint: "Is <code>category</code> the same name as the abstract method?", explain: "Snacks wrote <code>category</code>, not <code>assign_category</code>, so the slot is still empty and Python refuses to build it." },
      { type: "predict", q: "What does this print?", code: "class Shape:\n    def area(self):\n        return 0\n    def describe(self):\n        return f'area {self.area()}'\n\nclass Square(Shape):\n    def __init__(self, side):\n        self.side = side\n    def area(self):\n        return self.side ** 2\n\nshapes = [Shape(), Square(3)]\nfor s in shapes:\n    print(s.describe())", answer: "area 0\narea 9",
        hint: "<code>describe</code> is the same for both. Which <code>area</code> does <code>self.area()</code> find?", explain: "For the Square, <code>self.area()</code> finds Square's version: 3² = 9. Polymorphism inside an inherited method." },
      { type: "mc", q: "Which call can give back <b>300</b>?", options: ["<code>random.randint(50, 300)</code>", "<code>random.choice(range(50, 300))</code>", "<code>random.randrange(50, 300)</code>", "None of them"], answer: 0,
        hint: "Which one includes its end?", explain: "<code>randint(a, b)</code> includes both a and b. <code>range(50, 300)</code> and <code>randrange(50, 300)</code> stop at 299." },
      { type: "bug", q: "This should make Snacks with a random category. Click every buggy line.", code: `
          import random
          from abc import ABC, abstractmethod

          class Food:
              @abstractmethod
              def assign_category(self):
                  pass

          class Snacks(Food):
              def assign_category(self):
                  return random.choice('vegan', 'non-vegan')`,
        bugs: [4, 11], notes: { 4: "must inherit from ABC, or the abstract method is not enforced: <code>class Food(ABC):</code>", 11: "choice takes <b>one</b> list: <code>random.choice(['vegan', 'non-vegan'])</code>" },
        fixed: `
          import random
          from abc import ABC, abstractmethod

          class Food(ABC):
              @abstractmethod
              def assign_category(self):
                  pass

          class Snacks(Food):
              def assign_category(self):
                  return random.choice(['vegan', 'non-vegan'])`,
        hint: "One line silently disables the abstract check. Another crashes when called.", explain: "Line 4 is a design bug (no error, but <code>Food()</code> is allowed). Line 11 is a TypeError at runtime." },
      { type: "write", q: "Make <code>Animal</code> abstract with an abstract method <code>sound(self)</code>. Then write <code>Dog</code> (sound returns <code>'woof'</code>) and <code>Cat</code> (returns <code>'meow'</code>).",
        starter: `
          from abc import ABC, abstractmethod

          class Animal:
              def sound(self):
                  pass

          # Dog and Cat here

          for a in [Dog(), Cat()]:
              print(a.sound())`,
        test: "assert Dog().sound() == 'woof', \"Dog().sound() should return 'woof'\"\nassert Cat().sound() == 'meow', \"Cat().sound() should return 'meow'\"\nassert isinstance(Dog(), Animal), 'Dog must inherit from Animal'\ntry:\n    Animal()\nexcept TypeError:\n    pass\nelse:\n    raise AssertionError('Animal() should fail: inherit from ABC and add @abstractmethod')",
        solution: `
          from abc import ABC, abstractmethod

          class Animal(ABC):
              @abstractmethod
              def sound(self):
                  pass

          class Dog(Animal):
              def sound(self):
                  return 'woof'

          class Cat(Animal):
              def sound(self):
                  return 'meow'`,
        hint: "Three changes to Animal: <code>(ABC)</code>, <code>@abstractmethod</code>, and keep <code>pass</code>. Then two small subclasses.",
        explain: "This is the Q1 shape in miniature: an abstract parent, and each child fills the slot its own way." },
    ],
  };

  /* ================================================================
     TOPIC 7: Exam Q1 drill (Food, Snacks, Beverages)
     ================================================================ */

  // the model answer, line by line, tagged with the build stage that adds it
  const Q1 = [
    [1, "import random                                   # randint, choice"],
    [1, "from abc import ABC, abstractmethod             # for the abstract method"],
    [1, ""],
    [2, "class Food(ABC):                                # parent: abstract"],
    [3, "    next_id = 1                                 # class variable: shared counter"],
    [3, ""],
    [3, "    def __init__(self):"],
    [3, "        self.id = Food.next_id                  # this object's own ID"],
    [3, "        Food.next_id += 1                       # bump through the CLASS"],
    [4, "        self.calories = self.assign_calories()  # a method gives the calories"],
    [5, "        self.category = self.assign_category()  # each subclass decides"],
    [4, ""],
    [4, "    def assign_calories(self):"],
    [4, "        return random.randint(50, 300)          # 50 and 300 both possible"],
    [5, ""],
    [5, "    @abstractmethod"],
    [5, "    def assign_category(self):                  # an empty slot"],
    [5, "        pass"],
    [7, ""],
    [7, "    def __str__(self):"],
    [7, "        name = type(self).__name__              # 'Snacks' or 'Beverages'"],
    [7, "        return f'{name} #{self.id}: {self.calories} kcal, {self.category}'"],
    [6, ""],
    [6, "class Snacks(Food):"],
    [6, "    def assign_category(self):                  # fills the slot"],
    [6, "        return random.choice(['vegan', 'non-vegan'])"],
    [6, ""],
    [6, "class Beverages(Food):"],
    [6, "    def assign_category(self):"],
    [6, "        return random.choice(['normal', 'diet', 'zero'])"],
    [8, ""],
    [8, "snacks = []"],
    [8, "beverages = []"],
    [8, "for i in range(200):                            # 200 of each"],
    [8, "    snacks.append(Snacks())"],
    [8, "    beverages.append(Beverages())"],
    [8, ""],
    [8, "for food in snacks[:3] + beverages[:3]:         # a small selection"],
    [8, "    print(food)                                 # uses __str__"],
  ];
  const Q1_CODE = Q1.map(l => l[1]).join("\n");
  const STAGES = [
    { spec: "“Write a Python code snippet that models food items…” (it will need random and an abstract method)", text: "Start with the two imports. You will need <code>random</code> for calories and categories, and <code>ABC</code> + <code>abstractmethod</code> for the abstract method." },
    { spec: "1. Define a parent class Food…", text: "<code>Food</code> inherits from <code>ABC</code>, because it will have an abstract method. Nobody should build a plain Food." },
    { spec: "2a. Each instance must have a unique ID", text: "A <b>class variable</b> counter. In <code>__init__</code>, read it into <code>self.id</code>, then bump it <b>through the class</b>: <code>Food.next_id += 1</code>." },
    { spec: "2b. …a calorie count assigned through a method that randomly generates a value in the range 50–300", text: "A method <code>assign_calories</code> that <b>returns</b> <code>random.randint(50, 300)</code>. <code>__init__</code> calls it through <code>self</code> and stores the result." },
    { spec: "3. Include an abstract method in the parent class that assigns a category/type to each instance", text: "<code>@abstractmethod</code> on an empty <code>assign_category</code>. <code>__init__</code> calls <code>self.assign_category()</code>: Python will find the <b>subclass</b> version (polymorphism)." },
    { spec: "1. …and two subclasses: Snacks and Beverages. 3. For Snacks: “vegan” or “non-vegan”; for Beverages: “normal”, “diet” or “zero”", text: "Each subclass fills the slot with the <b>same method name</b>, returning <code>random.choice([...])</code>. No <code>__init__</code> needed: Food's is inherited." },
    { spec: "4. …print a small selection of them to demonstrate that the classes and their behaviours function correctly", text: "A <code>__str__</code> that <b>returns</b> the class name, ID, calories and category, so <code>print(food)</code> shows something useful." },
    { spec: "4. Create 200 instances of each subclass and print a small selection", text: "Two lists, one loop of 200, <code>.append</code> a new object each round. Then print a few with a loop (not <code>print(snacks)</code>: that shows <code>&lt;…object at 0x…&gt;</code>)." },
  ];
  function q1Builder(el) {
    let st = 0;
    const btns = segCtl(STAGES.map((_, i) => String(i + 1)), i => { st = i; draw(); }, "Build stage");
    const spec = h("div", { class: "oop-spec" }), txt = h("p", { style: "margin:8px 0" }), codeBox = h("div");
    const prev = h("button", { type: "button", class: "btn small" }, "← Back"), next = h("button", { type: "button", class: "btn primary small" }, "Next part →");
    prev.onclick = () => { if (st > 0) { st--; btns.set(st); draw(); } };
    next.onclick = () => { if (st < STAGES.length - 1) { st++; btns.set(st); draw(); } };
    function draw() {
      const stage = st + 1;
      const lines = [], active = [];
      Q1.forEach(([s, t]) => { if (s <= stage) { lines.push(t); if (s === stage && t.trim()) active.push(lines.length); } });
      while (lines.length && !lines[lines.length - 1].trim()) lines.pop();
      spec.innerHTML = `<span class="eyebrow">The exam says</span><br>${STAGES[st].spec}`;
      txt.innerHTML = `<b>Part ${stage} of ${STAGES.length}.</b> ${STAGES[st].text}`;
      codeBox.replaceChildren(ui.code({ code: lines, active }));
      prev.disabled = st === 0; next.disabled = st === STAGES.length - 1;
      pop(codeBox);
    }
    el.append(row(h("span", { class: "small muted" }, "Part"), btns.el), spec, txt, codeBox, row(prev, next));
    draw();
  }

  // stepper: what happens inside Snacks() (random values fixed for the story)
  const SN = (fields) => ({ id: "s", title: "Snacks object", fields });
  const FOOD_CLS = (n, mk) => ({ name: "Food", vars: [["next_id", String(n), mk]], methods: ["__init__", "assign_calories", "assign_category", "__str__"] });
  const IN = { name: "Food.__init__", vars: { self: "the new Snacks" } };
  const SELF = [{ name: "self", to: "s", tone: "min" }];
  const snackSteps = [
    { line: 32, now: "Say 7 foods were built already, so <code>Food.next_id</code> is 8. Now: <code>s = Snacks()</code>.", frames: [{ name: "global", vars: {} }], w: { cls: FOOD_CLS(8), objs: [] } },
    { line: 7, now: "A new empty Snacks object. Python looks for <code>__init__</code>: not in Snacks (lines 24–26), so it climbs to <b>Food</b> and runs Food's.", frames: [{ name: "global", vars: {} }, IN],
      w: { cls: FOOD_CLS(8), objs: [SN([])], names: SELF } },
    { line: 8, now: "<code>self.id = Food.next_id</code>: read the counter, 8.", w: { cls: FOOD_CLS(8, "accent"), objs: [SN([["id", "8", "cmp"]])], names: SELF } },
    { line: 9, now: "<code>Food.next_id += 1</code>: the class counter goes 8 → <b>9</b>.", w: { cls: FOOD_CLS(9, "cmp"), objs: [SN([["id", "8"]])], names: SELF } },
    { line: 10, now: "<code>self.assign_calories()</code>: Python searches Snacks, then Food, and finds it in <b>Food</b>.", w: { cls: FOOD_CLS(9), objs: [SN([["id", "8"]])], names: SELF } },
    { line: 14, now: "<code>random.randint(50, 300)</code> gives, say, <b>187</b>. Return it.", frames: [{ name: "global", vars: {} }, IN, { name: "assign_calories", vars: { self: "the new Snacks" }, note: "returning 187" }] },
    { line: 10, now: "Back in <code>__init__</code>: store it. <code>self.calories = 187</code>.", frames: [{ name: "global", vars: {} }, IN],
      w: { cls: FOOD_CLS(9), objs: [SN([["id", "8"], ["calories", "187", "cmp"]])], names: SELF } },
    { line: 11, now: "<code>self.assign_category()</code>: Python searches from <b>Snacks</b> upwards, so it finds <b>Snacks' own</b> version first, not Food's empty one.", w: { cls: FOOD_CLS(9), objs: [SN([["id", "8"], ["calories", "187"]])], names: SELF } },
    { line: 26, now: "<code>random.choice(['vegan', 'non-vegan'])</code> gives, say, <b>'vegan'</b>. Return it.", frames: [{ name: "global", vars: {} }, IN, { name: "Snacks.assign_category", vars: { self: "the new Snacks" }, note: "returning 'vegan'" }] },
    { line: 11, now: "Store it: <code>self.category = 'vegan'</code>. <code>__init__</code> is finished.", frames: [{ name: "global", vars: {} }, IN],
      w: { cls: FOOD_CLS(9), objs: [SN([["id", "8"], ["calories", "187"], ["category", "'vegan'", "cmp"]])], names: SELF } },
    { line: 32, now: "The name <code>s</code> goes on the finished object.", frames: [{ name: "global", vars: { s: "<Snacks>" } }],
      w: { cls: FOOD_CLS(9), objs: [SN([["id", "8"], ["calories", "187"], ["category", "'vegan'"]])], names: [{ name: "s", to: "s" }] } },
    { line: 22, now: "<code>print(s)</code> calls <code>__str__</code> (found in Food). <code>type(self).__name__</code> is 'Snacks'. Return the string.", frames: [{ name: "global", vars: { s: "<Snacks>" } }, { name: "__str__", vars: { self: "s", name: "'Snacks'" }, note: "returning 'Snacks #8: 187 kcal, vegan'" }] },
    { line: 33, now: "print shows it.", frames: [{ name: "global", vars: { s: "<Snacks>" } }], print: "Snacks #8: 187 kcal, vegan" },
  ];
  const snackCode = Q1.slice(0, 30).map(l => l[1]).concat(["", "s = Snacks()", "print(s)"]).join("\n");

  const Q1_TEST = [
    "s = Snacks()",
    "b = Beverages()",
    "assert isinstance(s, Food) and isinstance(b, Food), 'Snacks and Beverages must inherit from Food'",
    "assert b.id == s.id + 1, 'each new object (snack or beverage) should get the next ID: use one counter in Food'",
    "assert 50 <= s.calories <= 300 and 50 <= b.calories <= 300, 'calories must be between 50 and 300'",
    "assert s.category in ('vegan', 'non-vegan'), 'a snack category must be vegan or non-vegan, got ' + repr(s.category)",
    "assert b.category in ('normal', 'diet', 'zero'), 'a beverage category must be normal, diet or zero, got ' + repr(b.category)",
    "assert hasattr(Food, 'assign_calories'), 'calories should come from a method called assign_calories'",
    "try:",
    "    Food()",
    "except TypeError:",
    "    pass",
    "else:",
    "    raise AssertionError('Food() should fail: make Food abstract (ABC + @abstractmethod)')",
    "ids = [Snacks().id for i in range(50)]",
    "assert len(set(ids)) == 50, 'IDs are not unique'",
    "cals = [Beverages().calories for i in range(400)]",
    "assert min(cals) >= 50 and max(cals) <= 300, 'calories out of range'",
    "assert len(set(cals)) > 50, 'calories should be random'",
    "assert 'object at' not in str(s), 'write __str__ so print(food) is readable'",
    "assert len(snacks) == 200 and len(beverages) == 200, 'make lists snacks and beverages with 200 objects each'",
    "assert all(isinstance(x, Snacks) for x in snacks) and all(isinstance(x, Beverages) for x in beverages), 'the lists should hold Snacks / Beverages objects'",
  ].join("\n");

  const q1Topic = {
    id: "exam-q1",
    title: "Exam Q1 drill: Food",
    summary: "Last year's Q1, built part by part: an abstract <code>Food</code>, <code>Snacks</code> and <code>Beverages</code>, a unique ID, random calories from a method, 200 objects each.",
    exam: ["Q1 (whole question)"],
    sources: "Exam w25 Q1 · L4 p24 · Ex4 Q7",
    blocks: [
      { type: "callout", kind: "exam", title: "Q1, word for word", html: "<p>Write a Python code snippet that models food items using object-oriented principles.</p><ol><li>Define a parent class <b>Food</b>, and two subclasses: <b>Snacks</b> and <b>Beverages</b>.</li><li>Each instance must have: a <b>unique ID</b>, and a <b>calorie count assigned through a method</b> that randomly generates a value in the range 50–300.</li><li>Include an <b>abstract method</b> in the parent class that assigns a category/type to each instance. For Snacks: randomly choose between “vegan” or “non-vegan”. For Beverages: randomly choose between “normal”, “diet”, or “zero”.</li><li>Create <b>200 instances of each subclass</b> and print a small selection of them to demonstrate that the classes and their behaviors function correctly.</li></ol>" },
      { type: "h", text: "From the spec to code", sub: "Every phrase maps to one thing you already know." },
      { type: "table", head: ["The spec says", "You write", "Page"], code: [1], rows: [
        ["parent class + two subclasses", "class Food(ABC):\nclass Snacks(Food):", "<a href='#oop/inheritance'>Inheritance</a>"],
        ["unique ID", "next_id = 1\nself.id = Food.next_id\nFood.next_id += 1", "<a href='#oop/class-vars'>Class variables</a>"],
        ["assigned through a method… random 50–300", "def assign_calories(self):\n    return random.randint(50, 300)", "<a href='#oop/self'>self & methods</a>"],
        ["abstract method… assigns a category", "@abstractmethod\ndef assign_category(self):", "<a href='#oop/abstract'>Abstract</a>"],
        ["randomly choose between…", "random.choice(['vegan', 'non-vegan'])", "<a href='#oop/abstract'>Abstract</a>"],
        ["200 instances of each", "for i in range(200):\n    snacks.append(Snacks())", "loops"],
        ["print a small selection", "def __str__(self): …\nfor food in snacks[:3]: print(food)", "<a href='#oop/str'>__str__</a>"],
      ] },

      { type: "h", text: "Build it part by part", sub: "Press Next. The highlighted lines are what each part of the spec adds." },
      { type: "widget", render: q1Builder },

      { type: "h", text: "What happens inside Snacks()", sub: "Every idea of this subject in one call." },
      {
        type: "stepper",
        title: "s = Snacks()",
        code: snackCode,
        what: { 7: "Food's set-up, inherited by Snacks.", 8: "Copy the shared counter into this object.", 9: "Bump the counter through the class.", 10: "A method gives the calories.", 11: "The subclass decides the category.", 14: "Random whole number, 50 and 300 included.", 22: "Build the description.", 26: "Snacks fills the abstract slot.", 32: "Build one Snacks.", 33: "print calls __str__." },
        steps: snackSteps,
        visualTitle: "The class Food and the new Snacks",
        visual: (el, st, ctx) => { let w = st.w; for (let i = ctx.index; !w && i >= 0; i--) w = ctx.steps[i].w; el.appendChild(world(w)); },
        below: "<p class='small muted' style='margin:8px 0 0'>The model answer without the 200-loop. 187 and 'vegan' stand in for whatever random gives.</p>",
      },

      { type: "h", text: "Your turn: fill in the blanks" },
      {
        type: "tryit",
        title: "Q1 with blanks",
        task: "Replace every <code>____</code> and <code>pass  # TODO</code>. Press <b>Run</b>: the automatic test checks the IDs, the ranges, the categories, that <code>Food()</code> is refused, and the 200 + 200 objects.",
        code: `
          import random
          from abc import ABC, abstractmethod

          class Food(____):                              # fill in every ____
              next_id = ____

              def __init__(self):
                  self.id = ____
                  ____                                   # bump the counter
                  self.calories = self.assign_calories()
                  self.category = self.assign_category()

              def assign_calories(self):
                  pass  # TODO: return a random int from 50 to 300

              # TODO: the abstract method assign_category

              def __str__(self):
                  name = type(self).__name__
                  return f'{name} #{self.id}: {self.calories} kcal, {self.category}'

          class Snacks(Food):
              pass  # TODO

          class Beverages(Food):
              pass  # TODO

          snacks = []
          beverages = []
          # TODO: 200 of each

          for food in snacks[:3] + beverages[:3]:
              print(food)`,
        test: Q1_TEST,
        hint: "Use the part-by-part builder above if you get stuck. The counter must be read and bumped through <code>Food.</code>, not <code>self.</code>.",
        solution: Q1_CODE,
        solutionNote: "Other good answers exist: <code>assign_calories</code> could set <code>self.calories</code> itself instead of returning; a list comprehension <code>[Snacks() for i in range(200)]</code> works too. In the exam, add a short Markdown note saying what you assumed.",
      },
      { type: "callout", kind: "tip", title: "Exam habits for Q1", html: "<ul><li>Comment each part with the spec number (<code># 2. unique ID</code>): the examiner ticks them off.</li><li>Show it works: print a few of each, and maybe <code>print(len(snacks), len(beverages))</code>.</li><li>Re-run the <b>whole</b> notebook before handing in. Old objects from earlier runs cause confusing errors (and IDs that do not start at 1).</li></ul>" },
      { type: "mistakes", items: [
        { title: "Counter through <code>self</code>", wrong: "self.next_id += 1", right: "Food.next_id += 1", why: "Every food gets ID 1. Silent, so the examiner will spot it before you do." },
        { title: "One counter per subclass by accident", wrong: "self.id = type(self).next_id\ntype(self).next_id += 1", right: "self.id = Food.next_id\nFood.next_id += 1", why: "Bumping through the subclass makes a new counter on Snacks and on Beverages: a snack and a drink can both be #1. Use the parent's name so IDs are unique across all food." },
        { title: "Calories not from a method", wrong: "self.calories = random.randint(50, 300)", right: "self.calories = self.assign_calories()", why: "Works, but the spec says “assigned through a method”. Read the spec closely: that's where the points are." },
        { title: "Printing the whole list", wrong: "print(snacks)", right: "for food in snacks[:5]:\n    print(food)", why: "A list prints its items with <code>repr</code>, so you get 200 × <code>&lt;…object at 0x…&gt;</code>." },
        { title: "<code>randrange</code> or <code>range</code> for 50–300", wrong: "random.randrange(50, 300)", right: "random.randint(50, 300)", why: "<code>randrange</code> stops at 299. <code>randint</code> includes 300." },
      ] },
    ],
    quiz: [
      { type: "write", q: "From scratch, no peeking: write the whole of Q1. Use the names <code>Food</code>, <code>Snacks</code>, <code>Beverages</code>, the methods <code>assign_calories</code> and <code>assign_category</code>, and lists <code>snacks</code> and <code>beverages</code> with 200 objects each. <code>Snacks()</code> and <code>Beverages()</code> take no arguments.",
        starter: `
          import random
          from abc import ABC, abstractmethod

          # your classes here


          # 200 of each, then print a few`,
        test: Q1_TEST,
        solution: Q1_CODE,
        hint: "Parts in order: imports → <code>class Food(ABC)</code> with <code>next_id</code> → <code>__init__</code> (id, bump, calories, category) → <code>assign_calories</code> → abstract <code>assign_category</code> → <code>__str__</code> → two subclasses → two loops of 200.",
        explain: "The test builds objects, checks the IDs go up by 1 across both subclasses, checks ranges and categories, and checks that <code>Food()</code> is refused." },
      { type: "mc", q: "Model answer. Why does <code>self.assign_category()</code> inside <code>Food.__init__</code> not run Food's empty version?",
        options: ["Because <code>pass</code> methods are skipped", "Because lookup starts at the object's own class (Snacks), which has its own <code>assign_category</code>", "Because <code>@abstractmethod</code> deletes Food's version", "It does run Food's version, and then Snacks' too"], answer: 1,
        hint: "Inside <code>Food.__init__</code>, what is <code>self</code>?", explain: "<code>self</code> is the new Snacks object. <code>self.anything</code> always searches from the object's own class upward, even inside a parent's method." },
      { type: "mc", q: "Model answer. Fresh start (<code>Food.next_id</code> is 1). What does this print?", code: "a = Snacks()\nb = Beverages()\nc = Snacks()\nprint(a.id, b.id, c.id, Food.next_id)", options: ["<code>1 1 2 3</code>", "<code>1 2 3 4</code>", "<code>1 2 3 3</code>", "<code>1 1 1 1</code>"], answer: 1,
        wrong: { 0: "There are not two counters: Snacks and Beverages both use <code>Food.next_id</code>.", 2: "The counter is bumped after every object, so after 3 objects it is 4." },
        hint: "There is one counter, in Food, shared by both subclasses.", explain: "All three bump the same <code>Food.next_id</code>, so the IDs are unique across Snacks and Beverages." },
      { type: "write", q: "Same pattern, new story. Write an abstract <code>Machine</code> with a unique <code>machine_id</code> starting at <b>100</b>, a method <code>assign_capacity</code> that returns a random int from 20 to 60 (stored in <code>self.capacity</code>), and an abstract <code>item_type()</code>. <code>SnackMachine.item_type()</code> returns <code>'snacks'</code>, <code>DrinkMachine.item_type()</code> returns <code>'drinks'</code>.",
        starter: `
          import random
          from abc import ABC, abstractmethod

          # Machine, SnackMachine, DrinkMachine

          m = SnackMachine()
          print(m.machine_id, m.capacity, m.item_type())`,
        test: "a = SnackMachine()\nb = DrinkMachine()\nassert b.machine_id == a.machine_id + 1, 'IDs should go up by one across both kinds'\nassert a.machine_id >= 100, 'IDs should start at 100'\nassert a.item_type() == 'snacks' and b.item_type() == 'drinks', 'item_type() is wrong'\ncaps = [DrinkMachine().capacity for i in range(300)]\nassert min(caps) >= 20 and max(caps) <= 60, 'capacity must be 20..60'\nassert len(set(caps)) > 10, 'capacity should be random'\ntry:\n    Machine()\nexcept TypeError:\n    pass\nelse:\n    raise AssertionError('Machine() should fail: make it abstract')",
        solution: `
          import random
          from abc import ABC, abstractmethod

          class Machine(ABC):
              next_id = 100                              # IDs start at 100

              def __init__(self):
                  self.machine_id = Machine.next_id
                  Machine.next_id += 1
                  self.capacity = self.assign_capacity()

              def assign_capacity(self):
                  return random.randint(20, 60)

              @abstractmethod
              def item_type(self):
                  pass

          class SnackMachine(Machine):
              def item_type(self):
                  return 'snacks'

          class DrinkMachine(Machine):
              def item_type(self):
                  return 'drinks'`,
        hint: "Copy the Q1 shape, change the names and the numbers.", explain: "If you can do this one without looking, you can do Q1." },
      { type: "explain", q: "Exam style: in 3–4 sentences, explain how your code guarantees a unique ID for every Food, and why <code>self.next_id += 1</code> would break it.",
        answer: "<p><code>next_id</code> is a class variable on <code>Food</code>, so there is one shared counter for all foods, snacks and beverages alike. In <code>__init__</code> each new object copies the current value into its own <code>self.id</code>, then the counter is increased with <code>Food.next_id += 1</code>, so the next object gets the next number and no number can repeat. Writing <code>self.next_id += 1</code> would instead create a new instance variable on that one object; the class counter would stay at 1, so every food would get ID 1.</p>",
        points: ["next_id is a class variable: one shared copy", "copy it into self.id, then increase it through the class name", "assigning through self makes a private copy and the class counter never moves"],
        hint: "Two parts: where the counter lives, and what assigning through <code>self</code> does." },
    ],
  };

  /* ================================================================
     TOPIC 8: Errors & tracebacks
     ================================================================ */

  // --- widget: the Museum of Errors ---
  const EXHIBITS = [
    { name: "if balance = 100", wing: 1, code: ["balance = 100", "print('checking balance...')", "if balance = 100:", "    print('rich')"], crash: 3, ran: 0,
      out: "SyntaxError: invalid syntax. Maybe you meant '==' or ':=' instead of '='?", why: "Python reads the <b>whole</b> cell before running anything. The broken line 3 stops it, so even line 2 never prints." },
    { name: "missing comma", wing: 1, code: ["stock = [3, 0, 5]", "print('checking...')", "print(has_stock(stock 1))"], crash: 3, ran: 0,
      out: "SyntaxError: invalid syntax. Perhaps you forgot a comma?", why: "Exam Q2's bug. Two values side by side with no comma is not valid Python. Nothing runs." },
    { name: "body not indented", wing: 1, code: ["class Item:", "    def restock(self, n):", "    self.stock += n"], crash: 3, ran: 0,
      out: "IndentationError: expected an indented block after function definition on line 2", why: "A <code>def</code> line ends with <code>:</code>, so the next line must be indented 4 more spaces." },
    { name: "succes", wing: 2, code: ["success = True", "print('paid')", "print('status:', succes)"], crash: 3, ran: 2,
      out: "paid\nNameError: name 'succes' is not defined. Did you mean: 'success'?", why: "Exam Q4's bug. Lines 1–2 run fine (\"paid\" is printed), then line 3 crashes on the typo." },
    { name: "post.likse", wing: 2, code: ["post = SocialMediaPost('anand', 'hi')", "post.like()", "print(post.likse)"], crash: 3, ran: 2,
      out: "AttributeError: 'SocialMediaPost' object has no attribute 'likse'", why: "The object exists, but it has no attribute with that name. Check spelling, and that <code>__init__</code> really sets it." },
    { name: "promote too far", wing: 2, code: ["positions = ['Junior', 'Senior', 'Lead']", "level = 0", "for i in range(4):", "    level += 1", "    print(positions[level])"], crash: 5, ran: 4,
      out: "Senior\nLead\nIndexError: list index out of range", why: "Exercise 4 Q1. Two rounds work, then <code>level</code> is 3 but the last index is 2." },
    { name: "x = x.append(…)", wing: 2, code: ["transactions = [100, -20]", "transactions = transactions.append(50)", "transactions.append(10)"], crash: 3, ran: 2,
      out: "AttributeError: 'NoneType' object has no attribute 'append'", why: "<b>Far from the cause.</b> Line 3 crashes, but the bug is line 2: <code>.append</code> returns <code>None</code>, and that None was stored." },
    { name: "off by one", wing: 3, code: ["total = 0", "for i in range(1, 10):          # meant 1..10", "    if i % 3 == 0 or i % 5 == 0:", "        total += i", "print(total)"], crash: 0, ran: 5,
      out: "23", why: "Should be 33 (3 + 5 + 6 + 9 + 10). <code>range(1, 10)</code> stops at 9, so 10 is missed. No error: only a test that <b>knows</b> the answer catches it." },
    { name: "every ID is 1", wing: 3, code: ["class Food:", "    next_id = 1", "    def __init__(self):", "        self.id = self.next_id", "        self.next_id += 1", "print(Food().id, Food().id)"], crash: 0, ran: 6,
      out: "1 1", why: "Assigning through <code>self</code> makes a private copy; the class counter never moves. Runs fine, wrong answer." },
    { name: "0.1 ten times", wing: 3, code: ["balance = 0", "for i in range(10):", "    balance += 0.1", "print(balance == 1.0)"], crash: 0, ran: 4,
      out: "False", why: "Floats are tiny approximations: the sum is 0.9999999999999999. Compare with <code>round(balance, 2) == 1.0</code>." },
  ];
  const WINGS = ["", "Wing 1: won't start", "Wing 2: crashes", "Wing 3: wrong answer"];
  function museumWidget(el, api) {
    let ei = 0, guess = null;
    const score = { right: 0, seen: new Set() };
    const list = h("div", { class: "row-wrap", role: "group", "aria-label": "Exhibits" });
    const codeBox = h("div"), guessRow = h("div", { class: "row-wrap" }), reveal = h("div", { "aria-live": "polite" }), scoreEl = h("p", { class: "small muted", style: "margin:8px 0 0" });
    EXHIBITS.forEach((x, i) => list.appendChild(h("button", { type: "button", class: "btn small mono oop-pick", onclick: () => { ei = i; guess = null; draw(); } }, x.name)));
    [1, 2, 3].forEach(w => guessRow.appendChild(h("button", { type: "button", class: "btn small oop-wing oop-w" + w, onclick: () => { guess = w; if (!score.seen.has(ei)) { score.seen.add(ei); if (w === EXHIBITS[ei].wing) score.right++; } draw(); } }, WINGS[w])));
    function draw() {
      const x = EXHIBITS[ei];
      [...list.children].forEach((b, i) => b.setAttribute("aria-pressed", String(i === ei)));
      const n = x.code.length, all = Array.from({ length: n }, (_, i) => i + 1);
      const shown = guess != null;
      const opts = { code: x.code };
      if (shown) {
        if (x.wing === 1) { opts.dim = all.filter(l => l !== x.crash); opts.bad = [x.crash]; }
        else if (x.wing === 2) { opts.good = all.filter(l => l < x.crash); opts.bad = [x.crash]; opts.dim = all.filter(l => l > x.crash); }
        else opts.good = all;
      }
      codeBox.replaceChildren(ui.code(opts));
      [...guessRow.children].forEach((b, i) => b.setAttribute("aria-pressed", String(guess === i + 1)));
      if (!shown) reveal.replaceChildren(h("p", { class: "small", style: "margin:8px 0 0" }, "Which wing does this exhibit belong to? Pick one."));
      else {
        const ok = guess === x.wing;
        const legend = x.wing === 1 ? "Grey = never ran. Nothing in the cell ran, not even the lines above the error." : x.wing === 2 ? "Green = ran, red = crashed here, grey = never reached." : "Every line ran (green). The answer is still wrong.";
        reveal.replaceChildren(
          h("p", { class: ok ? "oop-ok" : "oop-bad", style: "margin:8px 0 4px;font-weight:600" }, (ok ? "Right: " : "Not quite: it is ") + WINGS[x.wing] + (ok ? " ✓" : "")),
          h("p", { class: "small muted", style: "margin:0 0 6px" }, legend),
          eyebrow("Output", "margin:6px 0 4px"), h("pre", { class: "st-out" + (x.wing < 3 ? " oop-errout" : "") }, x.out),
          h("p", { class: "small", style: "margin:8px 0 0", html: x.why }));
      }
      scoreEl.textContent = `Score: ${score.right} right out of ${score.seen.size} tried (${EXHIBITS.length} exhibits).`;
    }
    el.append(eyebrow("1. Pick an exhibit", "margin:0 0 6px"), list, h("div", { class: "oop-two", style: "margin-top:12px" }, codeBox, h("div", null, eyebrow("2. Which wing?", "margin:0 0 6px"), guessRow, reveal, scoreEl)));
    draw();
  }

  // --- widget: traceback reader ---
  const TB_SRC = [
    "class Food:",
    "    def __init__(self, name, calories):",
    "        self.name = name",
    "        self.calories = calories",
    "",
    "    def calories_per_bite(self, bites):",
    "        return self.calories / bites",
    "",
    "def report(food):",
    "    bites = 0                          # oops",
    "    return food.calories_per_bite(bites)",
    "",
    "chips = Food('chips', 150)",
    "print(report(chips))",
  ];
  const TB = [
    { t: "Traceback (most recent call last):", k: "head", line: null, ex: "<b>The header.</b> “Most recent call last” means the newest call is at the <b>bottom</b>. So read a traceback from the bottom up." },
    { t: '  File "shop.py", line 14, in <module>', k: "file", line: 14, ex: "<b>Where it started:</b> file shop.py, line 14. <code>&lt;module&gt;</code> means the top level of the file, outside any function. This is the oldest call." },
    { t: "    print(report(chips))", k: "code", line: 14, ex: "The code on that line. It called <code>report(chips)</code>." },
    { t: "          ^^^^^^^^^^^^^", k: "caret", line: 14, ex: "The <code>^^^</code> marks the part of the line that was running: the call to <code>report</code>." },
    { t: '  File "shop.py", line 11, in report', k: "file", line: 11, ex: "<b>One step deeper:</b> line 11, inside the function <code>report</code>. It called a method." },
    { t: "    return food.calories_per_bite(bites)", k: "code", line: 11, ex: "The line in <code>report</code> that was running." },
    { t: "           ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^", k: "caret", line: 11, ex: "The method call that was running." },
    { t: '  File "shop.py", line 7, in calories_per_bite', k: "file", line: 7, ex: "<b>Where it crashed:</b> the last File line is the newest call: line 7, inside the method <code>calories_per_bite</code>." },
    { t: "    return self.calories / bites", k: "code", line: 7, ex: "The exact line that crashed." },
    { t: "           ~~~~~~~~~~~~~~^~~~~~~", k: "caret", line: 7, ex: "The single <code>^</code> points at the operator that failed: the <code>/</code>. The <code>~</code> marks its two sides." },
    { t: "ZeroDivisionError", k: "type", line: 7, ex: "<b>The error type: what kind of problem.</b> Read this first. ZeroDivisionError = you divided by 0." },
    { t: ": division by zero", k: "msg", line: 7, ex: "<b>The message: the details.</b> For a NameError it names the missing name; for a KeyError, the missing key." },
  ];
  const TB_ORDER = [10, 11, 7, 8, 9, 4, 5, 1, 2, 0];
  function tracebackWidget(el) {
    let ai = 10, ord = 0;
    const codeBox = h("div"), pre = h("div", { class: "oop-tb", role: "group", "aria-label": "Traceback parts" }), ex = h("div", { class: "oop-tbex", "aria-live": "polite" });
    const btns = TB.map((p, i) => h("button", { type: "button", class: "oop-tbpart oop-tb-" + p.k, onclick: () => { ai = i; draw(); } }, p.t));
    // the last two parts share one line
    TB.forEach((p, i) => { if (p.k === "msg") return; const ln = h("div", { class: "oop-tbline" }, btns[i]); if (p.k === "type") ln.appendChild(btns[i + 1]); pre.appendChild(ln); });
    const nextBtn = h("button", { type: "button", class: "btn small primary" }, "Read it in order (bottom up) →");
    nextBtn.onclick = () => { ord = (ord + 1) % TB_ORDER.length; ai = TB_ORDER[ord]; draw(); };
    function draw() {
      btns.forEach((b, i) => b.setAttribute("aria-pressed", String(i === ai)));
      const p = TB[ai];
      codeBox.replaceChildren(ui.code({ code: TB_SRC, active: p.line ? [p.line] : [], bad: p.k === "type" || p.k === "msg" ? [7] : [], good: ai === 10 || ai === 11 ? [10] : [] }));
      ex.innerHTML = p.ex + (ai === 10 || ai === 11 ? "<p class='small' style='margin:6px 0 0'>The crash is on line 7, but the <b>cause</b> is line 10 (<code>bites = 0</code>, marked green). The traceback tells you where it broke, not always where the mistake is.</p>" : "");
      pop(ex);
    }
    el.append(row(nextBtn, h("span", { class: "small muted" }, "or click any part")), h("div", { class: "oop-two", style: "margin-top:12px" }, h("div", null, eyebrow("The traceback", "margin:0 0 6px"), pre, ex), h("div", null, eyebrow("shop.py", "margin:0 0 6px"), codeBox)));
    draw();
  }

  const errors = {
    id: "errors",
    title: "Errors & tracebacks",
    summary: "The Museum of Errors (won't start / crashes / wrong answer), the common error types, and how to read a traceback from the bottom up.",
    exam: ["Q2 syntax errors", "Q4 runtime + logic errors"],
    sources: "L5 p5–16, 26–29 · NB §21, 23",
    blocks: [
      { type: "h", text: "Loud and silent failures" },
      { type: "table", head: ["", "Loud", "Silent"], rows: [
        ["What you see", "Python stops with a red error", "it runs, but the answer is wrong"],
        ["Tiny example", "<code>10 / 0</code> → ZeroDivisionError", "<code>range(1, 10)</code> when you meant 1..10"],
        ["How bad?", "annoying, but it tells you where", "<b>worse</b>: you might never notice"],
      ] },
      `<p>The course's goal: turn silent failures into loud ones, with tests (<code>assert</code>) and checks (<code>raise</code>). See the next page.</p>`,

      { type: "h", text: "The Museum of Errors", sub: "Three wings, by when things go wrong. Sort each exhibit." },
      { type: "table", head: ["Wing", "When", "Error types", "What ran?"], rows: [
        ["<b>1. Won't start</b>", "Python can't even read the code", "SyntaxError, IndentationError, TabError", "<b>nothing</b> in the cell"],
        ["<b>2. Starts, then crashes</b>", "a line fails while running", "NameError, TypeError, ValueError, IndexError, KeyError, AttributeError, ZeroDivisionError…", "every line <b>before</b> the crash"],
        ["<b>3. Finishes, wrongly</b>", "no error, wrong result", "none! (logic error)", "everything"],
      ] },
      { type: "widget", title: "Sort the exhibits", render: museumWidget },
      { type: "callout", kind: "exam", title: "Exam Q2 and Q4", html: "<p><b>Q2</b>: only Wing 1 (list every syntax error <b>with its line number</b>, then the fixed code). <b>Q4</b>: Wing 1 <i>and</i> Wings 2–3 (“logical or runtime”), with a 3–4 sentence explanation of each. Say which wing each bug is in: it shows you understand <i>when</i> it goes wrong.</p>" },

      { type: "h", text: "Wing 2: the common crashes" },
      { type: "table", head: ["Error", "Tiny example", "Message", "Usual cause"], code: [1], rows: [
        ["<code>NameError</code>", "print(succes)", "name 'succes' is not defined", "typo, or used before it was made"],
        ["<code>TypeError</code>", "'Total: ' + 5", "can only concatenate str (not \"int\") to str", "wrong type, or wrong number of arguments"],
        ["<code>ValueError</code>", "int('abc')", "invalid literal for int() with base 10: 'abc'", "right type, bad value"],
        ["<code>IndexError</code>", "[1, 2, 3][3]", "list index out of range", "last index is len − 1"],
        ["<code>KeyError</code>", "{'cola': 3}['water']", "'water'", "the key is not in the dict"],
        ["<code>AttributeError</code>", "post.likse", "'SocialMediaPost' object has no attribute 'likse'", "typo, or <code>__init__</code> never set it"],
        ["<code>ZeroDivisionError</code>", "10 / 0", "division by zero", "dividing by a count that is 0"],
        ["<code>UnboundLocalError</code>", "likes += 1   # in a method", "cannot access local variable 'likes' where it is not associated with a value", "forgot <code>self.</code>"],
      ] },
      { type: "h", text: "Errors are classes too", sub: "They form a family tree. Catching a parent catches all its children." },
      () => {
        const S = D.svg({ w: 460, h: 200, label: "error family tree" });
        const nodes = [["Exception", 230, 20, "min"], ["ArithmeticError", 60, 90], ["LookupError", 190, 90, "accent"], ["ValueError", 310, 90], ["TypeError", 410, 90], ["ZeroDivisionError", 60, 160], ["IndexError", 140, 160, "accent"], ["KeyError", 240, 160, "accent"], ["InsufficientFunds", 350, 160, "cmp"]];
        const at = {};
        nodes.forEach(([id, x, y]) => (at[id] = [x, y]));
        [["ArithmeticError", "Exception"], ["LookupError", "Exception"], ["ValueError", "Exception"], ["TypeError", "Exception"], ["ZeroDivisionError", "ArithmeticError"], ["IndexError", "LookupError"], ["KeyError", "LookupError"], ["InsufficientFunds", "ValueError"]]
          .forEach(([c, p]) => S.arrow(at[c][0], at[c][1] - 14, at[p][0], at[p][1] + 15, { tone: "muted" }));
        nodes.forEach(([id, x, y, tone]) => { const w = id.length * 7.4 + 14; S.box(x - w / 2, y - 13, w, 26, { text: id, tone, size: 12 }); });
        S.text(350, 190, "(your own, next page)", { muted: true, ui: true });
        return h("div", null, S.el, h("p", { class: "small", style: "margin:6px 0 0", html: "<code>except LookupError:</code> catches both IndexError and KeyError. <code>except Exception:</code> catches almost everything, which is usually too much." }));
      },

      { type: "h", text: "Reading a traceback", sub: "Click the parts. Start at the bottom." },
      { type: "widget", render: tracebackWidget },
      { type: "table", caption: "The routine (L5 p26–29)", head: ["Step", "Do this"], rows: [
        ["1. Read the last line", "error type + message: <i>what</i> went wrong"],
        ["2. Find the last <code>File … line N</code>", "<i>where</i> it crashed (in your code, not inside Python's)"],
        ["3. Walk up", "which calls led there"],
        ["4. Find the cause", "print the values just before the crash line; the bug may be earlier (line 10 above)"],
        ["5. Change one thing", "then run again. Re-run the <b>whole</b> notebook if classes changed"],
      ] },
      {
        type: "tryit",
        title: "Read a real traceback",
        task: "Run it, then read the traceback bottom up: which line crashed, and which line is the real cause? Fix the cause, not the crash line.",
        code: `
          def add_interest(b):
              print(b * 1.05)                  # the real bug: print, not return

          def year_end(b):
              return add_interest(b) - 2       # the line that crashes

          total = year_end(100)
          print(total)`,
        expectOutput: "103.0",
        hint: "The crash: <code>None - 2</code> on line 5. The cause: line 2 prints instead of returning, so <code>add_interest</code> gives back None.",
        solution: `
          def add_interest(b):
              return b * 1.05                  # give the value back

          def year_end(b):
              return add_interest(b) - 2

          total = year_end(100)
          print(total)`,
      },
      { type: "mistakes", items: [
        { title: "Reading the traceback from the top", wrong: "Looking at the first File line", right: "Start with the last line, then the last File line", why: "The newest call, where it actually crashed, is at the <b>bottom</b>." },
        { title: "Fixing the crash line instead of the cause", wrong: "return (add_interest(b) or 0) - 2", right: "def add_interest(b):\n    return b * 1.05", why: "The crash line is often innocent. Ask: where did this bad value (None, 0, …) come from?" },
        { title: "Old objects after editing a class", wrong: "edit the class cell, run only the last cell", right: "Kernel → Restart & Run All", why: "Objects built before the edit still use the old class. Confusing errors, and IDs that don't start at 1." },
        { title: "Thinking no error means correct", wrong: "It ran, so it's right", right: "Check against an answer you worked out by hand", why: "Wing 3 bugs never crash. Only a test that knows the answer catches them." },
        { title: "Typos in names (Q4)", wrong: "print('Payment', succes)", right: "print('Payment', success)", why: "A NameError, but only when that line runs. If it is in a branch that rarely runs, you may not see it in testing." },
      ] },
    ],
    quiz: [
      { type: "bug", q: "Exam Q2 style (OOP version). Click every line with a <b>syntax</b> error.", code: `
          class Item:
              def __init__(self, name, price)
                  self.name = name
                  self.price = price

              def is_cheap(self):
                  if self.price < 10:
                      retrun True
                  return False

          cola = Item('cola' 15)`,
        bugs: [2, 8, 11], notes: { 2: "missing <code>:</code> at the end of the def line", 8: "<code>retrun</code> → <code>return</code> (Python reads two names side by side: SyntaxError)", 11: "missing comma: <code>Item('cola', 15)</code>" },
        fixed: `
          class Item:
              def __init__(self, name, price):
                  self.name = name
                  self.price = price

              def is_cheap(self):
                  if self.price < 10:
                      return True
                  return False

          cola = Item('cola', 15)`,
        hint: "The same three kinds as last year's Q2: a missing colon, a misspelled keyword, a missing comma.", explain: "In the exam, write each as “Line 2: missing colon after the def …”, then give the corrected code." },
      { type: "mc", q: "A cell has a SyntaxError on line 5. Lines 1–4 contain <code>print('start')</code>. What is printed?",
        options: ["<code>start</code>, then the error", "Only the error: nothing runs", "<code>start</code> and no error", "It depends on the error"], answer: 1,
        hint: "Wing 1: when does Python find a syntax error?", explain: "Python reads the whole cell before running it. A syntax error stops it from starting at all." },
      { type: "mc", q: "Which error does this raise?", code: "prices = {'cola': 15, 'chips': 20}\nprint(prices['water'])", options: ["IndexError", "KeyError", "NameError", "ValueError"], answer: 1,
        hint: "What kind of lookup failed: a position or a key?", explain: "A dict lookup with a missing key raises <code>KeyError: 'water'</code>. Use <code>prices.get('water', 0)</code> to avoid it." },
      { type: "bug", q: "Exam Q4 style. This runs without an error but has a <b>logic</b> error: overpaying is reported as failed. Click the buggy line.", code: `
          def process_payment(price, coins):
              total = sum(coins)
              if total == price:
                  print('Payment successful')
                  return True
              else:
                  print('Payment failed, refund', total)
                  return False

          process_payment(15, [10, 10])`,
        bugs: [3], notes: { 3: "<code>==</code> only accepts the exact amount. Paying 20 for a 15 item should succeed (with change): <code>if total >= price:</code>" },
        fixed: `
          def process_payment(price, coins):
              total = sum(coins)
              if total >= price:
                  print('Payment successful, change', total - price)
                  return True
              else:
                  print('Payment failed, refund', total)
                  return False

          process_payment(15, [10, 10])`,
        hint: "What should happen when the customer pays 20 for a 15 item?", explain: "This is a Wing 3 bug: no crash, wrong behaviour. In Q4 you explain it in words: the condition only accepts the exact amount, so overpaying customers are refunded instead of served." },
      { type: "explain", q: "Exam Q4 style. Explain in 3–4 sentences why this crashes, which line is the real cause, and how to fix it.", code: "def add_interest(b):\n    print(b * 1.05)\n\ndef year_end(b):\n    return add_interest(b) - 2\n\nyear_end(100)",
        answer: "<p>The traceback points at line 5 with <code>TypeError: unsupported operand type(s) for -: 'NoneType' and 'int'</code>. The real cause is line 2: <code>add_interest</code> prints the result instead of returning it, so the call gives back <code>None</code>. Line 5 then tries <code>None - 2</code>, which crashes. The fix is to write <code>return b * 1.05</code> in <code>add_interest</code>.</p>",
        points: ["the crash is on line 5 (TypeError: None - 2)", "the cause is line 2: print instead of return", "a function without return gives back None", "fix: return b * 1.05"],
        hint: "What does <code>add_interest(100)</code> give back?" },
    ],
  };

  /* ================================================================
     TOPIC 9: try/except, raise, assert & testing
     ================================================================ */

  const TRY_CODE = typed => `
    typed = ${typed}
    try:
        amount = float(typed)        # the risky line
        print('got', amount)
    except ValueError as err:
        print('Sorry:', err)
    else:
        print('no error')
    finally:
        print('done')
    print('next customer')`;
  // flow states per block: run | skip | crash | now
  function trySteps(kind) {
    const B = (o) => Object.assign({ try: "", except: "", else: "", finally: "", after: "" }, o);
    if (kind === "good") return [
      { line: 1, now: "The customer typed <code>'200'</code>.", vars: { typed: "'200'" }, fl: B({}) },
      { line: 2, now: "Enter the <code>try</code> block: Python will watch for errors here.", fl: B({ try: "now" }) },
      { line: 3, now: "<code>float('200')</code> works: <b>200.0</b>.", vars: { typed: "'200'", amount: "200.0" }, fl: B({ try: "now" }) },
      { line: 4, now: "Still in try.", print: "got 200.0", fl: B({ try: "now" }) },
      { line: 5, now: "No error happened, so the <code>except</code> block is <b>skipped</b>.", fl: B({ try: "run", except: "skip" }) },
      { line: 8, now: "<code>else</code> runs only when try had <b>no</b> error.", print: "no error", fl: B({ try: "run", except: "skip", else: "now" }) },
      { line: 10, now: "<code>finally</code> <b>always</b> runs.", print: "done", fl: B({ try: "run", except: "skip", else: "run", finally: "now" }) },
      { line: 11, now: "Carry on as normal.", print: "next customer", fl: B({ try: "run", except: "skip", else: "run", finally: "run", after: "now" }) },
    ];
    if (kind === "bad") return [
      { line: 1, now: "The customer typed <code>'two hundred'</code>.", vars: { typed: "'two hundred'" }, fl: B({}) },
      { line: 2, now: "Enter the <code>try</code> block.", fl: B({ try: "now" }) },
      { line: 3, now: "<code>float('two hundred')</code> fails: <b>ValueError</b>. Python stops the try block <b>right here</b>.", fl: B({ try: "crash" }) },
      { line: 5, now: "Line 4 is <b>skipped</b>. Is the error a ValueError? <b>Yes</b>, so this except catches it. <code>err</code> is the error object.", vars: { typed: "'two hundred'", err: "ValueError(…)" }, fl: B({ try: "crash", except: "now" }) },
      { line: 6, now: "Printing <code>err</code> shows its message.", print: "Sorry: could not convert string to float: 'two hundred'", fl: B({ try: "crash", except: "now" }) },
      { line: 7, now: "There was an error, so <code>else</code> is skipped.", fl: B({ try: "crash", except: "run", else: "skip" }) },
      { line: 10, now: "<code>finally</code> always runs.", print: "done", fl: B({ try: "crash", except: "run", else: "skip", finally: "now" }) },
      { line: 11, now: "The error was handled: the program carries on.", print: "next customer", fl: B({ try: "crash", except: "run", else: "skip", finally: "run", after: "now" }) },
    ];
    return [
      { line: 1, now: "<code>typed</code> is <code>None</code> (say the input box was empty).", vars: { typed: "None" }, fl: B({}) },
      { line: 2, now: "Enter the <code>try</code> block.", fl: B({ try: "now" }) },
      { line: 3, now: "<code>float(None)</code> fails with a <b>TypeError</b>, not a ValueError.", fl: B({ try: "crash" }) },
      { line: 5, now: "Is it a ValueError? <b>No.</b> This except does not match, so it is skipped.", fl: B({ try: "crash", except: "skip" }) },
      { line: 10, now: "<code>finally</code> still runs, even now.", print: "done", fl: B({ try: "crash", except: "skip", else: "skip", finally: "now" }) },
      { line: 11, now: "Nobody caught the error, so the program <b>crashes</b>. This line never runs.", print: "TypeError: float() argument must be a string or a real number, not 'NoneType'", fl: B({ try: "crash", except: "skip", else: "skip", finally: "run", after: "crash" }) },
    ];
  }
  function tryVisual(el, st) {
    const S = D.svg({ w: 300, h: 290, label: "try except else finally flow" });
    const blocks = [["try", "try:  risky lines"], ["except", "except ValueError:"], ["else", "else:  no error"], ["finally", "finally:  always"], ["after", "the rest of the program"]];
    const toneOf = s => s === "now" ? "cmp" : s === "run" ? "done" : s === "crash" ? "swap" : null;
    const lab = s => s === "now" ? "running" : s === "run" ? "ran ✓" : s === "crash" ? "error ✗" : s === "skip" ? "skipped" : "";
    blocks.forEach(([k, t], i) => {
      const y = 6 + i * 57, s = st.fl[k];
      S.box(10, y, 200, 40, { text: t, tone: toneOf(s), faded: s === "skip", size: 13 });
      S.text(220, y + 20, lab(s), { anchor: "start", ui: true, small: true, muted: s === "skip" || !s });
      if (i < blocks.length - 1) S.arrow(110, y + 42, 110, y + 55, { tone: "muted" });
    });
    el.appendChild(S.el);
  }
  const tryStepper = (kind, typed) => ({
    type: "stepper",
    title: kind === "good" ? "typed = '200'" : kind === "bad" ? "typed = 'two hundred'" : "typed = None (an error nobody catches)",
    code: TRY_CODE(typed),
    what: { 2: "Start watching for errors.", 3: "The line that might fail.", 4: "Runs only if line 3 worked.", 5: "Catches ValueError only. err is the error object.", 6: "Handle it: a friendly message.", 7: "Runs only if try had NO error.", 9: "Runs no matter what.", 11: "After the whole try statement." },
    steps: trySteps(kind),
    visualTitle: "Which blocks run",
    legend: [["cmp", "running now"], ["done", "ran"], ["swap", "error"]],
    visual: tryVisual,
  });

  // --- widget: partitions and boundaries for StrictBusinessAccount.deposit ---
  function partitionWidget(el) {
    let buggy = false;
    const TESTS = [
      [-10, "negative"], [0, "zero"], [3, "below the fee"], [5, "exactly the fee (boundary)"], [6, "just above (boundary)"], [200, "typical"],
    ];
    const ctl = segCtl(["if amount <= self.fee (right)", "if amount < self.fee (bug)"], i => { buggy = i === 1; results.clear(); draw(); }, "Version of the check");
    const results = new Map();
    const codeBox = h("div"), tbl = h("div"), btnRow = h("div", { class: "row-wrap" }), msg = h("p", { class: "small", style: "margin:8px 0 0", "aria-live": "polite" });
    TESTS.forEach(([v, lab], i) => btnRow.appendChild(h("button", { type: "button", class: "btn small mono", title: lab, onclick: () => { results.set(i, true); draw(); } }, "deposit(" + v + ")")));
    const all = h("button", { type: "button", class: "btn small primary" }, "Run all tests");
    all.onclick = () => { TESTS.forEach((_, i) => results.set(i, true)); draw(); };
    function draw() {
      codeBox.replaceChildren(ui.code({ code: [
        "def deposit(self, amount):",
        "    \"\"\"Raises ValueError if amount is not more than the fee (5).",
        "    Otherwise adds amount - fee to the balance (500).\"\"\"",
        "    if amount " + (buggy ? "<" : "<=") + " self.fee:",
        "        raise ValueError('Deposit must be more than the fee of 5')",
        "    self.balance += amount - self.fee"], active: [4], bad: buggy ? [4] : [] }));
      const rows = [];
      let fails = 0;
      TESTS.forEach(([v, lab], i) => {
        const expRaise = v <= 5;
        const exp = expRaise ? "ValueError" : "balance " + (500 + v - 5);
        const gotRaise = buggy ? v < 5 : v <= 5;
        const got = gotRaise ? "ValueError" : "balance " + (500 + v - 5);
        const ran = results.has(i);
        const pass = exp === got;
        if (ran && !pass) fails++;
        rows.push([String(v), lab, exp, ran ? got : "<span class='muted'>not run</span>", ran ? (pass ? "<span class='ok'>pass ✓</span>" : "<span class='bad'>FAIL ✗</span>") : ""]);
      });
      tbl.replaceChildren(ui.table({ head: ["amount", "partition", "spec says", "got", "test"], num: [0], rows }));
      const n = results.size;
      msg.innerHTML = !n ? "Click a test, or run them all." : fails ? `<b class="oop-bad">${fails} test failed.</b> Only the <b>boundary</b> test <code>deposit(5)</code> catches the <code>&lt;</code> bug. Typical values (200) never would.` : buggy && !results.has(3) ? "All passing so far… but have you tried the boundary?" : "All run tests pass.";
    }
    el.append(ctl.el, h("div", { class: "oop-two", style: "margin-top:12px" }, codeBox, h("div", null, row(btnRow, all), h("div", { style: "margin-top:10px" }, tbl), msg)));
    draw();
  }

  const exceptions = {
    id: "exceptions",
    title: "try/except, raise, assert & testing",
    summary: "Catch errors with <code>try/except</code>, refuse bad input with <code>raise</code>, check your own code with <code>assert</code>, and pick tests that find bugs (partitions and boundaries).",
    exam: ["Q4 runtime errors", "Ex5 Q12–Q14"],
    sources: "L5 p17–25, 34–40 · NB §22, 25",
    blocks: [
      { type: "h", text: "try / except: catch an error and carry on" },
      { type: "table", head: ["Block", "Runs when", "Tiny example"], code: [2], rows: [
        ["<code>try:</code>", "always: the risky lines", "amount = float(typed)"],
        ["<code>except ValueError as err:</code>", "a <b>ValueError</b> happened in try", "print('Sorry:', err)"],
        ["<code>else:</code>", "try had <b>no</b> error", "print('new balance', acct.balance)"],
        ["<code>finally:</code>", "<b>always</b>, error or not", "print('done')"],
      ] },
      { type: "switch", label: "What the customer typed", items: [
        { label: "'two hundred'", blocks: [tryStepper("bad", "'two hundred'")] },
        { label: "'200'", blocks: [tryStepper("good", "'200'")] },
        { label: "None (not caught)", blocks: [tryStepper("none", "None")] },
      ] },
      { type: "callout", kind: "warn", title: "Never use a bare except:", html: "<p><code>except:</code> with no error type catches <b>everything</b>, including your own typos. In NB cell 185, <code>acct.depsit(amount)</code> (an AttributeError) was caught and the customer was told “Please enter a number”. Name the error you expect: <code>except ValueError:</code>.</p>" },
      {
        type: "tryit",
        title: "Ask until valid",
        task: "Each line of the typed-input box is one attempt. The loop keeps asking until <code>float()</code> works. Add more bad lines and see.",
        code: `
          while True:
              typed = input('How much? ')
              try:
                  amount = float(typed)        # may raise ValueError
                  break                        # only reached if it worked
              except ValueError:
                  print('Not a number, try again:', typed)

          print('Depositing', amount)`,
        stdin: "two hundred\n20O\n200",
      },

      { type: "h", text: "raise: refuse bad input yourself", sub: "Turn a silent problem into a loud one." },
      { type: "code", caption: "NB cell 187", code: `
          class StrictBusinessAccount(BankAccount):
              def __init__(self, owner, balance, fee):
                  super().__init__(owner, balance)
                  self.fee = fee

              def deposit(self, amount):
                  """Raises ValueError if amount is not more than the fee."""
                  if amount <= self.fee:
                      raise ValueError(f'Deposit must be more than the fee of {self.fee}')
                  super().deposit(amount - self.fee)

          strict = StrictBusinessAccount('CBS', 500, 5)
          try:
              strict.deposit(3)
          except ValueError as err:
              print('Refused:', err)       # Refused: Deposit must be more than the fee of 5` },
      { type: "table", head: ["Tool", "Use it for", "Tiny example"], code: [2], rows: [
        ["<code>raise</code>", "the <b>caller</b> did something wrong (bad input). The caller can catch it.", "raise ValueError('salary must be ≤ 100000')"],
        ["<code>assert</code>", "<b>you</b> (the programmer) made a mistake. A check that should never fail.", "assert len(snacks) == 200"],
        ["<code>return</code> a message", "almost never for errors: the caller may not notice", "<span class='bad'>return 'error'</span>"],
      ] },
      { type: "h", text: "Your own exception class", sub: "One line: a subclass of an existing error (NB cell 189)." },
      { type: "code", code: `
          class InsufficientFunds(ValueError):       # IS a ValueError
              """Raised when a withdrawal is larger than the balance."""

          def withdraw(account, amount):
              if amount > account.balance:
                  raise InsufficientFunds(f'Balance is only {account.balance}')
              account.balance -= amount

          try:
              withdraw(strict, 1000)
          except ValueError as err:                  # catches InsufficientFunds too
              print('Caught:', type(err).__name__, '-', err)` },
      {
        type: "tryit",
        title: "Exercise 5 Q12 and Q14: raise in a class",
        task: "<p>1. Make <code>promote</code> <b>raise</b> <code>ValueError(\"can't be promoted further\")</code> instead of crashing with an IndexError.</p><p>2. Make <code>__init__</code> raise a <code>ValueError</code> if <code>salary</code> is above 100000.</p><p>The last lines test both with try/except.</p>",
        code: `
          class Employee:
              positions = ['Junior', 'Senior', 'Lead']

              def __init__(self, name, salary):
                  self.name = name
                  self.salary = salary
                  self.level = 0

              def promote(self):
                  self.level += 1

          e = Employee('Gerry', 3000)
          try:
              for i in range(3):
                  e.promote()
          except ValueError as err:
              print('promote refused:', err)

          try:
              Employee('Rich', 500000)
          except ValueError as err:
              print('salary refused:', err)`,
        expectOutput: "promote refused: can't be promoted further\nsalary refused: salary must be at most 100000",
        hint: "In <code>promote</code>: <code>if self.level == len(Employee.positions) - 1: raise ValueError(\"can't be promoted further\")</code>. In <code>__init__</code>: <code>if salary &gt; 100000: raise ValueError('salary must be at most 100000')</code>.",
        solution: `
          class Employee:
              positions = ['Junior', 'Senior', 'Lead']

              def __init__(self, name, salary):
                  if salary > 100000:
                      raise ValueError('salary must be at most 100000')
                  self.name = name
                  self.salary = salary
                  self.level = 0

              def promote(self):
                  if self.level == len(Employee.positions) - 1:     # already at the top
                      raise ValueError("can't be promoted further")
                  self.level += 1

          e = Employee('Gerry', 3000)
          try:
              for i in range(3):
                  e.promote()
          except ValueError as err:
              print('promote refused:', err)

          try:
              Employee('Rich', 500000)
          except ValueError as err:
              print('salary refused:', err)`,
      },

      { type: "h", text: "assert: a check that stays quiet when all is well" },
      { type: "table", head: ["Python", "What happens"], code: [0], rows: [
        ["assert 1 + 1 == 2", "nothing (True: silent)"],
        ["assert 1 + 1 == 3, 'maths is broken'", "<code>AssertionError: maths is broken</code>"],
        ["assert (1 + 1 == 3, 'msg')", "<span class='bad'>never fails!</span> A tuple in brackets is always True. Python warns: <i>assertion is always true</i>"],
      ] },

      { type: "h", text: "Testing: which inputs should you try?" },
      { type: "table", head: ["Kind", "Look at", "Pick tests from"], rows: [
        ["<b>Black-box</b>", "only the spec (the docstring)", "each <b>partition</b> (group of inputs that should behave the same) plus the <b>boundaries</b> between them"],
        ["<b>Glass-box</b>", "the code itself", "enough tests to run <b>every path</b>: each branch of every <code>if</code>, a loop 0, 1 and many times"],
      ] },
      { type: "widget", title: "Partitions and boundaries", intro: "The spec: <i>raise ValueError if amount is not more than the fee (5); otherwise add amount − 5 to the balance (500)</i>. Run the tests on the right version, then switch to the buggy one.", render: partitionWidget },
      {
        type: "tryit",
        title: "Write the tests yourself",
        task: "<code>balance_after_deposit</code> has a bug. Add <code>assert</code> lines for a typical value, the boundary and a negative amount until one fails. Spec: <i>returns 500 + amount − 5; raises ValueError if amount ≤ 5</i>.",
        code: `
          def balance_after_deposit(amount):
              if amount < 5:
                  raise ValueError('amount must be more than the fee')
              return 500 + amount - 5

          assert balance_after_deposit(200) == 695, 'typical: 500 + 200 - 5'
          # add a boundary test for 5 here (it should raise ValueError)
          print('all tests passed')`,
        hint: "A test that expects an error: <code>try:</code> call it, then <code>raise AssertionError('5 should be refused')</code>; <code>except ValueError: pass</code>.",
        solution: `
          def balance_after_deposit(amount):
              if amount <= 5:                          # fixed: 5 itself is refused
                  raise ValueError('amount must be more than the fee')
              return 500 + amount - 5

          assert balance_after_deposit(200) == 695, 'typical: 500 + 200 - 5'
          assert balance_after_deposit(6) == 501, 'just above the boundary'

          try:
              balance_after_deposit(5)                 # the boundary
              raise AssertionError('5 should be refused')
          except ValueError:
              pass                                     # good: it was refused

          print('all tests passed')`,
        solutionNote: "With the original <code>&lt;</code>, the boundary test raises <code>AssertionError: 5 should be refused</code>. That's the test doing its job.",
      },
      { type: "mistakes", items: [
        { title: "Bare <code>except:</code>", wrong: "try:\n    acct.depsit(amount)\nexcept:\n    print('enter a number')", right: "try:\n    acct.deposit(amount)\nexcept ValueError:\n    print('enter a number')", why: "Catches your own typo (AttributeError) and shows a misleading message." },
        { title: "Two error types without brackets", wrong: "except ValueError, TypeError:", right: "except (ValueError, TypeError):", why: "<code>SyntaxError: multiple exception types must be parenthesized</code>." },
        { title: "Raising a string", wrong: "raise 'amount too small'", right: "raise ValueError('amount too small')", why: "<code>TypeError: exceptions must derive from BaseException</code>. Raise an error <b>object</b>." },
        { title: "Returning an error message", wrong: "if amount <= self.fee:\n    return 'too small'", right: "if amount <= self.fee:\n    raise ValueError('too small')", why: "The caller may never look at the return value, so the bad deposit passes silently." },
        { title: "Brackets around assert", wrong: "assert (x == 3, 'x should be 3')", right: "assert x == 3, 'x should be 3'", why: "The brackets make a tuple, which is always True: the test can never fail." },
        { title: "Only testing typical values", wrong: "assert deposit(200) == 695", right: "# also: deposit(5), deposit(6), deposit(0), deposit(-10)", why: "Off-by-one bugs (<code>&lt;</code> vs <code>&lt;=</code>) hide at the boundary." },
      ] },
    ],
    quiz: [
      { type: "predict", q: "What does this print?", code: "try:\n    x = int('7')\n    print('A')\nexcept ValueError:\n    print('B')\nelse:\n    print('C')\nfinally:\n    print('D')", answer: "A\nC\nD",
        hint: "Does <code>int('7')</code> fail?", explain: "No error: try finishes (A), except is skipped, else runs (C), finally always runs (D)." },
      { type: "predict", q: "What does this print?", code: "try:\n    x = int('seven')\n    print('A')\nexcept ValueError:\n    print('B')\nelse:\n    print('C')\nfinally:\n    print('D')", answer: "B\nD",
        hint: "Where does the try block stop?", explain: "<code>int('seven')</code> raises ValueError, so A is skipped, except prints B, else is skipped, finally prints D." },
      { type: "mc", q: "<code>class InsufficientFunds(ValueError): pass</code>. Which <code>except</code> catches <code>raise InsufficientFunds('no')</code>?",
        options: ["only <code>except InsufficientFunds:</code>", "<code>except ValueError:</code> and <code>except InsufficientFunds:</code>", "only <code>except Exception:</code>", "<code>except TypeError:</code>"], answer: 1,
        hint: "Is an InsufficientFunds a ValueError?", explain: "A subclass error is caught by its own name and by any parent's name (ValueError, Exception)." },
      { type: "mc", q: "A spec says: <i>“Returns True if age is 18 or more.”</i> Which set of test inputs is best?", options: ["20, 30, 40", "17, 18, 19", "0, 100", "18"], answer: 1,
        hint: "Where would an off-by-one bug (<code>&gt;</code> vs <code>&gt;=</code>) show up?", explain: "17, 18 and 19 sit on both sides of the boundary. A bug like <code>age &gt; 18</code> only shows on 18. (A2 Part 2 had exactly this bug.)" },
      { type: "write", q: "Write <code>parse_amount(text)</code>: it returns <code>float(text)</code>, but <b>raises</b> <code>ValueError</code> if the number is 0 or negative. (Text that is not a number already raises ValueError inside <code>float</code>.)",
        starter: `
          def parse_amount(text):
              pass

          print(parse_amount('200'))`,
        checks: [["parse_amount('200')", "200.0"], ["parse_amount('0.5')", "0.5"]],
        test: "for bad in ['0', '-5', 'abc']:\n    try:\n        parse_amount(bad)\n    except ValueError:\n        pass\n    else:\n        raise AssertionError('parse_amount(' + repr(bad) + ') should raise ValueError')",
        solution: `
          def parse_amount(text):
              amount = float(text)                     # raises ValueError for 'abc'
              if amount <= 0:
                  raise ValueError('amount must be positive')
              return amount`,
        hint: "Convert first, then <code>if amount &lt;= 0: raise ValueError('…')</code>, then return.",
        explain: "Raise before returning. The caller decides what to do with the error (ask again, show a message…)." },
      { type: "explain", q: "In 2–3 sentences: when should you use <code>raise</code>, and when <code>assert</code>?",
        answer: "<p>Use <code>raise</code> when the <b>caller</b> or the user does something wrong, like a negative deposit: it is part of the function's promise, and the caller can catch it with try/except. Use <code>assert</code> to check your <b>own</b> code, like a test that <code>len(snacks) == 200</code> or that a function returns the expected value; if it fails, the programmer made a mistake.</p>",
        points: ["raise: bad input from the caller/user, can be caught", "assert: a check of your own code (tests)", "both turn silent problems into loud ones"],
        hint: "Whose mistake is it?" },
    ],
  };

  /* ================================================================
     Register
     ================================================================ */
  PADS.registerSubject({
    id: "oop",
    title: "Classes (OOP)",
    order: 3,
    blurb: "Classes and objects, <code>self</code> and <code>__str__</code>, class vs instance variables, inheritance and abstract methods, a full drill of exam Q1, plus errors, tracebacks, exceptions and testing.",
    covers: ["Classes, <code>self</code>, <code>__str__</code>", "Class variables: the unique-ID counter", "Inheritance, <code>super()</code>, abstract methods", "Exam Q1 drill: Food, Snacks, Beverages", "Errors, tracebacks, try/except, raise, assert"],
    exam: [
      "<b>Q1</b>: abstract <code>Food</code> with <code>Snacks</code> and <code>Beverages</code>, a unique ID from a class counter, random calories from a method, 200 objects each. See the <a href='#oop/exam-q1'>Q1 drill</a>.",
      "<b>Q2</b>: find syntax errors with line numbers (Wing 1 of the Museum of Errors).",
      "<b>Q4</b>: find syntax <i>and</i> runtime/logic errors and explain each in 3–4 sentences.",
    ],
    topics: [classes, selfTopic, strTopic, classVars, inheritance, abstractTopic, q1Topic, errors, exceptions],
  });
})();
