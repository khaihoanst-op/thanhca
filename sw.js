/* Thánh Ca Cộng Đồng – lưu sẵn trên máy để chạy khi mất mạng, có mạng thì tự lấy bản mới */
const CACHE = 'thanhca-v1';
const CORE = ['./', 'index.html', 'boot.js', 'goi.js', 'manifest.json', 'assets/logo.png', 'assets/bia.jpg', 'assets/nen.jpg',
  'assets/nen-thanhtam.jpg', 'assets/th-bia.jpg', 'assets/th-nen.jpg', 'assets/th-thanhtam.jpg', 'assets/UTM%20Alexander.ttf',
  'assets/icon-192.png', 'assets/icon-512.png'];
self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(c => Promise.all(CORE.map(u => c.add(new Request(u, { cache: 'no-cache' })).catch(() => {})))));
});
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));
function timeout(ms) { return new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), ms)); }
self.addEventListener('fetch', e => {
  const r = e.request;
  if (r.method !== 'GET' || new URL(r.url).origin !== location.origin) return;
  e.respondWith((async () => {
    const c = await caches.open(CACHE);
    const refresh = fetch(r, { cache: 'no-cache' }).then(n => { if (n && n.ok) c.put(r, n.clone()); return n; });
    if (r.mode === 'navigate') {                       // trang chính: ưu tiên bản mới, mất mạng thì dùng bản đã lưu
      try { return await Promise.race([refresh, timeout(5000)]); }
      catch (x) { return (await c.match(r, { ignoreSearch: true })) || (await c.match('index.html')) || (await c.match('./')) || Response.error(); }
    }
    const hit = await c.match(r, { ignoreSearch: true });  // các file khác: dùng ngay bản đã lưu, cập nhật ngầm cho lần mở sau
    if (hit) { e.waitUntil(refresh.catch(() => {})); return hit; }
    return refresh;
  })());
});
