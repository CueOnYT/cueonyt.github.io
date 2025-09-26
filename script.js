async function loadGames() {
  const res = await fetch("games.json");
  const games = await res.json();

  const list = document.getElementById("gamesList");
  const title = document.getElementById("gameTitle");
  const frame = document.getElementById("gameFrame");

  games.forEach(game => {
    const btn = document.createElement("button");
    btn.textContent = game.name;
    btn.onclick = () => {
      title.textContent = game.name;
      frame.src = game.file;
    };
    list.appendChild(btn);
  });
}

loadGames();
