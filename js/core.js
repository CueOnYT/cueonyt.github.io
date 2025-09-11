const Core = {
  projects: [],
  currentProject: null,

  newProject() {
    const name = prompt("Enter project name:");
    if (!name) return;
    this.currentProject = { name, pages: [{ elements: [] }] };
    this.projects.push(this.currentProject);
    this.updatePageList();
    this.renderPage();
  },

  openProject() {
    alert("Project loading not implemented yet (coming soon).");
  },

  saveProject() {
    if (!this.currentProject) return alert("No project to save.");
    const data = JSON.stringify(this.currentProject);
    const blob = new Blob([data], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = this.currentProject.name + ".yearbook.json";
    a.click();
  },

  exportMenu() {
    alert("Export functions will be added later (PDF, PNG, Print).");
  },

  addPage() {
    if (!this.currentProject) return alert("Create a project first.");
    this.currentProject.pages.push({ elements: [] });
    this.updatePageList();
    this.renderPage();
  },

  updatePageList() {
    const list = document.getElementById("pageList");
    list.innerHTML = "";
    if (!this.currentProject) return;
    this.currentProject.pages.forEach((p, i) => {
      const btn = document.createElement("button");
      btn.textContent = "Page " + (i + 1);
      btn.onclick = () => {
        this.currentProject.currentPage = i;
        this.renderPage();
      };
      list.appendChild(btn);
    });
  },

  renderPage() {
    const canvas = document.getElementById("yearbookCanvas");
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#1e1e1e";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    if (!this.currentProject) return;
    const page = this.currentProject.pages[this.currentProject.currentPage || 0];
    page.elements.forEach(el => {
      if (el.type === "text") {
        ctx.font = el.size + "px " + (el.font || "Arial");
        ctx.fillStyle = el.color || "#fff";
        ctx.fillText(el.text, el.x, el.y);
      }
    });
  }
};
