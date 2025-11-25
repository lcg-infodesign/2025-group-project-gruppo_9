// Tracciamento sketch
let currentSketch = 0;
const totalSketches = 4; // 5 sketch: da 0 a 4

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
        // Gestione bottone "Show Matrix" (solo nell'ultima sezione)
        if(selectedSketch === totalSketches) {
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

        // Completa animazione e avvia typewriter
        setTimeout(() => {
            sketches[selectedSketch].classList.remove("fade-in-class");
            currentSketch = selectedSketch;
            
            // Avvia effetto macchina da scrivere per sketch 1-4
            if(selectedSketch >= 1 && selectedSketch <= 4) {
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
    // Forza il redraw dello sketch per avviare il typewriter
    switch(sketchIndex) {
        case 1:
            if (window.sketch1Instance) {
                window.sketch1Instance.startTyping();
            }
            break;
        case 2:
            if (window.sketch2Instance) {
                window.sketch2Instance.startTyping();
            }
            break;
        case 3:
            if (window.sketch3Instance) {
                window.sketch3Instance.startTyping();
            }
            break;
        case 4:
            if (window.sketch4Instance) {
                window.sketch4Instance.startTyping();
            }
            break;
    }
}

// Inizializza
document.addEventListener('DOMContentLoaded', function() {
    document.getElementById("leave").style.display = "none";
});