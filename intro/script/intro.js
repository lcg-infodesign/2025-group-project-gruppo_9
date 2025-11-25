// Costanti dei colori e dimensioni
const BG_COLOR = "#ffffffff";
const FG_COLOR = "#292929ff";
//const BG_COLOR = "#fefae0";
//const FG_COLOR = "#7f4f24";

// Fattore di ridimensionamento
let rf;
let typewriterSpeed = 30; // ms per carattere


// Primo sketch: Titolo (senza typewriter)
function sketch0(p) {
	let bgImage;

	p.preload = () => {
		bgImage = p.loadImage("assets/img/sfondoQuadri.png");
	}

	p.setup = () => {
		let canvas = p.createCanvas(p.windowWidth, p.windowHeight);
		canvas.parent("sketch0");
		rf = p.map(p.windowWidth, 600, 1200, 0.5, 1);
		p.noLoop();
	}

	p.draw = () => {
		// SFONDO CON IMMAGINE (semi-trasparente)
		p.background(BG_COLOR); // Colore di fallback
		if (bgImage) {
			p.tint(255, 150); // Trasparenza (0-255)
			p.imageMode(p.CORNER);
			
			// Adatta l'immagine alla finestra mantenendo le proporzioni
			let scale = Math.max(p.width / bgImage.width, p.height / bgImage.height);
			let scaledWidth = bgImage.width * scale;
			let scaledHeight = bgImage.height * scale;
			let x = (p.width - scaledWidth) / 2;
			let y = (p.height - scaledHeight) / 2;
			
			p.image(bgImage, x, y, scaledWidth, scaledHeight);
			p.noTint();
		}

		p.textFont("Georgia");
		p.fill(FG_COLOR);
		p.noStroke();

		// Titolo principale
		p.textSize(60 * rf);
		p.textAlign(p.CENTER, p.CENTER);
		p.text("Global Food Waste", p.width / 2, p.height / 2 - 50);

		// Sottotitolo
		p.textSize(18 * rf);
		p.text("FAO Dataset • 2005 - 2022", p.width / 2, p.height / 2 + 20);

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
	let bgImage;

	p.preload = () => {
		bgImage = p.loadImage("assets/img/sfondo.png");
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
            }
        };
    }

    p.draw = () => {
        // SFONDO CON IMMAGINE (semi-trasparente)
		p.background(BG_COLOR); // Colore di fallback
		if (bgImage) {
			p.tint(255, 150); // Trasparenza (0-255)
			p.imageMode(p.CORNER);
			
			// Adatta l'immagine alla finestra mantenendo le proporzioni
			let scale = Math.max(p.width / bgImage.width, p.height / bgImage.height);
			let scaledWidth = bgImage.width * scale;
			let scaledHeight = bgImage.height * scale;
			let x = (p.width - scaledWidth) / 2;
			let y = (p.height - scaledHeight) / 2;
			
			p.image(bgImage, x, y, scaledWidth, scaledHeight);
			p.noTint();
		}
        p.textFont("Georgia");
        p.noStroke();
        p.fill(FG_COLOR);

        // Testo con typewriter
        p.textSize(18 * rf);
        p.textAlign(p.CENTER, p.CENTER);
        p.text(displayText, p.width / 2, p.height / 2);

        // Freccia scroll down (AGGIUNTA)
        createScrollButton(p);
    }

    function startTyping() {
        typing = true;
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
            }
        }
        type();
    }

    p.windowResized = () => {
        p.resizeCanvas(p.windowWidth, p.windowHeight);
    }
}
new p5(sketch1);

// Terzo sketch
function sketch2(p) {
    let displayText = "";
    let fullText = "Perché nel mondo si spreca cibo, ma si spreca anche informazione:\ninteri paesi senza rilevazioni, fasi della filiera non misurate, cause mai registrate.\nIl risultato è un archivio pieno di vuoti, buchi, silenzi.";
    let typing = false;
    let hasTyped = false;
	let bgImage;

	p.preload = () => {
		bgImage = p.loadImage("assets/img/sfondo.png");
	}

    p.setup = () => {
        let canvas = p.createCanvas(p.windowWidth, p.windowHeight);
        canvas.parent("sketch2");
        p.noLoop();
        
        window.sketch2Instance = {
            startTyping: () => {
                if (!hasTyped) {
                    startTyping();
                    hasTyped = true;
                }
            }
        };
    }

    p.draw = () => {
        // SFONDO CON IMMAGINE (semi-trasparente)
		p.background(BG_COLOR); // Colore di fallback
		if (bgImage) {
			p.tint(255, 150); // Trasparenza (0-255)
			p.imageMode(p.CORNER);
			
			// Adatta l'immagine alla finestra mantenendo le proporzioni
			let scale = Math.max(p.width / bgImage.width, p.height / bgImage.height);
			let scaledWidth = bgImage.width * scale;
			let scaledHeight = bgImage.height * scale;
			let x = (p.width - scaledWidth) / 2;
			let y = (p.height - scaledHeight) / 2;
			
			p.image(bgImage, x, y, scaledWidth, scaledHeight);
			p.noTint();
		}
        p.textFont("Georgia");
        p.noStroke();
        p.fill(FG_COLOR);

        p.textSize(18 * rf);
        p.textAlign(p.CENTER, p.CENTER);
        p.text(displayText, p.width / 2, p.height / 2);

        // Freccia scroll down (AGGIUNTA)
        createScrollButton(p);
    }

    function startTyping() {
        typing = true;
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
            }
        }
        type();
    }

    p.windowResized = () => {
        p.resizeCanvas(p.windowWidth, p.windowHeight);
    }
}
new p5(sketch2);

