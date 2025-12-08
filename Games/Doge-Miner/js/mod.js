// js/mod.js
// DogeMod — Persistent & safer coin add behavior
// Replace your existing js/mod.js with this file and load it after js/main.js
(function () {
  'use strict';

  const PROFILE_KEY = 'dogemod_profiles_v1';
  const MOD_STORAGE_KEY = 'dogemod_state_v1';

  // small helpers
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

  // heuristics
  const heuristics = {
    moneyNames: ['coins','money','dogecoins','dogeCoins','balance','playerCoins','coins_total','coinsTotal','doge'],
    spawnNames: ['spawnCoin','spawnDoge','createBonusCoin','spawnBonus','spawnBonusCoin','createCoin'],
    addNames: ['addCoins','addMoney','giveCoins','giveMoney','gainCoins'],
    saveNames: ['saveGame','save','persistSave','saveState','persist'],
    perSecNames: ['perSec','incomePerSec','coinsPerSecond','coinsPerSec','cps','incomeRate']
  };

  function findGlobalVar(nameList) {
    for (const name of nameList) if (Object.prototype.hasOwnProperty.call(window, name)) return name;
    return null;
  }
  function setGlobalNumber(name, value) {
    try { if (Object.prototype.hasOwnProperty.call(window, name) && typeof window[name] === 'number') { window[name] = value; return true; } } catch (e) {}
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

  // deep localStorage update (JSON objects)
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
              try {
                if (/coin|coins|doge|money|balance/i.test(k) && typeof o[k] === 'number') { o[k] = amount; changed = true; }
                else if (typeof o[k] === 'object') recurse(o[k]);
              } catch (e) {}
            });
          }
        })(obj);
        if (changed) {
          try { localStorage.setItem(key, JSON.stringify(obj)); console.log('mod: updated localStorage key', key); } catch (e) {}
        }
      }
    } catch (e) { console.warn('mod: deep localStorage update failed', e); }
  }

  // HUD update
  function updateHUD(amount) {
    try {
      const s = q('#mined strong');
      if (s) s.textContent = String(Math.floor(amount));
    } catch (e) {}
  }

  // persistent override engine (writes desired amount repeatedly to stop overwrite)
  const override = {
    enabled: false,
    desiredAmount: null,
    interval: 1000,
    handle: null
  };
  function startOverride(amount) {
    override.enabled = true;
    override.desiredAmount = Math.floor(amount);
    if (override.handle) clearInterval(override.handle);
    override.handle = setInterval(() => {
      // write to globals
      heuristics.moneyNames.forEach(n => {
        try { if (Object.prototype.hasOwnProperty.call(window, n)) window[n] = override.desiredAmount; } catch (e) {}
      });
      // update save-like objects if present
      ['save','savedata','game','gameState','state'].forEach(k => {
        try {
          const o = window[k];
          if (o && typeof o === 'object') {
            ['coins','dogecoins','money','balance','coins_total'].forEach(p => { try { if (Object.prototype.hasOwnProperty.call(o, p) && typeof o[p] === 'number') o[p] = override.desiredAmount; } catch (e) {} });
          }
        } catch (e) {}
      });
      // update localStorage JSONs
      deepUpdateLocalStorageCoins(override.desiredAmount);
      // update HUD
      updateHUD(override.desiredAmount);
      // attempt to call save function
      callIfExists(heuristics.saveNames);
    }, Math.max(200, override.interval));
  }
  function stopOverride() {
    override.enabled = false;
    override.desiredAmount = null;
    if (override.handle) { clearInterval(override.handle); override.handle = null; }
  }

  // smartSetMoney now updates globals, localStorage, and optionally starts persistent override if requested
  function smartSetMoney(amount, options = { persistent:false, silent:false }) {
    amount = Math.floor(amount);
    updateHUD(amount);

    // try global variables
    heuristics.moneyNames.forEach(name => {
      try { if (Object.prototype.hasOwnProperty.call(window, name)) { window[name] = amount; console.log('mod: set', name, amount); } } catch (e) {}
    });

    // try save objects on window
    ['save','savedata','game','gameState','state'].forEach(k => {
      try {
        const obj = window[k];
        if (obj && typeof obj === 'object') {
          ['coins','dogecoins','money','balance','coins_total'].forEach(p => {
            try { if (Object.prototype.hasOwnProperty.call(obj, p) && typeof obj[p] === 'number') obj[p] = amount; } catch (e) {}
          });
        }
      } catch (e) {}
    });

    // update localStorage JSONs
    deepUpdateLocalStorageCoins(amount);

    // call save function if any (best-effort)
    const r = callIfExists(heuristics.saveNames);
    if (r.called) console.log('mod: save called via', r.name);

    if (options.persistent) startOverride(amount);
    else if (override.enabled) stopOverride();

    if (!options.silent) showMessage(`Money set to $${amount}`);
  }

  // smartAddMoney: prefer calling an "add" function, else modify globals or UI
  function smartAddMoney(delta) {
    delta = Math.floor(delta);
    // 1) try add functions
    const r = callIfExists(heuristics.addNames, delta);
    if (r.called) { showMessage(`Added $${delta} via ${r.name}`); return; }

    // 2) try global variable
    const g = findGlobalVar(heuristics.moneyNames);
    if (g) {
      try {
        const cur = Number(window[g]) || Number((q('#mined strong') || { textContent:'0' }).textContent) || 0;
        window[g] = cur + delta;
        updateHUD(window[g]);
        showMessage(`Added $${delta}`);
        // try save
        callIfExists(heuristics.saveNames);
        return;
      } catch (e) { console.warn(e); }
    }

    // 3) fallback: update HUD and localStorage heuristics
    const curHud = Number((q('#mined strong') || { textContent:'0' }).textContent) || 0;
    smartSetMoney(curHud + delta, { silent:true });
    showMessage(`Added $${delta}`);
  }

  // spawn fallback DOM coin (now uses smartAddMoney on click — FIX)
  function spawnDomCoin(value = 1, opts = {}) {
    const container = q('#minerwrapper') || document.body;
    const coin = $el('div', { class: 'mod-coin', style: {
      position: 'absolute',
      left: (50 + Math.random() * 600) + 'px',
      top: (80 + Math.random() * 200) + 'px',
      zIndex: 999999,
      padding: '8px 10px',
      borderRadius: '8px',
      background: 'linear-gradient(#ffd66b,#ffb84d)',
      color: '#3a2200',
      fontWeight: '700',
      cursor: 'pointer',
      boxShadow: '0 6px 12px rgba(0,0,0,0.15)',
      userSelect: 'none'
    } }, `Ð +${value}`);
    coin.addEventListener('click', function () {
      // IMPORTANT: add the coin value (not overwrite)
      smartAddMoney(value);
      coin.remove();
    });
    container.appendChild(coin);
    setTimeout(() => { if (coin && coin.parentNode) coin.remove(); }, 12000);
    return coin;
  }

  // smartSpawn tries to call game spawn function; fallback to DOM coin(s)
  function smartSpawn(value = 1, count = 1, scatterMs = 120) {
    // try to call known spawn functions
    const r = callIfExists(heuristics.spawnNames, value);
    if (r.called) { showMessage(`Spawned coin via ${r.name}`); return; }

    // try "spawn" fallback
    if (typeof window.spawn === 'function') {
      try { window.spawn(value); showMessage('Spawned via spawn()'); return; } catch (e) {}
    }

    // fallback: spawn DOM coins (multiple)
    for (let i = 0; i < count; i++) setTimeout(() => spawnDomCoin(value), i * scatterMs);
    showMessage(`Spawned ${count} DOM coin(s)`);
  }

  // profiles
  function loadProfiles() { try { const raw = localStorage.getItem(PROFILE_KEY); return raw ? tryParseJSON(raw) || {} : {}; } catch (e) { return {}; } }
  function saveProfiles(obj) { try { localStorage.setItem(PROFILE_KEY, JSON.stringify(obj || {})); } catch (e) {} }

  // message flash
  let messageTimer = null;
  function showMessage(txt, ms = 2200) {
    const el = q('#dogemod_message');
    if (!el) return;
    el.textContent = txt;
    if (messageTimer) clearTimeout(messageTimer);
    messageTimer = setTimeout(() => { if (el.textContent === txt) el.textContent = ''; }, ms);
  }

  // module state & autos (persist across reloads)
  const state = {
    autoSpawn: false,
    autoSpawnInterval: 5000,
    autoSpawnValue: 10,
    autoCollect: false,
    autoCollectInterval: 1200,
    autoSpawnHandle: null,
    autoCollectHandle: null,
    useAddOnCollect: true, // important toggle for correctness
    persistentMode: false // new: whether to keep writing desired money repeatedly
  };
  function saveState() { try { localStorage.setItem(MOD_STORAGE_KEY, JSON.stringify(state)); } catch (e) {} }
  function loadState() { try { const raw = localStorage.getItem(MOD_STORAGE_KEY); if (raw) Object.assign(state, tryParseJSON(raw) || {}); } catch (e) {} }
  loadState();

  // autos
  function startAutoSpawn() {
    if (state.autoSpawnHandle) clearInterval(state.autoSpawnHandle);
    state.autoSpawnHandle = setInterval(() => { smartSpawn(state.autoSpawnValue); }, Math.max(200, state.autoSpawnInterval));
    saveState();
  }
  function stopAutoSpawn() { if (state.autoSpawnHandle) clearInterval(state.autoSpawnHandle); state.autoSpawnHandle = null; saveState(); }
  function startAutoCollect() {
    if (state.autoCollectHandle) clearInterval(state.autoCollectHandle);
    state.autoCollectHandle = setInterval(() => {
      // click any known DOM coins (our fallback) or add 1 as fallback
      const coins = qAll('.mod-coin').concat(qAll('.bonus-coin') || []);
      if (coins && coins.length) coins.forEach(c => { try { c.click(); } catch (e) {} });
      else smartAddMoney(1);
    }, Math.max(200, state.autoCollectInterval));
    saveState();
  }
  function stopAutoCollect() { if (state.autoCollectHandle) clearInterval(state.autoCollectHandle); state.autoCollectHandle = null; saveState(); }

  // MAIN UI: create launcher & panel
  function createUI() {
    if (q('#dogemod_ui')) return;
    const style = document.createElement('style');
    style.textContent = `
      #dogemod_ui { font-family: Arial, Helvetica, sans-serif; position: fixed; right: 16px; top: 16px; width: 360px; z-index: 9999999; }
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

    const wrapper = $el('div', { id: 'dogemod_ui' });
    const panel = $el('div', { id: 'dogemod_panel' });

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
      btn.dataset.idx = idx; tabsBar.appendChild(btn);
    });
    panel.appendChild(tabsBar);

    // tab container
    const tabCon = $el('div', { id: 'dogemod_tabcon' });

    // QUICK
    const quickTab = $el('div', { class: 'dogemod_tab active', id: 'tab-0' }, [
      $el('div', { class: 'dogemod_row' }, [
        $el('input', { id: 'dm_set_money_input', type: 'number', placeholder: 'Enter money amount' }),
        $el('button', { onclick: () => {
          const v = Number(q('#dm_set_money_input').value);
          if (!Number.isFinite(v)) return showMessage('Enter valid number');
          const persistent = q('#dm_persistent_toggle') && q('#dm_persistent_toggle').checked;
          smartSetMoney(v, { persistent: !!persistent });
        } }, 'Set')
      ]),
      $el('div', { class: 'dogemod_row' }, [
        $el('input', { id: 'dm_add_money_input', type: 'number', placeholder: 'Add money amount' }),
        $el('button', { onclick: () => {
          const v = Number(q('#dm_add_money_input').value);
          if (!Number.isFinite(v)) return showMessage('Enter valid number');
          smartAddMoney(Math.floor(v));
        } }, 'Add')
      ]),
      $el('div', { class: 'dogemod_row' }, [
        $el('button', { onclick: () => { smartSetMoney(5000000000, { persistent: true }); showMessage('Preset: Billionaire + persistent'); } }, 'Billionaire (persistent)'),
        $el('button', { onclick: () => { smartAddMoney(1000000); showMessage('Added 1,000,000'); } }, 'Add 1M')
      ]),
      $el('div', { class: 'dogemod_row' }, [
        $el('label', {}, [ $el('input', { id: 'dm_persistent_toggle', type: 'checkbox' }), ' Persistent Mode (keeps value) ' ])
      ]),
      $el('div', { class: 'dogemod_row' }, [
        $el('button', { onclick: () => { callIfExists(heuristics.saveNames); showMessage('Force save called (best-effort)'); } }, 'Force Save'),
        $el('button', { onclick: () => { stopOverride(); showMessage('Persistent override stopped'); } }, 'Reset Overrides')
      ])
    ]);

    // SPAWN TAB
    const spawnTab = $el('div', { class: 'dogemod_tab', id: 'tab-1' }, [
      $el('div', { class: 'dogemod_row' }, [
        $el('input', { id: 'dm_spawn_value', type: 'number', value: 10 }),
        $el('input', { id: 'dm_spawn_count', type: 'number', value: 3 }),
        $el('button', { onclick: () => {
          const v = Math.max(1, Math.floor(Number(q('#dm_spawn_value').value) || 1));
          const c = clamp(Math.floor(Number(q('#dm_spawn_count').value) || 1), 1, 200);
          const scatter = 120;
          for (let i = 0; i < c; i++) setTimeout(()=> smartSpawn(v), i * scatter);
        } }, 'Spawn')
      ]),
      $el('div', { class: 'dogemod_row' }, [
        $el('button', { onclick: () => { smartSpawn(10, 20, 40); } }, 'Scatter: 20x Ð10'),
        $el('button', { onclick: () => { for (let i=0;i<10;i++) smartSpawn(Math.floor(Math.random()*200)+10,1,50); } }, 'Random x10')
      ])
    ]);

    // AUTO TAB
    const autoTab = $el('div', { class: 'dogemod_tab', id: 'tab-2' }, [
      $el('div', { class: 'dogemod_row' }, [
        $el('input', { id: 'dm_auto_spawn_val', type: 'number', value: state.autoSpawnValue }),
        $el('input', { id: 'dm_auto_spawn_interval', type: 'number', value: state.autoSpawnInterval }),
        $el('button', { onclick: () => {
          state.autoSpawnValue = Math.max(1, Math.floor(Number(q('#dm_auto_spawn_val').value) || 1));
          state.autoSpawnInterval = clamp(Math.floor(Number(q('#dm_auto_spawn_interval').value) || 1000), 200, 60000);
          state.autoSpawn = true; startAutoSpawn(); showMessage('Auto-spawn started/updated');
        } }, 'Start/Update')
      ]),
      $el('div', { class: 'dogemod_row' }, [
        $el('button', { onclick: () => { state.autoSpawn = false; stopAutoSpawn(); showMessage('Auto-spawn stopped'); } }, 'Stop Auto-Spawn'),
        $el('button', { onclick: () => { if (state.autoSpawnHandle) startAutoSpawn(); showMessage('Auto tick'); } }, 'Tick Now')
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
        $el('label', {}, [ $el('input', { id: 'dm_collect_add_toggle', type: 'checkbox', checked: state.useAddOnCollect, onchange: (e)=>{ state.useAddOnCollect = e.target.checked; saveState(); showMessage('Use add-on-collect: ' + state.useAddOnCollect); } }), ' Use Add on Collect (recommended)' ]),
        $el('button', { onclick: () => { state.autoCollect = false; stopAutoCollect(); showMessage('Auto-collect stopped'); } }, 'Stop Collect')
      ])
    ]);

    // ITEMS tab
    const itemsTab = $el('div', { class: 'dogemod_tab', id: 'tab-3' }, [
      $el('div', { class: 'dogemod_row' }, [
        $el('input', { id: 'dm_grant_item_name', type: 'text', placeholder: 'upgrade/item key (e.g. shibes)' }),
        $el('input', { id: 'dm_grant_item_amount', type: 'number', value: 1 }),
        $el('button', { onclick: () => {
          const k = String(q('#dm_grant_item_name').value || '').trim();
          const amt = Math.max(1, Math.floor(Number(q('#dm_grant_item_amount').value) || 1));
          if (!k) return showMessage('Enter item key');
          let changed = false;
          ['save','savedata','game','gameState','state'].forEach(sname => {
            try {
              const obj = window[sname];
              if (obj && typeof obj === 'object' && Object.prototype.hasOwnProperty.call(obj, k) && typeof obj[k] === 'number') {
                obj[k] = (Number(obj[k]) || 0) + amt; changed = true;
              }
            } catch (e) {}
          });
          if (!changed) showMessage('Could not grant via known objects; try Advanced -> Edit localStorage');
          else showMessage(`Granted ${amt} x ${k}`);
        } }, 'Grant')
      ]),
      $el('div', { class: 'dogemod_small' }, 'Best-effort granting depends on your game internals.')
    ]);

    // PROFILES tab
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
          }; saveProfiles(p); showMessage('Profile saved: ' + name); renderProfiles();
        } }, 'Save')
      ]),
      $el('div', { class: 'dogemod_profiles', id: 'dm_profiles_list' }, ''),
      $el('div', { class: 'dogemod_row' }, [ $el('button', { onclick: () => { localStorage.removeItem(PROFILE_KEY); showMessage('All profiles cleared'); renderProfiles(); } }, 'Clear All Profiles') ])
    ]);

    // ADVANCED tab
    const advTab = $el('div', { class: 'dogemod_tab', id: 'tab-5' }, [
      $el('div', { class: 'dogemod_row' }, [ $el('button', { onclick: () => { const profiles = loadProfiles(); navigator.clipboard && navigator.clipboard.writeText(JSON.stringify(profiles, null, 2)); showMessage('Profiles copied to clipboard'); console.log('Profiles export:', profiles); } }, 'Export Profiles') ]),
      $el('div', { class: 'dogemod_row' }, [ $el('button', { onclick: () => { const raw = prompt('Paste JSON to import profiles (overwrites matching names):'); if (!raw) return; try { const obj = JSON.parse(raw); const cur = loadProfiles(); Object.assign(cur, obj); saveProfiles(cur); renderProfiles(); showMessage('Imported profiles'); } catch (e) { showMessage('Invalid JSON'); } } }, 'Import Profiles') ]),
      $el('hr'),
      $el('div', { class: 'dogemod_row' }, [ $el('button', { onclick: () => { const dump = {}; for (let i=0;i<localStorage.length;i++) { const k = localStorage.key(i); dump[k] = localStorage.getItem(k); } console.log('localStorage dump:', dump); showMessage('localStorage dumped to console'); } }, 'Dump localStorage') ]),
      $el('div', { class: 'dogemod_row' }, [ $el('button', { onclick: () => {
        const key = prompt('Enter localStorage key to edit:'); if (!key) return; const raw = localStorage.getItem(key); if (raw === null) return alert('Key not found'); const parsed = tryParseJSON(raw); const edit = prompt('Edit value (JSON or plain). Current:\\n' + raw, parsed ? JSON.stringify(parsed, null, 2) : raw); if (edit === null) return; try { const toStore = tryParseJSON(edit) || edit; localStorage.setItem(key, typeof toStore === 'string' ? toStore : JSON.stringify(toStore)); showMessage('Saved localStorage key: ' + key); } catch (e) { alert('Failed to save: ' + e.message); } } }, 'Edit localStorage key') ])
    ]);

    tabCon.appendChild(quickTab);
    tabCon.appendChild(spawnTab);
    tabCon.appendChild(autoTab);
    tabCon.appendChild(itemsTab);
    tabCon.appendChild(profilesTab);
    tabCon.appendChild(advTab);
    panel.appendChild(tabCon);

    // footer
    const footer = $el('div', { style: { marginTop: '8px', display: 'flex', gap: '8px', justifyContent: 'space-between' } }, [
      $el('button', { onclick: () => { wrapper.remove(); } }, 'Close UI'),
      $el('button', { onclick: () => { wrapper.style.display = wrapper.style.display === 'none' ? 'block' : 'none'; } }, 'Minimize')
    ]);
    panel.appendChild(footer);
    wrapper.appendChild(panel);
    document.body.appendChild(wrapper);

    function renderProfiles() {
      const parent = q('#dm_profiles_list'); if (!parent) return; parent.innerHTML = ''; const p = loadProfiles();
      Object.keys(p).forEach(name => {
        const btn = $el('button', { onclick: () => {
          const data = p[name];
          if (data.setMoney) smartSetMoney(data.setMoney);
          if (data.autoSpawnValue) state.autoSpawnValue = data.autoSpawnValue;
          if (data.autoSpawnInterval) state.autoSpawnInterval = data.autoSpawnInterval;
          showMessage('Profile applied: ' + name);
        } }, `${name} — created ${new Date(p[name].created||0).toLocaleString()}`);
        const del = $el('button', { onclick: (e) => { e.stopPropagation(); if (confirm('Delete profile?')) { const cur = loadProfiles(); delete cur[name]; saveProfiles(cur); renderProfiles(); } } }, 'Delete');
        const row = $el('div', {}, [btn, del]); parent.appendChild(btn);
      });
      if (Object.keys(p).length === 0) parent.textContent = 'No profiles saved yet.';
    }
    renderProfiles();

    function switchTab(idx) {
      qAll('.dogemod_tab_btn').forEach(b => b.classList.toggle('active', Number(b.dataset.idx) === idx));
      qAll('.dogemod_tab').forEach((t, i) => t.classList.toggle('active', i === idx));
    }

    // wire autos from state if enabled
    if (state.autoSpawn) startAutoSpawn();
    if (state.autoCollect) startAutoCollect();
  }

  // launcher button
  function createLauncher() {
    if (q('#dogemod_launcher')) return;
    const launcher = $el('button', { id: 'dogemod_launcher', style: {
      position: 'fixed', right: '18px', bottom: '18px', padding: '10px 14px', zIndex: 9999999,
      background: '#ffb84d', border: 0, borderRadius: '8px', cursor: 'pointer', boxShadow: '0 8px 18px rgba(0,0,0,0.25)'
    }, onclick: () => {
      if (!q('#dogemod_ui')) createUI();
      q('#dogemod_ui').style.display = 'block';
    } }, 'Modded Mode');
    document.body.appendChild(launcher);
    window.addEventListener('keydown', e => { if (e.key === 'M' || e.key === 'm') { if (!q('#dogemod_ui')) createUI(); const ui = q('#dogemod_ui'); ui.style.display = ui.style.display === 'none' ? 'block' : 'none'; } });
  }

  // initialize
  window.addEventListener('load', () => {
    try { createLauncher(); if (location.search.includes('mod=1')) createUI(); console.log('DogeMod loaded — Modded Mode ready.'); } catch (e) { console.error('DogeMod init error', e); }
  });

  // expose API
  window.DogeMod = {
    smartSetMoney, smartAddMoney, smartSpawn, spawnDomCoin, startAutoSpawn, stopAutoSpawn, startAutoCollect, stopAutoCollect, state,
    startOverride: (amt) => { startOverride(amt); showMessage('Override started'); }, stopOverride
  };
})();
