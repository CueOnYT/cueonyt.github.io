// ==UserScript==
// @name         Doge Miner Modded Mode
// @version      1.0
// @description  Fully modded Doge Miner: additive money, grant items/upgrades, persistent mode
// ==/UserScript==

(function() {
    'use strict';

    // Create Modded Mode UI
    const modContainer = document.createElement('div');
    modContainer.id = 'modded-mode';
    modContainer.style.position = 'fixed';
    modContainer.style.top = '10px';
    modContainer.style.right = '10px';
    modContainer.style.width = '400px';
    modContainer.style.maxHeight = '80vh';
    modContainer.style.overflowY = 'auto';
    modContainer.style.background = 'rgba(255, 255, 255, 0.95)';
    modContainer.style.border = '2px solid #ffcc00';
    modContainer.style.padding = '10px';
    modContainer.style.zIndex = '9999';
    modContainer.style.fontFamily = 'Arial, sans-serif';
    modContainer.style.fontSize = '14px';
    modContainer.innerHTML = `
        <h2 style="margin:5px 0;">DOGE MINER MODDED MODE</h2>
        <button id="closeMod" style="float:right;">Close</button>
        <div>
            <h3>Money Control</h3>
            <input id="addMoneyInput" type="number" placeholder="Amount to add" style="width:150px"/>
            <button id="addMoneyBtn">Add Money</button>
            <label><input type="checkbox" id="persistentMoney"/> Persistent Mode</label>
        </div>
        <div>
            <h3>Items / Upgrades</h3>
            <input id="searchItem" type="text" placeholder="Search items..." style="width:95%"/>
            <div id="itemsList" style="max-height:300px; overflow-y:auto; border:1px solid #ccc; padding:5px;"></div>
        </div>
        <div>
            <h3>Extras</h3>
            <button id="grantAllBtn">Grant All Items/Upgrades</button>
        </div>
    `;

    document.body.appendChild(modContainer);

    document.getElementById('closeMod').onclick = () => modContainer.style.display = 'none';

    // Helper: get game data
    function getGameData() {
        // Replace this with your actual game data paths
        return {
            moneyElem: document.querySelector('#mined strong'),
            savedata: window.savedata || window.game || {}
        };
    }

    // Add Money Button
    document.getElementById('addMoneyBtn').onclick = () => {
        const amount = parseInt(document.getElementById('addMoneyInput').value);
        if (isNaN(amount)) return alert('Enter a valid number');
        const { moneyElem, savedata } = getGameData();
        const current = parseInt(moneyElem.textContent.replace(/,/g, '')) || 0;
        const newAmount = current + amount;
        moneyElem.textContent = newAmount.toLocaleString();

        // Update savedata if exists
        if (savedata.coins !== undefined) savedata.coins = newAmount;
        if (document.getElementById('persistentMoney').checked) {
            localStorage.setItem('persistentMoney', newAmount);
        }
    };

    // Load persistent money
    const persistValue = localStorage.getItem('persistentMoney');
    if (persistValue) {
        const { moneyElem, savedata } = getGameData();
        moneyElem.textContent = parseInt(persistValue).toLocaleString();
        if (savedata.coins !== undefined) savedata.coins = parseInt(persistValue);
    }

    // Auto detect all items/upgrades
    function populateItems() {
        const itemsContainer = document.getElementById('itemsList');
        itemsContainer.innerHTML = '';

        const { savedata } = getGameData();
        const allItems = savedata.items || savedata.upgrades || {};

        Object.keys(allItems).forEach(code => {
            const amount = allItems[code] || 0;
            const itemDiv = document.createElement('div');
            itemDiv.style.borderBottom = '1px solid #ccc';
            itemDiv.style.padding = '2px';
            itemDiv.innerHTML = `
                <strong>${code}</strong> - Current: ${amount}
                <input type="number" style="width:60px" placeholder="Amount" class="grantInput"/>
                <button class="grantBtn" data-code="${code}">Grant</button>
            `;
            itemsContainer.appendChild(itemDiv);
        });

        // Grant Button
        itemsContainer.querySelectorAll('.grantBtn').forEach(btn => {
            btn.onclick = () => {
                const code = btn.dataset.code;
                const input = btn.previousElementSibling;
                let grantAmount = parseInt(input.value);
                if (isNaN(grantAmount)) return alert('Enter a valid number');
                allItems[code] += grantAmount;
                input.value = '';
                populateItems();
            };
        });
    }

    populateItems();

    // Search filter
    document.getElementById('searchItem').oninput = (e) => {
        const filter = e.target.value.toLowerCase();
        const divs = document.querySelectorAll('#itemsList > div');
        divs.forEach(d => {
            d.style.display = d.innerText.toLowerCase().includes(filter) ? 'block' : 'none';
        });
    };

    // Grant All Items Button
    document.getElementById('grantAllBtn').onclick = () => {
        const { savedata } = getGameData();
        Object.keys(savedata.items || savedata.upgrades || {}).forEach(code => {
            savedata.items[code] += 1;
        });
        populateItems();
        alert('All items/upgrades granted +1!');
    };

})();
