const Canvas = {
  init() {
    this.canvas = document.getElementById("yearbookCanvas");
    this.ctx = this.canvas.getContext("2d");

    this.canvas.addEventListener("dblclick", e => {
      const text = prompt("Enter text:");
      if (text && Core.currentProject) {
        Core.currentProject.pages[Core.currentProject.currentPage || 0].elements.push({
          type: "text",
          text,
          x: e.offsetX,
          y: e.offsetY,
          size: 20,
          color: "#fff",
          font: "Arial"
        });
        Core.renderPage();
      }
    });
  }
};

window.onload = () => {
  Canvas.init();
};
