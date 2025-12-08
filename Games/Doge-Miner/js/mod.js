// js/mod.js
// DogeMod — Enhanced mod UI for DogeMiner (client-side only, non-destructive)
// Drop into your site and include after js/main.js
(function () {
  'use strict';

  // --- Configuration / constants ---
  const PROFILE_KEY = 'dogemod_profiles_v1';
  const MOD_STORAGE_KEY = 'dogemod_state_v1';

  // --- Utility helpers ---
  function $el(tag, attrs = {}, children = []) {
    const e = document.createElement(tag);
    Object.entries(attrs).forEach(([k, v]) => {
      if (k === 'style' && typeof v === 'object') Object.assign(e.style, v);
      else if (k.startsWith('on') && typeof v === 'function') e.addEventListener(k.slice(2), v);
      else e.setAttribute(k, v);
    });
    (Array.isArray(children) ? children : [children]).forEach(c => { if (c) e.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); });
    return e;
  }
  function q(sel) { return document.querySelector(sel); }
  function qAll(sel) { return Array.from(document.querySelectorAll(sel)); }
  function clamp(n, a, b) { return Math.max(a, Math.min(b, n)); }
  function tryParseJSON(s) { try { return JSON.parse(s); } catch (e) { return null; } }

  // --- Heuristics to find & set game money / functions ---
  const heuristics = {
    moneyNames: ['coins','money','dogecoins','dogeCoins','balance','playerCoins','coins_total','coinsTotal','doge'],
    spawnNames: ['spawnCoin','spawnDoge','createBonusCoin','spawnBonus','spawnBonusCoin','createCoin'],
    addNames: ['addCoins','addMoney','giveCoins','giveMoney','gainCoins'],
    saveNames: ['saveGame','save','persistSave','saveState'],
    perSecNames: ['perSec','incomePerSec','coinsPerSecond','coinsPerSec','cps','incomeRate']
  };

  function findGlobalVar(nameList) {
    for (const name of nameList) {
      if (Object.prototype.hasOwnProperty.call(window, name)) return name;
    }
    return null;
  }

  function setGlobalNumber(name, value) {
    try {
      if (Object.prototype.hasOwnProperty.call(window, name) && typeof window[name] === 'number') {
        window[name] = value;
        return true;
      }
    } catch (e) {}
    return false;
  }

  function callIfExists(nameList, ...args) {
    for (const name of nameList) {
      const fn = window[name];
      if (typeof fn === 'function') {
        try { fn(...args); return { called: true, name }; } catch (e) { console.warn('mod: call failed', name, e); }
      }
    }
    return { called: false };
  }

  function deepUpdateLocalStorageCoins(amount) {
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        const raw = localStorage.getItem(key);
        if (!raw) continue;
        const obj = tryParseJSON(raw);
        if (!obj) continue;
        let changed = false;
        (function recurse(o) {
          if (o && typeof o === 'object') {
            Object.keys(o).forEach(k => {
              if (/coin|coins|doge|money|balance/i.test(k) && typeof o[k] === 'number') {
                o[k] = amount; changed = true;
              } else if (typeof o[k] === 'object') recurse(o[k]);
            });
          }
        })(obj);
        if (changed) localStorage.setItem(key, JSON.stringify(obj));
      }
    } catch (e) { console.warn('mod: deep localStorage update failed', e); }
  }

  // --- HUD updater (tries to find #mined strong) ---
  function updateHUD(amount) {
    try {
      const s = q('#mined strong');
      if (s) s.textContent = String(Math.floor(amount));
    } catch (e) {}
  }

  // --- Smart setMoney: updates UI, globals, localStorage, and calls save if possible ---
  function smartSetMoney(amount, options = {}) {
    amount = Math.floor(amount);
    updateHUD(amount);
    // try global variables
    heuristics.moneyNames.forEach(name => setGlobalNumber(name, amount));
    // try save objects on window
    ['save','savedata','game','gameState','state'].forEach(k => {
      try {
        if (window[k] && typeof window[k] === 'object') {
          ['coins','dogecoins','money','balance','coins_total'].forEach(p => {
            if (Object.prototype.hasOwnProperty.call(window[k], p) && typeof window[k][p] === 'number') {
              window[k][p] = amount;
            }
          });
        }
      } catch (e) {}
    });
    deepUpdateLocalStorageCoins(amount);
    // try to call save functions
    const r = callIfExists(heuristics.saveNames);
    if (r.called) console.log('mod: save called via', r.name);
    if (!options.silent) showMessage(`Money set to $${amount}`);
  }

  // --- Smart addMoney: uses add functions if available or modifies known globals ---
  function smartAddMoney(delta) {
    // try add functions
    const r = callIfExists(heuristics.addNames, delta);
    if (r.called) {
      showMessage(`Added $${delta} (via ${r.name})`);
      return;
    }
    // fallback: increment first known money var
    const g = findGlobalVar(heuristics.moneyNames);
    if (g) {
      try { window[g] = (Number(window[g]) || 0) + delta; updateHUD(window[g]); showMessage(`Added $${delta}`); return; } catch (e) {}
    }
    // fallback: read HUD + set
    const cur = Number((q('#mined strong') || { textContent: '0' }).textContent) || 0;
    smartSetMoney(cur + delta);
  }

  // --- Spawn fallback DOM coin (visual & clickable) ---
  function spawnDomCoin(value = 1) {
    const container = q('#minerwrapper') || document.body;
    const coin = $el('div', { style: {
      position: 'absolute',
      left: (50 + Math.random() * 600) + 'px',
      top: (80 + Math.random() * 200) + 'px',
      zIndex: 999999,
      padding: '10px 12px',
      borderRadius: '12px',
      background: 'linear-gradient(#ffd66b,#ffb84d)',
      color: '#3a2200',
      fontWeight: '700',
      fontSize: '14px',
      cursor: 'pointer',
      boxShadow: '0 8px 20px rgba(0,0,0,0.25)'
    } }, `Ð +${value}`);
    coin.addEventListener('click', () => {
      smartAddMoney(value);
      coin.remove();
    });
    container.appendChild(coin);
    setTimeout(() => coin.remove(), 15000);
    return coin;
  }

  // --- Try calling game's spawn function; fallback to DOM coins when missing ---
  function smartSpawn(value = 1) {
    const r = callIfExists(heuristics.spawnNames, value);
    if (r.called) {
      showMessage(`Spawned coin (via ${r.name})`);
      return;
    }
    // try other spawn attempts (some games use window.spawn(value) etc)
    if (typeof window.spawn === 'function') {
      try { window.spawn(value); showMessage('Spawned coin (via spawn)'); return; } catch (e) {}
    }
    spawnDomCoin(value);
    showMessage('Spawned DOM coin');
  }

  // --- Profiles (save named mod presets in localStorage) ---
  function loadProfiles() {
    try {
      const raw = localStorage.getItem(PROFILE_KEY);
      return raw ? tryParseJSON(raw) || {} : {};
    } catch (e) { return {}; }
  }
  function saveProfiles(obj) {
    try { localStorage.setItem(PROFILE_KEY, JSON.stringify(obj || {})); } catch (e) {}
  }

  // --- UI message flash ---
  let messageTimer = null;
  function showMessage(txt, ms = 2200) {
    const el = q('#dogemod_message');
    if (!el) return;
    el.textContent = txt;
    if (messageTimer) clearTimeout(messageTimer);
    messageTimer = setTimeout(() => { el.textContent = ''; }, ms);
  }

  // --- Module state for automations ---
  const state = {
    autoSpawn: false,
    autoSpawnInterval: 5000,
    autoSpawnValue: 10,
    autoCollect: false,
    autoCollectInterval: 1200,
    autoSpawnHandle: null,
    autoCollectHandle: null,
    autoAddPerSecMultiplier: 1.0
  };

  function saveState() {
    try { localStorage.setItem(MOD_STORAGE_KEY, JSON.stringify(state)); } catch (e) {}
  }
  function loadState() {
    try {
      const raw = localStorage.getItem(MOD_STORAGE_KEY);
      if (raw) Object.assign(state, tryParseJSON(raw) || {});
    } catch (e) {}
  }
  loadState();

  // --- Automations ---
  function startAutoSpawn() {
    if (state.autoSpawnHandle) clearInterval(state.autoSpawnHandle);
    state.autoSpawnHandle = setInterval(() => {
      smartSpawn(state.autoSpawnValue);
    }, Math.max(200, state.autoSpawnInterval));
    saveState();
  }
  function stopAutoSpawn() {
    if (state.autoSpawnHandle) clearInterval(state.autoSpawnHandle);
    state.autoSpawnHandle = null;
    saveState();
  }

  function startAutoCollect() {
    if (state.autoCollectHandle) clearInterval(state.autoCollectHandle);
    state.autoCollectHandle = setInterval(() => {
      // attempt to click any DOM coins (our fallback coins)
      const coins = qAll('.mod-coin') .concat(qAll('.bonus-coin') || []);
      if (coins.length) {
        coins.forEach(c => { try { c.click(); } catch (e) {} });
      } else {
        // fallback: add small random money (safe fallback)
        smartAddMoney(1);
      }
    }, Math.max(200, state.autoCollectInterval));
    saveState();
  }
  function stopAutoCollect() {
    if (state.autoCollectHandle) clearInterval(state.autoCollectHandle);
    state.autoCollectHandle = null;
    saveState();
  }

  // --- UI creation ---
  function createUI() {
    // guard
    if (q('#dogemod_ui')) return;

    // styles
    const style = document.createElement('style');
    style.textContent = `
      #dogemod_ui { font-family: Arial, Helvetica, sans-serif; position: fixed; right: 16px; top: 16px; width: 340px; z-index: 9999999; }
      #dogemod_panel { background: #fff; border: 2px solid #111; border-radius: 10px; padding: 10px; box-shadow: 0 12px 40px rgba(0,0,0,0.45); }
      #dogemod_ui h3 { margin: 0 0 8px 0; font-size: 16px; }
      #dogemod_tabs { display:flex; gap:6px; margin-bottom:8px; }
      .dogemod_tab_btn { flex:1; padding:6px; cursor:pointer; border-radius:6px; text-align:center; background:#eee; user-select:none; font-size:13px; }
      .dogemod_tab_btn.active { background:#ffcc66; font-weight:700; }
      .dogemod_tab { display:none; padding-top:6px; }
      .dogemod_tab.active { display:block; }
      #dogemod_message { min-height:18px; font-size:13px; color:#222; margin-top:8px; }
      .dogemod_row { margin-bottom:8px; display:flex; gap:6px; align-items:center; }
      .dogemod_row input[type="number"], .dogemod_row input[type="text"] { padding:6px; border-radius:6px; border:1px solid #ccc; flex:1; }
      .dogemod_row button { padding:6px 10px; border-radius:6px; cursor:pointer; border:0; background:#ffb84d; }
      .dogemod_small { font-size:12px; color:#444; }
      .dogemod_profiles { max-height:120px; overflow:auto; border:1px dashed #ddd; padding:6px; border-radius:6px; }
      .dogemod_profiles button { display:block; width:100%; margin-bottom:6px; text-align:left; background:#f7f7f7; padding:6px; border-radius:6px; border:1px solid #eee; }
    `;
    document.head.appendChild(style);

    // wrapper
    const wrapper = $el('div', { id: 'dogemod_ui' });
    const panel = $el('div', { id: 'dogemod_panel' });
    wrapper.appendChild(panel);

    // header
    const header = $el('div', {}, [
      $el('h3', {}, 'DogeMod — Modded Mode'),
      $el('div', { id: 'dogemod_message' }, '')
    ]);
    panel.appendChild(header);

    // tabs
    const tabsBar = $el('div', { id: 'dogemod_tabs' }, []);
    const tabs = ['Quick','Spawn','Auto','Items','Profiles','Advanced'];
    tabs.forEach((t, idx) => {
      const btn = $el('div', { class: 'dogemod_tab_btn' + (idx === 0 ? ' active' : ''), onclick: () => switchTab(idx) }, t);
      btn.dataset.idx = idx;
      tabsBar.appendChild(btn);
    });
    panel.appendChild(tabsBar);

    // tab contents
    const tabCon = $el('div', { id: 'dogemod_tabcon' });

    // QUICK TAB
    const quickTab = $el('div', { class: 'dogemod_tab active', id: 'tab-0' }, [
      $el('div', { class: 'dogemod_row' }, [
        $el('input', { id: 'dm_set_money_input', type: 'number', placeholder: 'Enter money amount' }),
        $el('button', { onclick: () => { const v = Number(q('#dm_set_money_input').value); if (!Number.isFinite(v)) return showMessage('Enter valid number'); smartSetMoney(v); } }, 'Set')
      ]),
      $el('div', { class: 'dogemod_row' }, [
        $el('input', { id: 'dm_add_money_input', type: 'number', placeholder: 'Add money amount' }),
        $el('button', { onclick: () => { const v = Number(q('#dm_add_money_input').value); if (!Number.isFinite(v)) return showMessage('Enter valid number'); smartAddMoney(Math.floor(v)); } }, 'Add')
      ]),
      $el('div', { class: 'dogemod_row' }, [
        $el('button', { onclick: () => { smartSetMoney(5000000000); showMessage('Preset: Billionaire'); } }, 'Billionaire'),
        $el('button', { onclick: () => { smartAddMoney(1000000); showMessage('Added 1,000,000'); } }, 'Add 1M')
      ]),
      $el('div', { class: 'dogemod_row' }, [
        $el('button', { onclick: () => { smartSpawn(10); } }, 'Spawn Ð10'),
        $el('button', { onclick: () => { for (let i=0;i<6;i++) smartSpawn(20); } }, 'Spawn x6 Ð20')
      ])
    ]);

    // SPAWN TAB
    const spawnTab = $el('div', { class: 'dogemod_tab', id: 'tab-1' }, [
      $el('div', { class: 'dogemod_row' }, [
        $el('input', { id: 'dm_spawn_value', type: 'number', value: 10 }),
        $el('input', { id: 'dm_spawn_count', type: 'number', value: 3 }),
        $el('button', { onclick: () => {
          const v = Math.max(1, Math.floor(Number(q('#dm_spawn_value').value) || 1));
          const c = clamp(Math.floor(Number(q('#dm_spawn_count').value) || 1), 1, 100);
          for (let i=0;i<c;i++) setTimeout(()=> smartSpawn(v), i*120);
        } }, 'Spawn')
      ]),
      $el('div', { class: 'dogemod_small' }, 'Spawn many or single coins. Use count for scatter effect.')
    ]);

    // AUTO TAB
    const autoTab = $el('div', { class: 'dogemod_tab', id: 'tab-2' }, [
      $el('div', { class: 'dogemod_row' }, [
        $el('input', { id: 'dm_auto_spawn_val', type: 'number', value: state.autoSpawnValue }),
        $el('input', { id: 'dm_auto_spawn_interval', type: 'number', value: state.autoSpawnInterval }),
        $el('button', { onclick: () => {
          state.autoSpawnValue = Math.max(1, Math.floor(Number(q('#dm_auto_spawn_val').value) || 1));
          state.autoSpawnInterval = clamp(Math.floor(Number(q('#dm_auto_spawn_interval').value) || 1000), 200, 60000);
          if (!state.autoSpawn) { state.autoSpawn = true; startAutoSpawn(); showMessage('Auto-spawn started'); } else { startAutoSpawn(); showMessage('Auto-spawn updated'); }
        } }, 'Start/Update')
      ]),
      $el('div', { class: 'dogemod_row' }, [
        $el('button', { onclick: () => { state.autoSpawn = false; stopAutoSpawn(); showMessage('Auto-spawn stopped'); } }, 'Stop Auto-Spawn'),
        $el('button', { onclick: () => { if (state.autoSpawnHandle) startAutoSpawn(); showMessage('Auto spawn tick now'); } }, 'Tick Now')
      ]),
      $el('hr'),
      $el('div', { class: 'dogemod_row' }, [
        $el('input', { id: 'dm_auto_collect_interval', type: 'number', value: state.autoCollectInterval }),
        $el('button', { onclick: () => {
          state.autoCollectInterval = clamp(Math.floor(Number(q('#dm_auto_collect_interval').value) || 1000), 150, 60000);
          state.autoCollect = true; startAutoCollect(); showMessage('Auto-collect started');
        } }, 'Start Collect')
      ]),
      $el('div', { class: 'dogemod_row' }, [
        $el('button', { onclick: () => { state.autoCollect = false; stopAutoCollect(); showMessage('Auto-collect stopped'); } }, 'Stop Collect'),
        $el('button', { onclick: () => { smartAddMoney(1); showMessage('Manual collect +1'); } }, 'Manual +1')
      ])
    ]);

    // ITEMS TAB (granting items/upgrades best effort)
    const itemsTab = $el('div', { class: 'dogemod_tab', id: 'tab-3' }, [
      $el('div', { class: 'dogemod_row' }, [
        $el('input', { id: 'dm_grant_item_name', type: 'text', placeholder: 'upgrade/item key (e.g. shibes)' }),
        $el('input', { id: 'dm_grant_item_amount', type: 'number', value: 1 }),
        $el('button', { onclick: () => {
          const k = String(q('#dm_grant_item_name').value || '').trim();
          const amt = Math.max(1, Math.floor(Number(q('#dm_grant_item_amount').value) || 1));
          if (!k) return showMessage('Enter item key');
          // best-effort: try to find a save object and set property
          let changed = false;
          ['save','savedata','game','gameState','state'].forEach(sname => {
            try {
              const obj = window[sname];
              if (obj && typeof obj === 'object' && Object.prototype.hasOwnProperty.call(obj, k) && typeof obj[k] === 'number') {
                obj[k] = (Number(obj[k]) || 0) + amt; changed = true;
              }
            } catch (e) {}
          });
          if (!changed) showMessage('Could not grant via known objects; try using "Advanced" to edit localStorage keys.');
          else showMessage(`Granted ${amt} x ${k}`);
        } }, 'Grant')
      ]),
      $el('div', { class: 'dogemod_small' }, 'Grant items/upgrades by key — this is best-effort and depends on your game internals.')
    ]);

    // PROFILES TAB
    const profilesTab = $el('div', { class: 'dogemod_tab', id: 'tab-4' }, [
      $el('div', { class: 'dogemod_row' }, [
        $el('input', { id: 'dm_profile_name', type: 'text', placeholder: 'Profile name' }),
        $el('button', { onclick: () => {
          const name = String(q('#dm_profile_name').value || '').trim();
          if (!name) return showMessage('Enter profile name');
          const p = loadProfiles();
          p[name] = {
            created: Date.now(),
            setMoney: Number(q('#dm_set_money_input').value) || 0,
            autoSpawnValue: Number(q('#dm_auto_spawn_val').value) || state.autoSpawnValue,
            autoSpawnInterval: Number(q('#dm_auto_spawn_interval').value) || state.autoSpawnInterval
          };
          saveProfiles(p);
          showMessage('Profile saved: ' + name);
          renderProfiles();
        } }, 'Save')
      ]),
      $el('div', { class: 'dogemod_profiles', id: 'dm_profiles_list' }, ''),
      $el('div', { class: 'dogemod_row' }, [
        $el('button', { onclick: () => { const p = loadProfiles(); localStorage.removeItem(PROFILE_KEY); showMessage('All profiles cleared'); renderProfiles(); } }, 'Clear All Profiles')
      ])
    ]);

    // ADVANCED TAB (export/import, raw localStorage edit)
    const advTab = $el('div', { class: 'dogemod_tab', id: 'tab-5' }, [
      $el('div', { class: 'dogemod_row' }, [
        $el('button', { onclick: () => {
          const profiles = loadProfiles();
          navigator.clipboard && navigator.clipboard.writeText(JSON.stringify(profiles, null, 2));
          showMessage('Profiles copied to clipboard (or try opening console).');
          console.log('Profiles export:', profiles);
        } }, 'Export Profiles')
      ]),
      $el('div', { class: 'dogemod_row' }, [
        $el('button', { onclick: () => {
          const raw = prompt('Paste JSON to import profiles (overwrites matching names):');
          if (!raw) return;
          try {
            const obj = JSON.parse(raw);
            const cur = loadProfiles();
            Object.assign(cur, obj);
            saveProfiles(cur);
            renderProfiles();
            showMessage('Imported profiles');
          } catch (e) { showMessage('Invalid JSON'); }
        } }, 'Import Profiles')
      ]),
      $el('hr'),
      $el('div', { class: 'dogemod_row' }, [
        $el('button', { onclick: () => {
          // dump localStorage to console for debugging
          const dump = {};
          for (let i=0;i<localStorage.length;i++) { const k = localStorage.key(i); dump[k] = localStorage.getItem(k); }
          console.log('localStorage dump:', dump);
          showMessage('localStorage dumped to console');
        } }, 'Dump localStorage')
      ]),
      $el('div', { class: 'dogemod_row' }, [
        $el('button', { onclick: () => {
          const key = prompt('Enter localStorage key to edit:');
          if (!key) return;
          const raw = localStorage.getItem(key);
          if (raw === null) return alert('Key not found');
          const parsed = tryParseJSON(raw);
          const edit = prompt('Edit value (JSON or plain). Current:\n' + raw, parsed ? JSON.stringify(parsed, null, 2) : raw);
          if (edit === null) return;
          try {
            // try parse
            const toStore = tryParseJSON(edit) || edit;
            localStorage.setItem(key, typeof toStore === 'string' ? toStore : JSON.stringify(toStore));
            showMessage('Saved localStorage key: ' + key);
          } catch (e) { alert('Failed to save: ' + e.message); }
        } }, 'Edit localStorage key')
      ])
    ]);

    // append tabs
    tabCon.appendChild(quickTab);
    tabCon.appendChild(spawnTab);
    tabCon.appendChild(autoTab);
    tabCon.appendChild(itemsTab);
    tabCon.appendChild(profilesTab);
    tabCon.appendChild(advTab);

    panel.appendChild(tabCon);

    // close button and open/close small toggle
    const footer = $el('div', { style: { marginTop: '8px', display: 'flex', gap: '8px', justifyContent: 'space-between' } }, [
      $el('button', { onclick: () => { wrapper.remove(); } }, 'Close UI'),
      $el('button', { onclick: () => { wrapper.style.display = wrapper.style.display === 'none' ? 'block' : 'none'; } }, 'Minimize')
    ]);
    panel.appendChild(footer);

    document.body.appendChild(wrapper);

    // message placeholder
    const msg = wrapper.querySelector('#dogemod_message');
    if (msg) msg.id = 'dogemod_message';

    // render profiles list
    function renderProfiles() {
      const parent = q('#dm_profiles_list');
      if (!parent) return;
      parent.innerHTML = '';
      const p = loadProfiles();
      Object.keys(p).forEach(name => {
        const btn = $el('button', { onclick: () => {
          // apply profile
          const data = p[name];
          if (data.setMoney) smartSetMoney(data.setMoney);
          if (data.autoSpawnValue) state.autoSpawnValue = data.autoSpawnValue;
          if (data.autoSpawnInterval) state.autoSpawnInterval = data.autoSpawnInterval;
          showMessage('Profile applied: ' + name);
        } }, `${name} — created ${new Date(p[name].created||0).toLocaleString()}`);
        const del = $el('button', { onclick: (e) => { e.stopPropagation(); if (confirm('Delete profile?')) { const cur = loadProfiles(); delete cur[name]; saveProfiles(cur); renderProfiles(); } } }, 'Delete');
        const row = $el('div', {}, [btn, del]);
        parent.appendChild(btn);
      });
      if (Object.keys(p).length === 0) parent.textContent = 'No profiles saved yet.';
    }
    renderProfiles();

    // tab switching
    function switchTab(idx) {
      qAll('.dogemod_tab_btn').forEach(b => b.classList.toggle('active', Number(b.dataset.idx) === idx));
      qAll('.dogemod_tab').forEach((t, i) => t.classList.toggle('active', i === idx));
    }

    // wire initial autos
    if (state.autoSpawn) startAutoSpawn();
    if (state.autoCollect) startAutoCollect();
  }

  // --- Boot: create a small floating launcher button (so UI not always open) ---
  function createLauncher() {
    if (q('#dogemod_launcher')) return;
    const launcher = $el('button', { id: 'dogemod_launcher', style: {
      position: 'fixed', right: '18px', bottom: '18px', padding: '10px 14px', zIndex: 9999999,
      background: '#ffb84d', border: 0, borderRadius: '8px', cursor: 'pointer', boxShadow: '0 8px 18px rgba(0,0,0,0.25)'
    }, onclick: () => {
      // open UI
      if (!q('#dogemod_ui')) createUI();
      q('#dogemod_ui').style.display = 'block';
    } }, 'Modded Mode');
    document.body.appendChild(launcher);
    // small keyboard shortcut: M toggles
    window.addEventListener('keydown', e => {
      if (e.key === 'M' || e.key === 'm') {
        if (!q('#dogemod_ui')) createUI();
        const ui = q('#dogemod_ui');
        ui.style.display = ui.style.display === 'none' ? 'block' : 'none';
      }
    });
  }

  // --- Initialize mod ---
  window.addEventListener('load', () => {
    try {
      createLauncher();
      // also create UI if user sets a special URL param ?mod=1
      if (location.search.includes('mod=1')) createUI();
      console.log('DogeMod loaded — open Modded Mode (bottom-right) or press M.');
    } catch (e) { console.error('DogeMod init error', e); }
  });

  // Expose API for console/power users
  window.DogeMod = {
    smartSetMoney,
    smartAddMoney,
    smartSpawn,
    spawnDomCoin,
    startAutoSpawn,
    stopAutoSpawn,
    startAutoCollect,
    stopAutoCollect,
    state,
    saveProfiles,
    loadProfiles
  };
})();
