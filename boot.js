/* THÁNH CA CỘNG ĐỒNG – khởi động bản phát hành: kiểm tra mã kích hoạt rồi mở gói dữ liệu */
(function () {
  'use strict';
  var PUB = {"kty":"EC","x":"j4XSCmMUPWggepZsJN30TBjxI1AKUDuGUOZ-Lp6cJuw","y":"rPP4Xm-favVBKszBz4yinY7pnu_2XnrVCF6HCabViZo","crv":"P-256"};
  var LIC = 'tc_lic_v1', MID = 'tc_mid_v1', SEEN = 'tc_seen_v1';
  var P = window.TC_PKG;
  // bản 1 file: hình ảnh nằm sẵn trong file, gắn vào các chỗ đang trỏ tới thư mục assets
  var AS = window.TC_ASSETS || {};
  function asset(p) { return AS[p.replace(/^assets\//, '')] || p; }
  if (window.TC_ASSETS) {
    Array.prototype.forEach.call(document.querySelectorAll('[src^="assets/"]'), function (e) { e.src = asset(e.getAttribute('src')); });
    Array.prototype.forEach.call(document.querySelectorAll('link[href^="assets/"]'), function (e) { e.href = asset(e.getAttribute('href')); });
    Array.prototype.forEach.call(document.querySelectorAll('[data-asrc]'), function (e) { e.src = asset(e.getAttribute('data-asrc')); });
    Array.prototype.forEach.call(document.querySelectorAll('[data-ahref]'), function (e) { e.href = asset(e.getAttribute('data-ahref')); });
  }
  function ls(k, v) { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) { return null; } }
  function b64(s, url) { if (url) { s = s.replace(/-/g, '+').replace(/_/g, '/'); while (s.length % 4) s += '='; } var b = atob(s), u = new Uint8Array(b.length); for (var i = 0; i < b.length; i++) u[i] = b.charCodeAt(i); return u; }
  function p2(n) { return (n < 10 ? '0' : '') + n; }
  function ymd(d) { return d.getFullYear() + '-' + p2(d.getMonth() + 1) + '-' + p2(d.getDate()); }
  function dmy(s) { var a = String(s).split('-'); return a[2] + '/' + a[1] + '/' + a[0]; }
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function machine() {
    var m = ls(MID);
    if (!m) { var A = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789', r = crypto.getRandomValues(new Uint8Array(8)); m = ''; for (var i = 0; i < 8; i++) m += A[r[i] % 32]; ls(MID, m); }
    return m;
  }
  function fmtM(m) { return m.slice(0, 4) + '-' + m.slice(4); }

  async function verify(key) {
    key = String(key || '').replace(/\s+/g, '');
    var p = key.split('.');
    if (p.length !== 3 || p[0] !== 'TC1') throw 'Mã kích hoạt không đúng dạng.';
    var pk = await crypto.subtle.importKey('jwk', PUB, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['verify']);
    var ok = false;
    try { ok = await crypto.subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, pk, b64(p[2], 1), new TextEncoder().encode(p[1])); } catch (e) {}
    if (!ok) throw 'Mã kích hoạt không hợp lệ.';
    var L = JSON.parse(new TextDecoder().decode(b64(p[1], 1)));
    if (L.m && L.m !== '*' && L.m.replace(/-/g, '').toUpperCase() !== machine()) throw 'Mã này được cấp cho máy khác (mã máy ' + L.m + ').';
    if (L.v !== P.v) throw 'Mã này dành cho phiên bản ' + L.v + ', cuốn này là phiên bản ' + P.v + '. Cần mã mới.';
    var today = ymd(new Date()), seen = ls(SEEN) || '';
    if (seen) { var s = new Date(seen); s.setDate(s.getDate() - 2); if (today < ymd(s)) throw 'Ngày giờ trên máy tính không đúng. Hãy chỉnh lại ngày giờ rồi mở lại.'; }
    if (today > seen) ls(SEEN, today);
    if (L.e && today > L.e) throw 'Bản này đã hết hạn sử dụng từ ngày ' + dmy(L.e) + '.';
    return L;
  }

  async function unlock(L) {
    var k = await crypto.subtle.importKey('raw', b64(L.k, 1), 'AES-GCM', false, ['decrypt']);
    var pt;
    try { pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: b64(P.iv) }, k, b64(P.ct)); }
    catch (e) { throw 'Mã này không mở được gói dữ liệu của cuốn này. Cần mã mới.'; }
    var files = JSON.parse(new TextDecoder().decode(pt));
    window.TC_DIST = { n: L.n, e: L.e, i: L.i, owner: P.owner };
    var geval = eval;
    files.forEach(function (f) { geval(f.c); });
    mark(L);
  }

  function css(t) { var s = document.createElement('style'); s.textContent = t; document.head.appendChild(s); }
  css('#tcWm{position:fixed;left:50%;bottom:.25vh;transform:translateX(-50%);font:1.25vh Arial,sans-serif;color:rgba(255,255,255,.6);text-shadow:0 0 .25vh #000,0 0 .25vh #000;pointer-events:none;z-index:60;white-space:nowrap}' +
    '#tcLock{position:fixed;inset:0;z-index:9999;background:radial-gradient(ellipse at 50% 30%,#3a2a1a,#120c07);display:flex;align-items:center;justify-content:center;font-family:Arial,"Segoe UI",sans-serif}' +
    '#tcLock .bx{background:#fffdf8;border-radius:1.6vh;padding:4vh 3vw;width:min(92vw,62vh);box-shadow:0 2vh 6vh rgba(0,0,0,.5);text-align:center;color:#222}' +
    '#tcLock img{height:10vh}#tcLock h2{margin:1vh 0 1.5vh;font-size:3.2vh;color:#8a1c1c}#tcLock p{font-size:2vh;line-height:1.45;margin:.8vh 0}' +
    '#tcLock .mid{font:bold 4.2vh Consolas,monospace;letter-spacing:.5vh;color:#1f3f8f;margin:.6vh 0}' +
    '#tcLock textarea{width:100%;box-sizing:border-box;height:11vh;font:1.8vh Consolas,monospace;border:.2vh solid #c9bfae;border-radius:.8vh;padding:1vh;margin-top:1vh;resize:none}' +
    '#tcLock button{font:bold 2.2vh Arial,sans-serif;border:0;border-radius:1vh;padding:1.1vh 2vw;margin:1vh .4vw 0;cursor:pointer;background:#e9e2d4;color:#333}#tcLock button.go{background:#2f6b3a;color:#fff}' +
    '#tcLock .err{color:#b3261e;font-weight:bold;min-height:2.6vh}#tcLock .ct{color:#6b6357;font-size:1.8vh}' +
    '#tcWarn{position:fixed;left:50%;top:2vh;transform:translateX(-50%);background:#fff4d6;color:#6b3a00;border:.2vh solid #e0a800;border-radius:1vh;padding:1vh 2vw;font:2vh Arial,sans-serif;z-index:9000;box-shadow:0 .5vh 1.5vh rgba(0,0,0,.3)}');

  function mark(L) {
    var w = document.createElement('div'); w.id = 'tcWm';
    w.textContent = '© ' + (P.owner || 'THÁNH CA CỘNG ĐỒNG') + ' - ' + String(L.n).toUpperCase();
    w.setAttribute('data-lic', L.i); document.body.appendChild(w);
    document.title = 'Thánh Ca Cộng Đồng – ' + L.n;
    if (L.e) {
      var left = Math.round((new Date(L.e) - new Date(ymd(new Date()))) / 86400000);
      if (left <= 30) {
        var b = document.createElement('div'); b.id = 'tcWarn';
        b.textContent = 'Bản này sẽ hết hạn ngày ' + dmy(L.e) + ' (còn ' + left + ' ngày). ' + (P.contact || '');
        document.body.appendChild(b); setTimeout(function () { b.remove(); }, 12000);
      }
    }
  }

  function lockScreen(msg) {
    var m = machine(), d = document.createElement('div'); d.id = 'tcLock';
    d.innerHTML = '<div class="bx"><img src="' + asset('assets/logo.png') + '" alt=""><h2>KÍCH HOẠT CUỐN THÁNH CA</h2>' +
      '<p>Gửi <b>mã máy</b> dưới đây cho người cấp phần mềm để nhận mã kích hoạt:</p>' +
      '<div class="mid">' + fmtM(m) + '</div><button id="tcCopy">Chép mã máy</button>' +
      '<textarea id="tcKey" placeholder="Dán mã kích hoạt vào đây"></textarea>' +
      '<p class="err" id="tcErr">' + esc(msg || '') + '</p>' +
      '<button class="go" id="tcGo">Kích hoạt</button>' +
      '<p class="ct">' + esc(P.contact || '') + '</p></div>';
    document.body.appendChild(d);
    document.getElementById('tcCopy').onclick = function () {
      try { navigator.clipboard.writeText(fmtM(m)); this.textContent = 'Đã chép ✓'; } catch (e) {}
    };
    document.getElementById('tcGo').onclick = async function () {
      var key = document.getElementById('tcKey').value, er = document.getElementById('tcErr');
      er.textContent = 'Đang kiểm tra…';
      try { var L = await verify(key); await unlock(L); ls(LIC, key.replace(/\s+/g, '')); d.remove(); }
      catch (e) { er.textContent = typeof e === 'string' ? e : 'Có lỗi khi mở cuốn thánh ca.'; if (window.console) console.error(e); }
    };
  }

  async function start() {
    if (!P) { lockScreen('Thiếu file goi.js – hãy chép lại đầy đủ thư mục.'); return; }
    if (!window.crypto || !crypto.subtle) { lockScreen('Trình duyệt này không hỗ trợ. Hãy mở bằng Microsoft Edge hoặc Google Chrome.'); return; }
    var key = ls(LIC);
    if (!key) { lockScreen(''); return; }
    try { var L = await verify(key); await unlock(L); }
    catch (e) { lockScreen(typeof e === 'string' ? e : 'Có lỗi khi mở cuốn thánh ca.'); if (window.console) console.error(e); }
  }
  start();
})();
