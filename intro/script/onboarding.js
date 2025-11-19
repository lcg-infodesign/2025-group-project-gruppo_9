// Tracciamento sketch
let currentSketch = 0;
const totalSketches = 1; // Solo 2 sketch: 0 e 1

// Array degli sketch
let sketches = document.getElementsByClassName("sketch");

// Bottone per lo sketch seguente
let forwardButton = document.getElementById("forward");
forwardButton.addEventListener("click", () => {
    changeSketch(currentSketch + 1);    
});

// Gestione della pressione delle frecce
function arrows(event) {
    if (event.repeat) return;
    if (event.key === 'ArrowDown' && currentSketch < totalSketches) {
        changeSketch(currentSketch + 1);
    } else if (event.key === "ArrowUp" && currentSketch > 0) {
        changeSketch(currentSketch - 1);
    }
}
document.addEventListener("keydown", arrows);

// Funzione per il cambio di sketch
function changeSketch(selectedSketch) {
    if(selectedSketch !== currentSketch && selectedSketch <= totalSketches) {
        // Gestione bottone "Show Matrix"
        if(selectedSketch === 1) {
            forwardButton.style.display = "none";
            document.getElementById("leave").style.display = "block";
        } else {
            forwardButton.style.display = "block";
            document.getElementById("leave").style.display = "none";
        }

        // Sketch selezionato non più nascosto
        sketches[selectedSketch].hidden = false;

        // Animazioni
        sketches[currentSketch].classList.add("fade-out-class");
        sketches[selectedSketch].classList.add("fade-in-class");

        // Disattiva bottoni durante animazione
        forwardButton.disabled = true;

        // Rimozione sketch precedente
        setTimeout(() => {
            sketches[currentSketch].hidden = true;
            sketches[currentSketch].classList.remove("fade-out-class");
        }, 500);

        // Completa animazione
        setTimeout(() => {
            sketches[selectedSketch].classList.remove("fade-in-class");
            currentSketch = selectedSketch;
        }, 600);

        // Riattiva bottoni
        setTimeout(() => {
            forwardButton.disabled = false;
        }, 700);
    }
}

// Inizializza
document.addEventListener('DOMContentLoaded', function() {
    document.getElementById("leave").style.display = "none";
});