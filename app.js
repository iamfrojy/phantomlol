const view = document.getElementById("view");
const status = document.getElementById("status");

const PROXIES = [
  u => `https://api.allorigins.win/raw?url=${encodeURIComponent(u)}`,
  u => `https://corsproxy.io/?${encodeURIComponent(u)}`
];

let currentURL = "";

async function fetchHTML(url) {
  for (const p of PROXIES) {
    try {
      const r = await fetch(p(url));
      if (r.ok) return await r.text();
    } catch {}
  }
  throw "All proxies failed";
}

function absolutify(u, base) {
  try { return new URL(u, base).href; }
  catch { return u; }
}

function rewrite(doc, base) {
  // Remove CSP
  doc.querySelectorAll("meta[http-equiv]").forEach(m => m.remove());

  // Rewrite links
  doc.querySelectorAll("[href]").forEach(e => {
    e.setAttribute("href", absolutify(e.getAttribute("href"), base));
  });

  doc.querySelectorAll("[src]").forEach(e => {
    e.setAttribute("src", absolutify(e.getAttribute("src"), base));
  });

  // Hijack navigation
  doc.querySelectorAll("a").forEach(a => {
    a.onclick = e => {
      e.preventDefault();
      load(a.href);
    };
  });
}

async function load(url) {
  status.textContent = "Loading…";
  currentURL = url;

  try {
    const html = await fetchHTML(url);
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");

    rewrite(doc, url);

    view.innerHTML = "";
    [...doc.body.children].forEach(n => view.appendChild(n));

    // Execute scripts
    doc.querySelectorAll("script").forEach(old => {
      const s = document.createElement("script");
      if (old.src) {
        s.src = old.src;
      } else {
        s.textContent = old.textContent;
      }
      view.appendChild(s);
    });

    status.textContent = "Loaded";
  } catch (e) {
    status.textContent = "Failed to load page";
  }
}

function go() {
  let u = document.getElementById("url").value.trim();
  if (!u.startsWith("http")) u = "https://" + u;
  load(u);
}
