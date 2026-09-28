(() => {
  const status = document.getElementById('status');
  const path = document.body.dataset.destination;
  let failures = 0;

  if (path !== '/' && path !== '/ivan-li/') {
    status.textContent = 'Invalid destination.';
    return;
  }

  async function connect() {
    try {
      const source = await fetch('/stocks/tunnel.txt?t=' + Date.now(), { cache: 'no-store' });
      if (!source.ok) throw new Error('Tunnel address unavailable');
      const base = (await source.text()).trim();
      if (!/^https:\/\/[a-z0-9-]+\.trycloudflare\.com$/.test(base)) {
        throw new Error('Invalid tunnel address');
      }

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 5000);
      try {
        const probe = await fetch(base + '/healthz', {
          cache: 'no-store',
          mode: 'cors',
          signal: controller.signal,
        });
        if (!probe.ok || (await probe.text()).trim() !== 'stock-share-ok') {
          throw new Error('Gateway unavailable');
        }
      } finally {
        clearTimeout(timer);
      }

      window.location.replace(base + path);
    } catch (_error) {
      failures += 1;
      status.textContent = 'Reconnecting to Stocks… Retrying automatically.';
      setTimeout(connect, Math.min(15000, 2000 * 2 ** Math.min(failures, 3)));
    }
  }

  connect();
})();
