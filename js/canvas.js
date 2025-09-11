const Canvas = {
  init() {
    this.canvas = document.getElementById("yearbookCanvas");
    this.ctx = this.canvas.getContext("2d");
    this.selectedElement = null;

    this.canvas.addEventListener("click", e => {
      this.selectAt(e.offsetX, e.offsetY);
    });

    Core.renderPage();
  },

  selectAt(x, y) {
    const page = Core.currentPage();
    if (!page) return;
    // Pick the last drawn element (top-most)
    for (let i = page.elements.length - 1; i >= 0; i--) {
      const el = page.elements[i];
      if (el.type === "text") {
        const w = this.ctx.measureText(el.text).width;
        const h = el.size;
        if (x >= el.x && x <= el.x + w && y <= el.y && y >= el.y - h) {
          this.selectedElement = el;
          Inspector.show(el);
          return;
        }
      }
      if (el.type === "img") {
        if (x >= el.x && x <= el.x + el.w && y >= el.y && y <= el.y + el.h) {
          this.selectedElement = el;
          Inspector.show(el);
          return;
        }
      }
    }
    this.selectedElement = null;
    Inspector.clear();
  }
};

