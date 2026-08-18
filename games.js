const games = [

  {
    title: "Your First Game",
    description: "Description of your game.",
    page: "your-game.html",
    github: "https://github.com/yourusername/your-game"
  },

  {
    title: "Another Game",
    description: "Another game description.",
    page: "another-game.html",
    github: "https://github.com/yourusername/another-game"
  }

];

const list = document.getElementById("games-list");

games.forEach((game, index) => {

  const card = document.createElement("article");

  card.className = "game-card";

  card.innerHTML = `

    <div>
      <small>${String(index + 1).padStart(2, "0")}</small>

      <h2>${game.title}</h2>

      <p>${game.description}</p>
    </div>

    <div class="game-buttons">

      <a href="${game.page}" class="button">
        Open Game ↗
      </a>

      ${
        game.github
        ? `
          <a
            href="${game.github}"
            target="_blank"
            class="button secondary"
          >
            GitHub ↗
          </a>
        `
        : ""
      }

    </div>

  `;

  list.appendChild(card);

});
