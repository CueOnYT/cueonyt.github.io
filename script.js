/*
  CueMoo Website JavaScript

  ============================================================
  EASY GAME ADDING
  ============================================================

  Add another object to the "games" array.

  Example:

  {
    name: "My New Game",
    description: "A short description of my game.",
    page: "games/my-new-game.html",
    github: "https://github.com/USERNAME/REPOSITORY"
  }

  Then put "my-new-game.html" inside your /games/ folder.
*/


const games = [

  {
    name: "Example Game",

    description:
      "Replace this with your first game.",

    page:
      "games/example-game.html",

    github:
      "#"
  }

];



/*
  ============================================================
  RENDER GAMES
  ============================================================
*/

function renderGames() {

  const list =
    document.getElementById("game-list");

  if (!list) {
    return;
  }


  if (games.length === 0) {

    list.innerHTML = `
      <div class="card">
        <span class="eyebrow">
          No games yet
        </span>

        <h3>
          Nothing here yet.
        </h3>

        <p>
          Add your first game to the games array
          inside script.js.
        </p>
      </div>
    `;

    return;
  }


  list.innerHTML = games.map(
    (game, index) => {

      return `

        <div class="game-item">

          <a href="${game.page}">

            <span class="eyebrow">
              Game ${String(index + 1).padStart(2, "0")}
            </span>

            <h2>
              ${game.name}
            </h2>

            <p>
              ${game.description}
            </p>

          </a>


          <div class="game-links">

            <a
              class="small-button"
              href="${game.page}"
            >
              Play →
            </a>


            <a
              class="small-button"
              href="${game.github}"
              target="_blank"
              rel="noopener noreferrer"
            >
              GitHub
            </a>

          </div>

        </div>

      `;

    }
  ).join("");

}



/*
  ============================================================
  PUBLIC STATISTICS
  ============================================================

  IMPORTANT:

  These are currently DEMO numbers.

  GitHub Pages is static, so HTML/CSS/JavaScript alone cannot
  determine how many people are currently visiting your site.

  To make the numbers real, you will eventually need to connect
  this section to an analytics service or your own backend.

  The page is already designed to accept real data.
*/


function renderPublicStats() {

  const demoStats = {

    activeNow: 3,

    today: 27,

    week: 143,

    month: 512,

    year: 3821,

    allTime: 12840

  };


  Object.entries(demoStats).forEach(
    ([key, value]) => {

      const element =
        document.getElementById(key);

      if (element) {

        element.textContent =
          value.toLocaleString();

      }

    }
  );



  /*
    Demo graph data.

    Later, replace this array with real visitor data.
  */

  const activityData = [

    18,
    32,
    25,
    48,
    38,
    61,
    46,
    72,
    58,
    66,
    82,
    55,
    70,
    91

  ];


  const chart =
    document.getElementById("barChart");


  if (!chart) {
    return;
  }


  chart.innerHTML =
    activityData.map(
      value => {

        return `

          <div
            class="bar"
            style="height: ${value}%"
            title="${value} visitors"
          ></div>

        `;

      }
    ).join("");

}



/*
  ============================================================
  PAGE LOAD
  ============================================================
*/

document.addEventListener(
  "DOMContentLoaded",
  () => {

    document.body.classList.add("loaded");

    renderGames();

    renderPublicStats();

  }
); 
