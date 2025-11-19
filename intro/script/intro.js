// Costanti dei colori e dimensioni
const BG_COLOR = "#fefae0";
const FG_COLOR = "#7f4f24";

// Fattore di ridimensionamento
let rf;

// Primo sketch: Titolo
function sketch0(p) {
	p.setup = () => {
		let canvas = p.createCanvas(p.windowWidth, p.windowHeight);
		canvas.parent("sketch0");
		rf = p.map(p.windowWidth, 600, 1200, 0.5, 1);
		p.noLoop();
	}

	p.draw = () => {
		p.background(BG_COLOR);
		p.textFont("Georgia");
		p.fill(FG_COLOR);
		p.noStroke();

		// Titolo principale
		p.textSize(60 * rf);
		p.textAlign(p.CENTER, p.CENTER);
		p.text("Food Waste", p.width / 2, p.height / 2 - 50);

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

// Secondo sketch: Info dataset
function sketch1(p) {
	p.setup = () => {
		let canvas = p.createCanvas(p.windowWidth, p.windowHeight);
		canvas.parent("sketch1");
		p.noLoop();
	}

	p.draw = () => {
		p.background(BG_COLOR);
		p.textFont("Georgia");
		p.noStroke();
		p.fill(FG_COLOR);

		// Titolo sezione
		p.textSize(32 * rf);
		p.textAlign(p.CENTER, p.CENTER);
		p.text("About the Dataset", p.width / 2, p.height / 2 - 150);

		// Info dataset
		p.textSize(18 * rf);
		p.textAlign(p.CENTER, p.CENTER);
		p.text(
			"• Food loss percentage data from 150+ countries\n\n" +
			"• 16 different food commodities tracked\n\n" +
			"• Yearly data from 2005 to 2022\n\n" +
			"• Visualize patterns in food waste across nations",
			p.width / 2, p.height / 2
		);
	}

	p.windowResized = () => {
		p.resizeCanvas(p.windowWidth, p.windowHeight);
	}
}
new p5(sketch1);

// Freccia scroll (semplificata)
function createScrollButton(p) {
	p.stroke(FG_COLOR);
	p.strokeWeight(3);
	p.line(p.width / 2 - 15, p.height - 60, p.width / 2, p.height - 40);
	p.line(p.width / 2 + 15, p.height - 60, p.width / 2, p.height - 40);
}