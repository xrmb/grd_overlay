// ==UserScript==
// @name         GRD Screen-Switch Overlay
// @namespace    https://remotedesktop.google.com/
// @version      1.3
// @description  Floating screen-switcher overlay for Google Remote Desktop
// @author       xrmb
// @match        https://remotedesktop.google.com/*
// @run-at       document-idle
// @updateURL    https://raw.githubusercontent.com/xrmb/grd_overlay/main/grd_overlay.user.js
// @downloadURL  https://raw.githubusercontent.com/xrmb/grd_overlay/main/grd_overlay.user.js
// @grant        GM_xmlhttpRequest
// @grant        GM_info
// @connect      raw.githubusercontent.com
// ==/UserScript==

(function () {
  'use strict';

  const GITHUB_RAW = 'https://raw.githubusercontent.com/xrmb/grd_overlay/main/grd_overlay.user.js';

  function isNewer(a, b) {
    const pa = a.split('.').map(Number), pb = b.split('.').map(Number);
    for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
      const d = (pa[i] || 0) - (pb[i] || 0);
      if (d !== 0) return d > 0;
    }
    return false;
  }

  // ── Dev flag — set true to show a button that downloads the live JS bundles ─
  // Useful for checking if GRD has changed action names or DOM selectors.
  // Leave false for normal use.
  const DEV_PULL = false;

  // Wait for the session view to be ready before injecting
  function tryInject() {
    if (!document.querySelector('body')) return;
    inject();
  }

  function inject() {
    const ID = '__grd_overlay';
    if (document.getElementById(ID)) return;

    // ── Action bus (optional — used only for All) ─────────────────────────
    let bus = null;
    try {
      const b = window._ && typeof window._.CV === 'function' ? window._.CV() : null;
      if (b && b.U instanceof Map) bus = b;
    } catch (e) {}

    function busAction(name) {
      if (!bus) return false;
      const fn = bus.U.get(name);
      if (fn) { fn(); return true; }
      return false;
    }

    // ── Read real tab buttons from GRD's tab strip ────────────────────────
    function getTabStrip() {
      return document.querySelector('[jsname="uxAMZ"]');
    }

    function getRealTabs() {
      const strip = getTabStrip();
      if (!strip) return [];
      return [...strip.querySelectorAll('[role="tab"]')]
        .filter(t => !/displaysplace/i.test((t.getAttribute('aria-label') || t.textContent || '')));
    }

    function getAllDisplaysTab() {
      const strip = getTabStrip();
      if (!strip) return null;
      return [...strip.querySelectorAll('[role="tab"]')]
        .find(t => /displaysplace/i.test((t.getAttribute('aria-label') || t.textContent || ''))) || null;
    }

    // ── Build overlay ─────────────────────────────────────────────────────
    const wrap = document.createElement('div');
    wrap.id = ID;
    Object.assign(wrap.style, {
      position: 'fixed', top: '12px', right: '56px',
      display: 'flex', alignItems: 'center', gap: '3px',
      padding: '4px 8px', background: 'rgba(20,20,20,0.85)',
      backdropFilter: 'blur(6px)', borderRadius: '20px',
      boxShadow: '0 2px 14px rgba(0,0,0,0.5)', zIndex: '2147483647',
      fontFamily: 'system-ui, sans-serif', fontSize: '12px', color: '#fff',
      userSelect: 'none', cursor: 'grab',
    });

    function mkBtn(text, tip, onClick) {
      const b = document.createElement('button');
      b.textContent = text;
      b.title = tip || text;
      Object.assign(b.style, {
        background: 'rgba(255,255,255,0.12)', color: '#fff',
        border: '1px solid rgba(255,255,255,0.18)', borderRadius: '12px',
        padding: '2px 9px', cursor: 'pointer', fontSize: '11px',
        fontFamily: 'inherit', lineHeight: '1.6', whiteSpace: 'nowrap',
      });
      b.onmouseover = () => b.style.background = 'rgba(255,255,255,0.28)';
      b.onmouseout  = () => { b.style.background = b._active ? 'rgba(80,160,255,0.45)' : 'rgba(255,255,255,0.12)'; };
      b.onmousedown = e => e.stopPropagation();
      b.onclick     = e => { e.stopPropagation(); onClick(b); };
      return b;
    }

    function flash(b) {
      const prev = b.style.background;
      b.style.background = 'rgba(100,200,120,0.6)';
      setTimeout(() => b.style.background = prev, 250);
    }

    function setActive(btn, active) {
      btn._active = active;
      btn.style.background  = active ? 'rgba(80,160,255,0.45)' : 'rgba(255,255,255,0.12)';
      btn.style.borderColor = active ? 'rgba(100,180,255,0.7)'  : 'rgba(255,255,255,0.18)';
      btn.style.fontWeight  = active ? 'bold' : 'normal';
    }

    const lbl = document.createElement('span');
    lbl.textContent = '🖥';
    Object.assign(lbl.style, { fontSize:'13px', marginRight:'2px', pointerEvents:'none', opacity:'0.7' });
    wrap.appendChild(lbl);

    const tabArea = document.createElement('span');
    Object.assign(tabArea.style, { display:'flex', gap:'3px', alignItems:'center' });

    let tabBtns = [];

    function buildTabs() {
      while (tabArea.firstChild) tabArea.removeChild(tabArea.firstChild);
      tabBtns = [];

      const realTabs = getRealTabs();

      if (realTabs.length === 0) {
        const hint = document.createElement('span');
        Object.assign(hint.style, { opacity:'0.5', fontSize:'11px', padding:'0 4px' });
        hint.textContent = 'waiting…';
        tabArea.appendChild(hint);
        return;
      }

      realTabs.forEach((real, i) => {
        const rawLabel = (real.getAttribute('aria-label') || real.textContent || '').trim();
        const label = (rawLabel || `Display ${i + 1}`).replace(/^tv/i, '');
        const isActive = real.getAttribute('aria-selected') === 'true' ||
                         real.getAttribute('tabindex') === '0';

        const btn = mkBtn(label, `Switch to ${label}`, b => {
          real.click(); flash(b);
          tabBtns.forEach(tb => setActive(tb, false));
          setActive(b, true);
        });
        setActive(btn, isActive);
        tabArea.appendChild(btn);
        tabBtns.push(btn);
      });
    }

    // Fullscreen toggle
    function isFullscreen() { return !!document.fullscreenElement; }
    const fsBtn = mkBtn('⛶', 'Toggle fullscreen', b => {
      if (!busAction('toggle-full-screen')) {
        isFullscreen() ? document.exitFullscreen() : document.documentElement.requestFullscreen();
      }
      flash(b);
    });
    wrap.appendChild(fsBtn);

    // All button
    const allBtn = mkBtn('All', 'All displays', b => {
      if (!busAction('all-displays')) {
        const allTab = getAllDisplaysTab();
        if (allTab) allTab.click();
      }
      flash(b);
    });
    wrap.appendChild(allBtn);
    wrap.appendChild(tabArea);

    // ── Dev: download live JS bundles for maintenance analysis ────────────
    if (DEV_PULL) {
      const dlBtn = mkBtn('⬇ JS', 'Download live GRD JS bundles', b => {
        const urls = [...document.querySelectorAll('script[src]')]
          .map(s => s.src)
          .filter(u => /\.js(\?|$)/.test(u));
        if (!urls.length) {
          console.warn('[GRD dev] No <script src> found on this page');
          return;
        }
        console.log(`[GRD dev] Fetching ${urls.length} bundle(s)...`);
        flash(b);
        urls.forEach((url, i) => {
          fetch(url)
            .then(r => r.text())
            .then(text => {
              const name = url.split('?')[0].split('/').pop() || `bundle_${i}.js`;
              const a = document.createElement('a');
              a.href = URL.createObjectURL(new Blob([text], { type: 'text/javascript' }));
              a.download = String(i + 1).padStart(2, '0') + '_' + name;
              document.body.appendChild(a);
              a.click();
              setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
              console.log(`[GRD dev] Downloaded: ${a.download} (${(text.length / 1024).toFixed(0)} KB)`);
            })
            .catch(e => console.warn('[GRD dev] fetch failed:', url, e));
        });
      });
      wrap.appendChild(dlBtn);
    }

    // Update indicator (hidden until checkForUpdate finds a newer version)
    const updBtn = mkBtn('', 'Check…', () => window.open(GITHUB_RAW, '_blank'));
    Object.assign(updBtn.style, {
      display: 'none',
      background: 'rgba(255,180,0,0.25)',
      borderColor: 'rgba(255,180,0,0.6)',
    });
    wrap.appendChild(updBtn);

    function checkForUpdate() {
      const current = (typeof GM_info !== 'undefined' && GM_info.script.version) || '1.3';
      GM_xmlhttpRequest({
        method: 'GET',
        url: GITHUB_RAW,
        onload(res) {
          const m = res.responseText.match(/@version\s+(\S+)/);
          if (!m) return;
          const latest = m[1];
          if (isNewer(latest, current)) {
            updBtn.textContent = `↑ v${latest}`;
            updBtn.title = `Update available (v${latest}) — click to install`;
            updBtn.style.display = '';
          }
        },
        onerror() {},
      });
    }

    // Close button
    const closeBtn = document.createElement('button');
    closeBtn.textContent = '✕';
    closeBtn.title = 'Close (refreshing page will reopen)';
    Object.assign(closeBtn.style, {
      background: 'transparent', color: 'rgba(255,255,255,0.45)',
      border: 'none', cursor: 'pointer', fontSize: '12px', padding: '0 2px', lineHeight: '1',
    });
    closeBtn.onmouseover = () => closeBtn.style.color = '#fff';
    closeBtn.onmouseout  = () => closeBtn.style.color = 'rgba(255,255,255,0.45)';
    closeBtn.onmousedown = e => e.stopPropagation();
    closeBtn.onclick = () => { clearInterval(syncInterval); wrap.remove(); };
    wrap.appendChild(closeBtn);

    // Sync loop
    let lastTabCount = -1, lastActiveIdx = -1;
    function syncTabs() {
      const real = getRealTabs();
      const count = real.length;
      const activeIdx = real.findIndex(t =>
        t.getAttribute('aria-selected') === 'true' || t.getAttribute('tabindex') === '0');
      if (count !== lastTabCount) {
        lastTabCount = count; lastActiveIdx = activeIdx; buildTabs();
      } else if (activeIdx !== lastActiveIdx) {
        lastActiveIdx = activeIdx;
        tabBtns.forEach((b, i) => setActive(b, i === activeIdx));
      }
    }
    const syncInterval = setInterval(syncTabs, 800);

    // Drag
    let dragging = false, ox = 0, oy = 0;
    wrap.onmousedown = e => {
      if (e.target !== wrap && e.target !== lbl) return;
      dragging = true;
      const r = wrap.getBoundingClientRect();
      ox = e.clientX - r.left; oy = e.clientY - r.top;
      wrap.style.cursor = 'grabbing';
      wrap.style.right = 'auto'; wrap.style.left = r.left + 'px';
      e.preventDefault();
    };
    document.addEventListener('mousemove', e => {
      if (!dragging) return;
      wrap.style.left = (e.clientX - ox) + 'px';
      wrap.style.top  = (e.clientY - oy) + 'px';
    });
    document.addEventListener('mouseup', () => { dragging = false; wrap.style.cursor = 'grab'; });

    document.body.appendChild(wrap);
    buildTabs();
    checkForUpdate();
  }

  let attempts = 0;
  const boot = setInterval(() => {
    if (document.readyState === 'complete' || ++attempts > 60) {
      clearInterval(boot);
      tryInject();
    }
  }, 500);

})();
