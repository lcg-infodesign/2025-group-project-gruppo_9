// Tracciamento sketch
let currentSketch = 0;
const totalSketches = 1; // SOLO 2 SKETCH: da 0 a 1

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

        // Completa animazione e avvia typewriter
        setTimeout(() => {
            sketches[selectedSketch].classList.remove("fade-in-class");
            currentSketch = selectedSketch;
            
            if(selectedSketch === 0) {
                // SKETCH 0: Mostra solo forward
                forwardButton.style.display = "block";
                document.getElementById("leave").style.display = "none";
            } else if(selectedSketch === 1) {
                // SKETCH 1: Nascondi tutto e avvia typewriter
                forwardButton.style.display = "none";
                document.getElementById("leave").style.display = "none";
                startTypewriterEffect(selectedSketch);
            }
        }, 600);

        // Riattiva bottoni
        setTimeout(() => {
            forwardButton.disabled = false;
        }, 700);
    }
}

// Funzione per avviare il typewriter
function startTypewriterEffect(sketchIndex) {
    switch(sketchIndex) {
        case 1:
            if (window.sketch1Instance) {
                window.sketch1Instance.startTyping();
                
                // Imposta callback per quando il typing è completo
                window.onTypingComplete = () => {
                    // Quando il typing finisce, mostra SOLO "Scopri di più"
                    document.getElementById("leave").style.display = "block";
                    forwardButton.style.display = "none"; // Assicurati che forward sia nascosto
                };
            }
            break;
    }
}

// Inizializza
document.addEventListener('DOMContentLoaded', function() {
    // All'inizio siamo sullo sketch 0, mostra solo forward
    forwardButton.style.display = "block";
    document.getElementById("leave").style.display = "none";
});
