/* Sorting visualizer & Big-O: embeds the "Sorting, Line by Line" page (sorting/index.html) */
(function () {
  "use strict";
  const PAGE = "sorting/index.html";

  // One embedded view of the sorting page, opened on the given query (?algo=bubble, ?algo=bigo, ...)
  function frame(query, intro) {
    return function (el) {
      if (intro) {
        const p = document.createElement("p");
        p.innerHTML = intro;
        el.appendChild(p);
      }
      const box = document.createElement("div");
      box.className = "sv-wrap";
      const f = document.createElement("iframe");
      f.className = "sv-frame";
      f.title = "Sorting, Line by Line";
      f.loading = "lazy";
      f.src = PAGE + query;
      const fit = () => {                                   // grow the frame to the page's height (only same-origin, e.g. on the web)
        try {
          const d = f.contentDocument;
          if (d && d.documentElement) f.style.height = (d.documentElement.scrollHeight + 8) + "px";
        } catch (e) { /* file:// blocks this, so keep the fixed height */ }
      };
      f.addEventListener("load", () => {
        fit();
        try {
          const ro = new ResizeObserver(fit);
          ro.observe(f.contentDocument.body);
        } catch (e) { /* not available, fixed height is fine */ }
      });
      box.appendChild(f);
      el.appendChild(box);
      const a = document.createElement("p");
      a.className = "small muted";
      a.innerHTML = `<a href="${PAGE + query}" target="_blank" rel="noopener">Open full screen ↗</a>`;
      el.appendChild(a);
    };
  }

  const SORTS = [
    ["bubble", "Bubble sort", "Swap neighbours that are in the wrong order. After each pass the biggest item has bubbled to the end.", "O(n²), best O(n)"],
    ["selection", "Selection sort", "Find the smallest item in the unsorted part and swap it to the front.", "O(n²) always"],
    ["insertion", "Insertion sort", "Like sorting playing cards: take the next card and slide it left into place.", "O(n²), best O(n)"],
    ["merge", "Merge sort", "Split in half until one item is left, then merge the sorted halves. Watch the call stack.", "O(n log n) always"],
    ["quick", "Quick sort", "Pick a pivot, split into less / equal / greater, sort both sides.", "O(n log n), worst O(n²)"],
  ];

  const topics = SORTS.map(([id, title, idea, big]) => ({
    id, title,
    summary: idea,
    render: frame("?algo=" + id, `<b>Big-O:</b> ${big}<br><span class="small muted">Press Step (or →) to run one line at a time. The highlighted line is the one that just ran.</span>`),
  }));

  topics.push({
    id: "compare", title: "Compare all five",
    summary: "All five sorts side by side on the same list.",
    render: frame("?compare=1", "The same list sorted by all five algorithms: count the comparisons and swaps each one needs."),
  });

  topics.push({
    id: "bigo", title: "Big-O",
    summary: "How the work grows when the list gets bigger: curves, a slider for n, and the five sorts table.",
    render: frame("?algo=bigo", "Move the slider and press <b>Double n</b>: O(n) doubles, O(n²) goes ×4, O(n log n) a bit more than ×2. Your Exercise 9 benchmark found the same: ×4 for bubble/selection/insertion, ×2.3 for merge and <code>sorted()</code>."),
  });

  PADS.registerSubject({
    id: "sortviz",
    title: "Sorting visualizer",
    order: 6,
    blurb: "Your Sorting, Line by Line visualizer: every sort stepped line by line, plus the Big-O curves.",
    covers: ["bubble, selection, insertion, merge, quick sort", "call stack for the recursive sorts", "Big-O growth curves"],
    exam: [],
    topics,
  });
})();
