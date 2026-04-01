function selectGame(gameName) {
    document.getElementById('selected-game-name').innerText = gameName;
    document.getElementById('game-selection').classList.add('hidden');
    document.getElementById('party-creation').classList.remove('hidden');
}

function createParty() {
    // Generate a random 6-character alphanumeric code
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    
    document.getElementById('invite-code').innerText = code;
    document.getElementById('party-creation').classList.add('hidden');
    document.getElementById('party-dashboard').classList.remove('hidden');
}

function resetParty() {
    document.getElementById('party-dashboard').classList.add('hidden');
    document.getElementById('game-selection').classList.remove('hidden');
}
