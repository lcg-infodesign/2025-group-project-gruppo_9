//  BACK TO TOP BUTTON 
const backToTopBtn = document.getElementById("backToTop");

// Mostra il bottone dopo un certo scroll
window.addEventListener("scroll", () => {
  if (window.scrollY > 400) {
    backToTopBtn.classList.add("show");
  } else {
    backToTopBtn.classList.remove("show");
  }
});

// Scroll fluido verso l'alto
backToTopBtn.addEventListener("click", () => {
  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
});
