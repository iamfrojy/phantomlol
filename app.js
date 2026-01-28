const view = document.getElementById("view");
const status = document.getElementById("status");

const PROXIES = [
  u => `https://api.allorigins.win/raw?url=${encodeURIComponent(u)}`,
  u => `https://corsproxy.io/?${encodeURIComponent(u)}`
];

function proxify(url) {
  return PROXIES[0](url);
}

function deproxify(url) {
  try {
    return decodeURIComponent(url.split("url=")[1]);
  } catch {
    return url;
  }
}

async function fetchHTML(url) {
  for (const p of PROXIES) {
    try {
      const r = await fetch(p(url));
      if (r.ok) return await r.text();
    } catch {}
  }
  throw new Error("All proxies failed");
}

function absolutify(u, base) {
  try {
    return new URL(u, base).href;
  } catch {
    return u;
  }
}

function fixCSS(css, base) {
  return css.replace(/url\((.*?)\)/g, (_, u) => {
    u = u.replace(/['"]/g, "");
    if (u.startsWith("data:")) return `url(${u})`;
    const abs = absolutify(u, base);
    return `url(${proxify(abs)})`;
  });
}

async function rewriteAndRender(html, base) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");

  // Remove CSP
  doc.querySelectorAll("meta[http-equiv]").forEach(m => m.remove());

  view.innerHTML = "";

  // Load stylesheets manually
  const links = [...doc.querySelectorAll("link[rel='stylesheet']")];
  for (const link of links) {
    try {
      const cssText = await fetch(link.href).then(r => r.text());
      const style = document.createElement("style");
      style.textContent = fixCSS(cssText, link.href);
      view.appendChild(style);
    } catch {}
    link.remove();
  }

  // Rewrite src/href
  doc.querySelectorAll("[src]").forEach(el => {
    const abs = absolutify(el.getAttribute("src"), base);
    el.setAttribute("src", proxify(abs));
  });

  doc.querySelectorAll("[href]").forEach(el => {
    const abs = absolutify(el.getAttribute("href"), base);
    el.setAttribute("href", proxify(abs));
  });

  // Render body
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

  // Intercept navigation
  view.querySelectorAll("a").forEach(a => {
    a.onclick = e => {
      e.preventDefault();
      const real = deproxify(a.href);
      load(real);
    };
  });
}

async function load(url) {
  status.textContent = "Loading…";
  try {
    const html = await fetchHTML(url);
    await rewriteAndRender(html, url);
    status.textContent = "Loaded";
  } catch (e) {
    status.textContent = "Failed to load";
  }
}

function go() {
  let u = document.getElementById("url").value.trim();
  if (!u.startsWith("http")) u = "https://" + u;
  load(u);
}
