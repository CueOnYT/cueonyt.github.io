// Game Launcher v1
// Uses localStorage to persist game list and per-game "save" text.
// No server required.

// Constants
const STORAGE_KEY = 'gameLauncher.games.v1';
const SAVE_PREFIX = 'gameLauncher.save.';
const DEFAULT_GAMES = [
  { id: genId(), name: 'Example: 2048', url: 'https://play2048.co/', prefer: 'embed' },
  { id: genId(), name: 'Example: Snake', url: 'https://classicreload.com/snake.html', prefer: 'newtab' }
];

// UI references
const gamesListEl = document.getElementById('gamesList');
const addGameBtn = document.getElementById('addGameBtn');
const modal = document.getElementById('modal');
const modalTitle = document.getElementById('modalTitle');
const gameNameInput = document.getElementById('gameName');
const gameURLInput = document.getElementById('gameURL');
const preferEmbedSelect = document.getElementById('preferEmbed');
const saveBtn = document.getElementById('saveBtn');
const cancelBtn = document.getElementById('cancelBtn');

const gameFrame = document.getElementById('gameFrame');
const frameOverlay = document.getElementById('frameOverlay');
const openFallback = document.getElementById('openFallback');
const openNewTabBtn = document.getElementById('openNewTab');
const reloadIframeBtn = document.getElementById('reloadIframe');

const activeTitle = document.getElementById('activeTitle');

const gameSaveText = document.getElementById('gameSave');
const saveGameDataBtn = document.getElementById('saveGameData');
const clearGameDataBtn = document.getElementById('clearGameData');

const exportBtn = document.getElementById('exportBtn');
const importBtn = document.getElementById('importBtn');
const importFile = document.getElementById('importFile');

let editingId = null;
let games = [];
let activeGameId = null;

// init
init();

function init() {
  loadGames();
  renderGames();
  attachEventListeners();
  // If no games found, seed with defaults
  if (games.length === 0) {
    games = DEFAULT_GAMES;
    saveGames();
    renderGames();
  }
}

function attachEventListeners(){
  addGameBtn.addEventListener('click', () => openAddModal());
  cancelBtn.addEventListener('click', closeModal);
  saveBtn.addEventListener('click', submitModal);
  openFallback.addEventListener('click', () => {
    if (!activeGameId) return;
    const g = games.find(x => x.id === activeGameId);
    if (g) openInNewTab(g.url);
  });
  openNewTabBtn.addEventListener('click', () => {
    if (!activeGameId) return;
    const g = games.find(x => x.id === activeGameId);
    if (g) openInNewTab(g.url);
  });
  reloadIframeBtn.addEventListener('click', () => {
    if (gameFrame.src) {
      // Force reload
      gameFrame.src = gameFrame.src;
    }
  });

  // iframe detection: check if loaded and has contentWindow access; if cross-origin, attempt to detect embed failure by monitoring load + visibility
  gameFrame.addEventListener('load', () => {
    // If sandboxed or blocked, contentWindow might be null, but we use a heuristic:
    setTimeout(() => {
      checkIframeEmbeddable();
    }, 300);
  });

  saveGameDataBtn.addEventListener('click', () => {
    if (!activeGameId) return alert('Load a game first');
    const key = SAVE_PREFIX + activeGameId;
    localStorage.setItem(key, gameSaveText.value || '');
    showToast('Saved');
  });

  clearGameDataBtn.addEventListener('click', () => {
    if (!activeGameId) return alert('Load a game first');
    const key = SAVE_PREFIX + activeGameId;
    localStorage.removeItem(key);
    gameSaveText.value = '';
    showToast('Cleared');
  });

  exportBtn.addEventListener('click', () => {
    const payload = { games, saves: collectAllSaves() };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'game-launcher-export.json';
    a.click();
    URL.revokeObjectURL(url);
  });

  importBtn.addEventListener('click', () => importFile.click());
  importFile.addEventListener('change', handleImportFile);
}

function collectAllSaves(){
  const saves = {};
  games.forEach(g => {
    const val = localStorage.getItem(SAVE_PREFIX + g.id);
    if (val !== null) saves[g.id] = val;
  });
  return saves;
}

function handleImportFile(e){
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const obj = JSON.parse(reader.result);
      if (!obj.games || !Array.isArray(obj.games)) throw new Error('Invalid file');
      // Replace current games (you could merge; we choose to replace)
      games = obj.games.map(g => ({ id: g.id || genId(), name: g.name || 'Untitled', url: g.url || '', prefer: g.prefer || 'embed' }));
      saveGames();
      renderGames();
      // import saves optionally
      if (obj.saves && typeof obj.saves === 'object') {
        Object.entries(obj.saves).forEach(([k,val]) => {
          try { localStorage.setItem(SAVE_PREFIX + k, val); } catch(e) {}
        });
      }
      showToast('Imported');
    } catch (err) {
      alert('Import failed: ' + err.message);
    }
  };
  reader.readAsText(file);
  importFile.value = '';
}

