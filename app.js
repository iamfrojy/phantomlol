const iframe = document.getElementById("view");

const PROXY = url =>
  `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;

function go() {
  let u = document.getElementById("url").value.trim();
  if (!u.startsWith("http")) u = "https://" + u;
  load(u);
}

function load(url) {
  iframe.src = PROXY(url);
}
