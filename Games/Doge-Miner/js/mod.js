// js/mod.js
(function () {
  'use strict';

  // --- Helper: update visible HUD (mined area) ---
  function updateHUDDisplay(amount) {
    try {
      // the mined count in index.html is: <div id="mined"><p>Dogecoins: <strong>0</strong></p></div>
      const minedStrong = document.querySelector('#mined strong');
      if (minedStrong) minedStrong.textContent = String(Math.floor(amount));
    } catch (e) {
      console.warn('mod: failed to update HUD element', e);
    }
  }

  // --- Heuristics: try to update in-memory game variables and save keys ---
  function trySetGameMoney(amount) {
    // 1) Try common global variable names
    const names = ['coins','money','dogecoins','dogeCoins','balance','playerCoins','coins_total','coinsTotal'];
    names.forEach(n => {
      try {
        if (Object.prototype.hasOwnProperty.call(window, n) && typeof window[n] === 'number') {
          window[n] = amount;
          console.log('mod: set window.' + n + ' =', amount);
        }
      } catch (e) { /* ignore */ }
    });

    // 2) Try common "save" objects on window
    try {
      const saveCandidates = ['save','savedata','gameSave','game','gameState'];
      saveCandidates.forEach(k => {
        const obj = window[k];
        if (obj && typeof obj === 'object') {
          // try common properties
          ['coins','dogecoins','money','balance','coins_total'].forEach(p => {
            if (Object.prototype.hasOwnProperty.call(obj, p)) {
              try { obj[p] = amount; console.log('mod: set ' + k + '.' + p + ' =', amount); } catch (e) {}
            }
          });
        }
      });
    } catch (e) { /* ignore */ }

    // 3) Try localStorage: look for JSON entries that refer to coins/doge
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!key) continue;
        try {
          const raw = localStorage.getItem(key);
          if (!raw) continue;
          // only parse JSON-like strings
          if (raw.trim().startsWith('{') || raw.trim().startsWith('[')) {
            const obj = JSON.parse(raw);
            let changed = false;
            function deepSetCoins(o) {
              if (o && typeof o === 'object') {
                for (const k in o) {
                  if (!Object.prototype.hasOwnProperty.call(o, k)) continue;
                  if (/coin|coins|doge|money|balance/i.test(k) && typeof o[k] === 'number') {
                    o[k] = amount; changed = true;
                  } else if (typeof o[k] === 'object') deepSetCoins(o[k]);
                }
              }
            }
            deepSetCoins(obj);
            if (changed) {
              localStorage.setItem(key, JSON.stringify(obj));
              console.log('mod: updated localStorage key', key);
            }
          }
        } catch (e) {
          // not JSON or parse failed, ignore
        }
      }
    } catch (e) { /* ignore */ }

    // 4) Update HUD visible display
    updateHUDDisplay(amount);
  }

  // --- create DOM coin for spawning (fallback if game spawn logic unknown) ---
  function spawnDomDoge(value) {
    const container = document.querySelector('#minerwrapper') || document.body;
    const coin = document.createElement('div');
    coin.className = 'mod-coin';
    coin.textContent = 'Ð+' + value;
    Object.assign(coin.style, {
      position: 'absolute',
      left: (50 + Math.random() * 600) + 'px',
      top: (80 + Math.random() * 200) + 'px',
      zIndex: 99999,
      padding: '8px 10px',
      borderRadius: '10px',
      background: 'linear-gradient(#ffd66b,#ffb84d)',
      color: '#3a2200',
      fontWeight: '700',
      cursor: 'pointer',
      boxShadow: '0 6px 12px rgba(0,0,0,0.2)',
      userSelect: 'none'
    });
    coin.addEventListener('click', function () {
      // add value to UI and try to set game money heuristics
      const cur = Number((document.querySelector('#mined strong') || { textContent: '0' }).textContent) || 0;
      const next = cur + value;
      trySetGameMoney(next);
      coin.remove();
    });
    // auto remove
    setTimeout(() => { coin.remove(); }, 12000);
    container.appendChild(coin);
  }

  // --- build the mod UI overlay & button ---
  function createModUI() {
    // button
    const btn = document.createElement('button');
    btn.id = 'enterModBtn';
    btn.textContent = 'Modded Mode';
    Object.assign(btn.style, {
      position: 'fixed',
      right: '18px',
      bottom: '18px',
      zIndex: 999999,
      padding: '10px 14px',
      background: '#ffb84d',
      border: '0',
      borderRadius: '8px',
      cursor: 'pointer',
      boxShadow: '0 6px 12px rgba(0,0,0,0.2)'
    });
    document.body.appendChild(btn);

    // overlay
    const overlay = document.createElement('div');
    overlay.id = 'modOverlay';
    overlay.style.display = 'none';
    Object.assign(overlay.style, {
      position: 'fixed',
      right: '18px',
      top: '18px',
      background: '#ffffff',
      border: '2px solid #222',
      padding: '12px',
      zIndex: 999999,
      width: '280px',
      borderRadius: '8px',
      boxShadow: '0 10px 30px rgba(0,0,0,0.3)'
    });

    overlay.innerHTML = `
      <h4 style="margin:0 0 8px 0">Modded Mode</h4>
      <div style="margin-bottom:8px;">
        <label>Set Money: $</label>
        <input id="modMoneyInput" type="number" style="width:110px" />
        <button id="modSetMoneyBtn">Set</button>
      </div>
      <div style="margin-bottom:8px;">
        <label>Spawn coin value:</label>
        <input id="modCoinValue" type="number" value="10" style="width:80px" />
        <button id="modSpawnCoinBtn">Spawn Coin</button>
      </div>
      <div style="display:flex; gap:8px; margin-top:6px;">
        <button id="modFreeStuffBtn">Give Free Stuff</button>
        <button id="modCloseBtn">Close</button>
      </div>
      <div id="modMessage" style="margin-top:8px;color:#333;font-size:12px;"></div>
    `;
    document.body.appendChild(overlay);

    // handlers
    btn.addEventListener('click', () => {
      overlay.style.display = 'block';
      document.getElementById('modMoneyInput').value = Number((document.querySelector('#mined strong') || { textContent: '0' }).textContent) || 0;
    });

    overlay.querySelector('#modCloseBtn').addEventListener('click', () => overlay.style.display = 'none');

    overlay.querySelector('#modSetMoneyBtn').addEventListener('click', () => {
      const v = Number(overlay.querySelector('#modMoneyInput').value);
      if (!Number.isFinite(v)) {
        overlay.querySelector('#modMessage').textContent = 'Enter a valid number';
        return;
      }
      trySetGameMoney(Math.floor(v));
      overlay.querySelector('#modMessage').textContent = 'Money set locally to $' + Math.floor(v);
      // small flash
      setTimeout(() => { overlay.querySelector('#modMessage').textContent = ''; }, 2000);
    });

    overlay.querySelector('#modSpawnCoinBtn').addEventListener('click', () => {
      const val = Math.max(1, Math.floor(Number(overlay.querySelector('#modCoinValue').value) || 1));
      // Prefer calling known spawn functions if present (attempt)
      const tried = tryCallSpawnFunction(val);
      if (!tried) spawnDomDoge(val);
    });

    overlay.querySelector('#modFreeStuffBtn').addEventListener('click', () => {
      // example freebies
      const cur = Number((document.querySelector('#mined strong') || { textContent: '0' }).textContent) || 0;
      const added = 1000;
      const next = cur + added;
      trySetGameMoney(next);
      // spawn a few coins visually
      for (let i = 0; i < 4; i++) spawnDomDoge(Math.floor(Math.random() * 200) + 10);
      overlay.querySelector('#modMessage').textContent = 'Gave free stuff: +$' + added;
      setTimeout(() => { overlay.querySelector('#modMessage').textContent = ''; }, 2500);
    });
  }

  // Try to call a game's spawn function if it exists (best-effort)
  function tryCallSpawnFunction(value) {
    const candidates = ['spawnCoin','spawnDoge','createBonusCoin','spawnBonus','spawnBonusCoin','createCoin'];
    for (let i = 0; i < candidates.length; i++) {
      const fnName = candidates[i];
      const fn = window[fnName];
      if (typeof fn === 'function') {
        try {
          fn(value);
          console.log('mod: called', fnName, '(', value, ')');
          return true;
        } catch (e) {
          console.warn('mod: calling', fnName, 'failed', e);
        }
      }
    }
    return false;
  }

  // Initialize
  window.addEventListener('load', function () {
    try { createModUI(); } catch (e) { console.error('mod: failed to create UI', e); }
  });
})();
