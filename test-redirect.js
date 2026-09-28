const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const script = fs.readFileSync(__dirname + '/redirect.js', 'utf8');

async function run(path, addresses, healthy) {
  const timers = new Map();
  let nextTimer = 0;
  const redirects = [];
  const status = { textContent: '' };
  let addressIndex = 0;
  const context = {
    document: { body: { dataset: { destination: path } }, getElementById: () => status },
    window: { location: { replace: (url) => redirects.push(url) } },
    Date,
    AbortController,
    setTimeout: (fn) => { const id = ++nextTimer; timers.set(id, fn); return id; },
    clearTimeout: (id) => timers.delete(id),
    fetch: async (url) => {
      if (url.startsWith('/stocks/tunnel.txt')) {
        const address = addresses[Math.min(addressIndex++, addresses.length - 1)];
        return { ok: true, text: async () => address };
      }
      if (url.endsWith('/healthz') && healthy(url)) {
        return { ok: true, text: async () => 'stock-share-ok\n' };
      }
      throw new Error('tunnel unreachable');
    },
  };
  vm.runInNewContext(script, context);
  await new Promise((resolve) => setImmediate(resolve));
  return { timers, redirects, status };
}

(async () => {
  const old = 'https://old.trycloudflare.com';
  const fresh = 'https://fresh.trycloudflare.com';

  const root = await run('/', [old, fresh], (url) => url.startsWith(fresh));
  assert.equal(root.redirects.length, 0, 'do not navigate to the dead tunnel');
  assert.match(root.status.textContent, /Retrying automatically/);
  assert.equal(root.timers.size, 1);
  [...root.timers.values()][0]();
  await new Promise((resolve) => setImmediate(resolve));
  assert.deepEqual(root.redirects, [fresh + '/']);

  const ivan = await run('/ivan-li/', [fresh], () => true);
  assert.deepEqual(ivan.redirects, [fresh + '/ivan-li/']);

  const invalid = await run('/', ['https://attacker.example.com'], () => true);
  assert.equal(invalid.redirects.length, 0);
  assert.equal(invalid.timers.size, 1);

  console.log('redirect tests passed');
})().catch((error) => { console.error(error); process.exitCode = 1; });
