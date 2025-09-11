const Export = {
  showMenu() {
    const choice = prompt("Export as: PDF / PNG / Print ?");
    if (!choice) return;
    if (choice.toLowerCase() === "pdf") this.toPDF();
    if (choice.toLowerCase() === "png") this.toPNG();
    if (choice.toLowerCase() === "print") window.print();
  },

  toPDF() {
    import("https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js")
      .then(({ jsPDF }) => {
        const canvas = document.getElementById("yearbookCanvas");
        const img = canvas.toDataURL("image/png");
        const pdf = new jsPDF({ orientation: "portrait", unit: "px", format: [canvas.width, canvas.height] });
        pdf.addImage(img, "PNG", 0, 0, canvas.width, canvas.height);
        pdf.save("yearbook.pdf");
      });
  },

  toPNG() {
    const canvas = document.getElementById("yearbookCanvas");
    canvas.toBlob(blob => {
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "yearbook.png";
      a.click();
    });
  }
};
