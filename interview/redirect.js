"use strict";

const status = document.getElementById("status");
let retry = 2000;

async function get(url, mode) {
  const timeout = new AbortController();
  const timer = setTimeout(() => timeout.abort(), 5000);
  try {
    const response = await fetch(url, { cache: "no-store", mode, signal: timeout.signal });
    if (!response.ok) throw new Error("Unavailable");
    return (await response.text()).trim();
  } finally {
    clearTimeout(timer);
  }
}

async function connect() {
  try {
    const base = await get(
      `https://raw.githubusercontent.com/adoralai/stocks/interview-tunnel/tunnel.txt?t=${Date.now()}`, "cors",
    );
    if (!/^https:\/\/[a-z0-9-]+\.trycloudflare\.com$/.test(base)) throw new Error("Invalid address");
    if (await get(`${base}/healthz`, "cors") !== "interview-practice-ok") throw new Error("Unavailable");
    location.replace(`${base}/`);
  } catch {
    status.textContent = "Reconnecting to interview practice…";
    setTimeout(connect, retry);
    retry = Math.min(15000, retry * 2);
  }
}

connect();
