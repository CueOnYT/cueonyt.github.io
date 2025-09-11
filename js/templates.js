const Templates = {
  insert(type) {
    if (!Core.currentProject) return alert("Create a project first.");
    const page = Core.currentProject.pages[Core.currentProject.currentPage || 0];
    if (type === "sports") {
      page.elements.push({ type: "text", text: "Team Roster", x: 300, y: 80, size: 30, color: "#ffcc00", font: "Georgia" });
    }
    if (type === "classroom") {
      page.elements.push({ type: "text", text: "Class of 2025", x: 280, y: 100, size: 28, color: "#00ccff", font: "Arial" });
    }
    if (type === "clubs") {
      page.elements.push({ type: "text", text: "Clubs & Activities", x: 260, y: 120, size: 26, color: "#99ff99", font: "Verdana" });
    }
    Core.renderPage();
  }
};
