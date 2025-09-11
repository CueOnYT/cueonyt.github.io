const Tour = {
  steps: [
    { msg: "Welcome to Cuemo's Tool! Let's take a quick tour." },
    { msg: "Use the New button to start a project." },
    { msg: "Add photos, text, and templates to your yearbook." },
    { msg: "Export your project as PDF, PNG, or print directly." }
  ],
  index: 0,
  start() {
    this.index = 0;
    this.next();
  },
  next() {
    if (this.index >= this.steps.length) return alert("Tour finished!");
    alert(this.steps[this.index].msg);
    this.index++;
    if (this.index < this.steps.length) this.next();
  }
};
