function toggleInstructivo() {
  const instructivo = document.getElementById("instructivo");
  if (
    instructivo.style.display === "none" ||
    instructivo.style.display === ""
  ) {
    instructivo.style.display = "block";
    instructivo.scrollIntoView({ behavior: "smooth" });
  } else {
    instructivo.style.display = "none";
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
}

function generarPDF() {
  // Usamos la impresión del navegador; ahí eliges "Guardar como PDF"
  window.print();
}