// Quarto sketch
function sketch3(p) {
    let displayText = "";
    let fullText = "Questo sito nasce per esplorare proprio questo:\nperdita dopo perdita, dato dopo dato,\nfino a restituire una fotografia del problema e delle sue ombre.";
    let typing = false;
    let hasTyped = false;
	let bgImage;

	p.preload = () => {
		bgImage = p.loadImage("assets/img/sfondo.png");
	}

    p.setup = () => {
        let canvas = p.createCanvas(p.windowWidth, p.windowHeight);
        canvas.parent("sketch3");
        p.noLoop();
        
        window.sketch3Instance = {
            startTyping: () => {
                if (!hasTyped) {
                    startTyping();
                    hasTyped = true;
                }
            }
        };
    }

    p.draw = () => {
        // SFONDO CON IMMAGINE (semi-trasparente)
		p.background(BG_COLOR); // Colore di fallback
		if (bgImage) {
			p.tint(255, 150); // Trasparenza (0-255)
			p.imageMode(p.CORNER);
			
			// Adatta l'immagine alla finestra mantenendo le proporzioni
			let scale = Math.max(p.width / bgImage.width, p.height / bgImage.height);
			let scaledWidth = bgImage.width * scale;
			let scaledHeight = bgImage.height * scale;
			let x = (p.width - scaledWidth) / 2;
			let y = (p.height - scaledHeight) / 2;
			
			p.image(bgImage, x, y, scaledWidth, scaledHeight);
			p.noTint();
		}
        p.textFont("Georgia");
        p.noStroke();
        p.fill(FG_COLOR);

        p.textSize(18 * rf);
        p.textAlign(p.CENTER, p.CENTER);
        p.text(displayText, p.width / 2, p.height / 2);

        // Freccia scroll down (AGGIUNTA)
        createScrollButton(p);
    }

    function startTyping() {
        typing = true;
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
            }
        }
        type();
    }

    p.windowResized = () => {
        p.resizeCanvas(p.windowWidth, p.windowHeight);
    }
}
new p5(sketch3);

// Quinto sketch: Call to action
function sketch4(p) {
    let displayText = "";
    let fullText = "Per capire lo spreco alimentare, dobbiamo leggere ciò che c'è.\nE imparare da ciò che manca.";
    let typing = false;
    let hasTyped = false;
	let bgImage;

	p.preload = () => {
		bgImage = p.loadImage("assets/img/sfondo.png");
	}

    p.setup = () => {
        let canvas = p.createCanvas(p.windowWidth, p.windowHeight);
        canvas.parent("sketch4");
        p.noLoop();
        
        window.sketch4Instance = {
            startTyping: () => {
                if (!hasTyped) {
                    startTyping();
                    hasTyped = true;
                }
            }
        };
    }

    p.draw = () => {
        // SFONDO CON IMMAGINE (semi-trasparente)
		p.background(BG_COLOR); // Colore di fallback
		if (bgImage) {
			p.tint(255, 150); // Trasparenza (0-255)
			p.imageMode(p.CORNER);
			
			// Adatta l'immagine alla finestra mantenendo le proporzioni
			let scale = Math.max(p.width / bgImage.width, p.height / bgImage.height);
			let scaledWidth = bgImage.width * scale;
			let scaledHeight = bgImage.height * scale;
			let x = (p.width - scaledWidth) / 2;
			let y = (p.height - scaledHeight) / 2;
			
			p.image(bgImage, x, y, scaledWidth, scaledHeight);
			p.noTint();
		}
        p.textFont("Georgia");
        p.noStroke();
        p.fill(FG_COLOR);

        p.textSize(18 * rf);
        p.textAlign(p.CENTER, p.CENTER);
        p.text(displayText, p.width / 2, p.height / 2);

        // Freccia scroll down (AGGIUNTA)
        createScrollButton(p);
    }

    function startTyping() {
        typing = true;
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
            }
        }
        type();
    }

    p.windowResized = () => {
        p.resizeCanvas(p.windowWidth, p.windowHeight);
    }
}
new p5(sketch4);

// Freccia scroll
function createScrollButton(p) {
	p.stroke(FG_COLOR);
	p.strokeWeight(3);
	p.line(p.width / 2 - 15, p.height - 60, p.width / 2, p.height - 40);
	p.line(p.width / 2 + 15, p.height - 60, p.width / 2, p.height - 40);
}