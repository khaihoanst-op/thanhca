/* Thánh Ca Cộng Đồng – lưu sẵn trên máy để chạy khi mất mạng; có mạng thì luôn lấy bản mới nhất */
const CACHE = 'thanhca-v2';
const CORE = ['./', 'index.html', 'boot.js', 'goi.js', 'manifest.json', 'assets/logo.png', 'assets/bia.jpg', 'assets/nen.jpg',
  'assets/nen-thanhtam.jpg', 'assets/th-bia.jpg', 'assets/th-nen.jpg', 'assets/th-thanhtam.jpg', 'assets/UTM%20Alexander.ttf',
  'assets/icon-192.png', 'assets/icon-512.png'];
self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(c => Promise.all(CORE.map(u => c.add(new Request(u, { cache: 'no-cache' })).catch(() => {})))));
});
self.addEventListener('activate', e => e.waitUntil((async () => {
  for (const k of await caches.keys()) if (k !== CACHE) await caches.delete(k);   // bỏ bộ nhớ cũ
  await self.clients.claim();
})()));
function timeout(ms) { return new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), ms)); }
self.addEventListener('fetch', e => {
  const r = e.request;
  if (r.method !== 'GET' || new URL(r.url).origin !== location.origin) return;
  const path = new URL(r.url).pathname;
  const fresh = r.mode === 'navigate' || /\/(index\.html|boot\.js|goi\.js|manifest\.json)?$/.test(path) || /\.(js|html|json)$/.test(path);
  e.respondWith((async () => {
    const c = await caches.open(CACHE);
    const net = fetch(r, { cache: 'no-cache' }).then(n => { if (n && n.ok) c.put(r, n.clone()); return n; });
    if (fresh) {                                       // trang, mã và gói dữ liệu: lấy bản mới trên mạng, mất mạng thì dùng bản đã lưu
      try { return await Promise.race([net, timeout(10000)]); }
      catch (x) {
        const hit = await c.match(r, { ignoreSearch: true }) || (r.mode === 'navigate' ? (await c.match('index.html')) || (await c.match('./')) : null);
        return hit || Response.error();
      }
    }
    const hit = await c.match(r, { ignoreSearch: true });  // hình ảnh, phông chữ: dùng bản đã lưu, cập nhật ngầm
    if (hit) { e.waitUntil(net.catch(() => {})); return hit; }
    return net;
  })());
});
