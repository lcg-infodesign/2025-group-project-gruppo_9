// Costanti dei colori e dimensioni
const BG_COLOR = "#ffffffff";
const FG_COLOR = "#292929ff";

// Fattore di ridimensionamento
let rf;
let typewriterSpeed = 30; // ms per carattere

// Primo sketch: Titolo (senza typewriter)
function sketch0(p) {

	p.setup = () => {
		let canvas = p.createCanvas(p.windowWidth, p.windowHeight);
		canvas.parent("sketch0");
		rf = p.map(p.windowWidth, 600, 1200, 0.5, 1);
		p.noLoop();
	}

	p.draw = () => {
		p.background(BG_COLOR); 

		p.fill(FG_COLOR);
		p.noStroke();

		// Titolo principale
		p.textSize(60 * rf);
		p.textAlign(p.CENTER, p.CENTER);
		p.text("Global Food Waste", p.width / 2, p.height / 2 - 50);

		// Sottotitolo
		p.textSize(18 * rf);
		p.text("Dataset della FAO sullo spreco alimentare", p.width / 2, p.height / 2 + 20);

		// Freccia scroll down
		createScrollButton(p);
	}

	p.windowResized = () => {
		rf = p.map(p.windowWidth, 600, 1200, 0.5, 1);
		rf = p.constrain(rf, 0.5, 1);
		p.resizeCanvas(p.windowWidth, p.windowHeight);
	}
}
new p5(sketch0);

// Secondo sketch
function sketch1(p) {
    let displayText = "";
    let fullText = 'Sappiamo davvero cosa significa spreco alimentare?\n' +
                    'Sappiamo quanto cibo viene perso prima ancora di arrivare nei nostri piatti?\n' +
                    'Sappiamo quali alimenti si disperdono di più… e dove?\n'+
                    'Ma soprattutto: sappiamo quante cose non sappiamo?';
    let typing = false;
    let hasTyped = false;
    let typingComplete = false; // NUOVA VARIABILE
	let bgImage;

	p.preload = () => {
		bgImage = p.loadImage("assets/img/sfondoQuadri.png");
	}

    p.setup = () => {
        let canvas = p.createCanvas(p.windowWidth, p.windowHeight);
        canvas.parent("sketch1");
        p.noLoop();
        
        // Salva l'istanza per controllo esterno
        window.sketch1Instance = {
            startTyping: () => {
                if (!hasTyped) {
                    startTyping();
                    hasTyped = true;
                }
            },
            isTypingComplete: () => typingComplete // NUOVA FUNZIONE
        };
    }

    p.draw = () => {
        p.background(BG_COLOR);
        p.textFont("Georgia");
        p.noStroke();
        p.fill(FG_COLOR);

        // Testo con typewriter
        p.textSize(18 * rf);
        p.textAlign(p.CENTER, p.CENTER);
        p.text(displayText, p.width / 2, p.height / 2);

        // MOSTRA SEMPRE LA FRECCETTA SCROLL - I BOTTONI REALI SONO GESTITI DA NAVIGATION.JS
        //createScrollButton(p);
    }

    function startTyping() {
        typing = true;
        typingComplete = false; // Reset
        displayText = "";
        let index = 0;
        
        function type() {
            if (index < fullText.length) {
                displayText += fullText.charAt(index);
                index++;
                p.redraw();
                setTimeout(type, typewriterSpeed);
            } else {
                typing = false;
                typingComplete = true; // Imposta completo
                p.redraw(); // Ridisegna per mostrare il bottone
                
                // Notifica la navigation che il typing è completo
                if (window.onTypingComplete) {
                    window.onTypingComplete();
                }
            }
        }
        type();
    }

    p.windowResized = () => {
        p.resizeCanvas(p.windowWidth, p.windowHeight);
    }
}
new p5(sketch1);

// Freccia scroll
function createScrollButton(p) {
	p.stroke(FG_COLOR);
	p.strokeWeight(3);
	p.line(p.width / 2 - 15, p.height - 60, p.width / 2, p.height - 40);
	p.line(p.width / 2 + 15, p.height - 60, p.width / 2, p.height - 40);
}