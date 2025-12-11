function addCoins() {
    try {
        let saveObject = _0m(0, 0, 42);         // might need (global ID, player ID, save slot ID)
        saveObject._J1 = saveObject._J1 + 10000;
        alert("Added 10,000 coins!");
    } catch (e) {
        alert("Could not modify coins.");
        console.error(e);
    }
}
