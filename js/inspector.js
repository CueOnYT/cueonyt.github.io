const Inspector = {
  show(el) {
    const insp = document.getElementById("inspector");
    insp.innerHTML = `
      <h3>Inspector</h3>
      <label>Font <select id="inspFont">
        <option>Arial</option><option>Georgia</option><option>Verdana</option>
      </select></label>
      <label>Size <input type="number" id="inspSize" value="${el.size || 20}"></label>
      <label>Color <input type="color" id="inspColor" value="${el.color || '#ffffff'}"></label>
      <label>X <input type="number" id="inspX" value="${el.x}"></label>
      <label>Y <input type="number" id="inspY" value="${el.y}"></label>
    `;
    document.getElementById("inspFont").value = el.font || "Arial";
    document.getElementById("inspFont").onchange = e => { el.font = e.target.value; Core.renderPage(); };
    document.getElementById("inspSize").oninput = e => { el.size = parseInt(e.target.value); Core.renderPage(); };
    document.getElementById("inspColor").oninput = e => { el.color = e.target.value; Core.renderPage(); };
    document.getElementById("inspX").oninput = e => { el.x = parseInt(e.target.value); Core.renderPage(); };
    document.getElementById("inspY").oninput = e => { el.y = parseInt(e.target.value); Core.renderPage(); };
  },
  clear() {
    document.getElementById("inspector").innerHTML = "<p>No element selected</p>";
  }
};