// Modal
function openAddModal(game) {
  editingId = game ? game.id : null;
  modalTitle.textContent = game ? 'Edit Game' : 'Add Game';
  gameNameInput.value = game ? game.name : '';
  gameURLInput.value = game ? game.url : '';
  preferEmbedSelect.value = game ? (game.prefer || 'embed') : 'embed';
  modal.classList.remove('hidden');
  gameNameInput.focus();
}
function closeModal(){
  modal.classList.add('hidden');
  editingId = null;
  gameNameInput.value = '';
  gameURLInput.value = '';
}
function submitModal(){
  const name = gameNameInput.value.trim();
  let url = gameURLInput.value.trim();
  const prefer = preferEmbedSelect.value;
  if (!name || !url) return alert('Name and URL required');
  // Basic normalization: add protocol if missing
  if (!/^[a-zA-Z]+:\/\//.test(url)) url = 'https://' + url;
  if (editingId) {
    const g = games.find(x => x.id === editingId);
    if (g) {
      g.name = name;
      g.url = url;
      g.prefer = prefer;
    }
    saveGames();
    renderGames();
    closeModal();
    showToast('Updated');
  } else {
    const newG = { id: genId(), name, url, prefer };
    games.unshift(newG);
    saveGames();
    renderGames();
    closeModal();
    showToast('Added');
  }
}

// Render list
function renderGames(){
  gamesListEl.innerHTML = '';
  if (!games || games.length === 0) {
    gamesListEl.innerHTML = '<div class="game-card"><div>No games yet — add one!</div></div>';
    return;
  }
  for (const g of games) {
    const card = document.createElement('div');
    card.className = 'game-card';
    card.innerHTML = `
      <div class="card-left">
        <div class="game-icon">${escapeHtml(getInitials(g.name))}</div>
        <div>
          <div class="game-name">${escapeHtml(g.name)}</div>
          <div class="game-url" style="font-size:12px;color:var(--muted)">${escapeHtml(truncate(g.url,36))}</div>
        </div>
      </div>
      <div class="card-actions">
        <button class="small play">Play</button>
        <button class="small edit">Edit</button>
        <button class="small delete">Delete</button>
      </div>
    `;
    // events:
    card.querySelector('.play').addEventListener('click', () => loadGame(g.id));
    card.querySelector('.edit').addEventListener('click', () => openAddModal(g));
    card.querySelector('.delete').addEventListener('click', () => {
      if (!confirm('Delete "'+g.name+'"?')) return;
      games = games.filter(x => x.id !== g.id);
      saveGames();
      renderGames();
      if (activeGameId === g.id) clearPlayer();
    });
    gamesListEl.appendChild(card);
  }
}

// Player
function loadGame(id){
  const g = games.find(x => x.id === id);
  if (!g) return;
  activeGameId = id;
  activeTitle.textContent = g.name;
  // populate save text
  const saved = localStorage.getItem(SAVE_PREFIX + id);
  gameSaveText.value = saved !== null ? saved : '';

  // Decide whether to use iframe or fallback to new tab:
  if (g.prefer === 'newtab') {
    // open new tab and show message
    openInNewTab(g.url);
    // Clear iframe
    clearIframe();
    showToast('Opened in new tab (preferred)');
    return;
  }

  // Try to set iframe src
  frameOverlay.classList.add('hidden');
  gameFrame.src = g.url;

  // After load listener will check embeddability
}

function clearPlayer(){
  activeGameId = null;
  activeTitle.textContent = 'No game loaded';
  gameFrame.src = '';
  gameSaveText.value = '';
}

// If iframe blocked by X-Frame-Options/CSP, browsers often show a blank frame or error in console.
// Heuristic: after load, try to access contentDocument — if cross-origin we can't, but that doesn't mean it's blocked.
// Another heuristic: check the iframe's clientHeight or try to write a test in frame (not possible cross-origin).
// We'll detect embed failure by listening for 'load' then checking if frame's contentWindow length is available; if we get DOMException or the frame remains blank (offsetHeight == 0) we show overlay.
function checkIframeEmbeddable(){
  try {
    // If same-origin, accessing contentDocument is OK
    const doc = gameFrame.contentDocument;
    // If doc is null or body empty, this might be a block
    if (!doc || !doc.body || doc.body.innerHTML.trim() === '') {
      // Could still be a legit empty page—use overlay as hint
      frameOverlay.classList.remove('hidden');
      return;
    }
    frameOverlay.classList.add('hidden');
  } catch (err) {
    // Cross-origin — cannot inspect. But it may still be embeddable. We'll try a visual heuristic:
    // If iframe height is very small, assume blocked.
    const rect = gameFrame.getBoundingClientRect();
    if (rect.height < 10 || rect.width < 10) {
      frameOverlay.classList.remove('hidden');
    } else {
      // Can't be sure — hide overlay and let user interact. If embedding is blocked, the site may still show an error inside the iframe.
      frameOverlay.classList.add('hidden');
    }
  }
}

function clearIframe(){
  gameFrame.src = '';
  frameOverlay.classList.add('hidden');
}

function openInNewTab(url){
  window.open(url, '_blank', 'noopener');
}

// Storage
function loadGames(){
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      games = [];
      return;
    }
    games = JSON.parse(raw);
  } catch (err) {
    console.error('Failed to load games', err);
    games = [];
  }
}

function saveGames(){
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(games));
  } catch (err) {
    console.error('Save failed', err);
  }
}

// Utilities
function genId() {
  // simple unique id
  return 'g_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2,8);
}
function truncate(s, n){ return s.length > n ? s.slice(0,n-1)+'…' : s }
function getInitials(name){
  const parts = name.trim().split(/\s+/);
  return (parts[0]?.[0] || '?') + (parts[1]?.[0] || '');
}
function escapeHtml(s){ return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

function showToast(msg){
  // small feedback using native alert-alike but non-blocking
  const el = document.createElement('div');
  el.textContent = msg;
  el.style.position = 'fixed';
  el.style.right = '16px';
  el.style.bottom = '16px';
  el.style.padding = '10px 12px';
  el.style.background = 'linear-gradient(90deg,#10b981,#06b6d4)';
  el.style.color = '#032a2a';
  el.style.borderRadius = '10px';
  el.style.boxShadow = '0 6px 18px rgba(2,6,23,0.6)';
  document.body.appendChild(el);
  setTimeout(()=> el.style.transform = 'translateY(-6px)',50);
  setTimeout(()=> el.remove(), 1800);
}
