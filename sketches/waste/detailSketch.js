// -------------------------------
// detailSketch.js
// -------------------------------

let dataTable;
let state, commodity;
let currentYear;
let years = [];

function preload() {
  const params = new URLSearchParams(window.location.search);
  state = params.get("country");
  currentYear = params.get("year");
  commodity = params.get("commodity");

  dataTable = loadTable("./assets/dataset/cleaned_dataset.csv", "csv", "header");
}

function setup() {
  createCanvas(700, 600);

  // ricava tutti gli anni disponibili
  for (let r = 0; r < dataTable.getRowCount(); r++) {
    const y = dataTable.getString(r, "year");
    if (!years.includes(y)) years.push(y);
  }
  years.sort();
}

function draw() {
  background(245);

  drawTitle();
  drawBackButton();
  drawTimeline();

  const wastePercent = getWastePercent(state, currentYear, commodity);

  drawBin(wastePercent);
}

// ---------------------------------------------
// Recupera % spreco per stato/anno/commodity
// ---------------------------------------------
function getWastePercent(state, year, commodity) {
  for (let r = 0; r < dataTable.getRowCount(); r++) {
    if (
      dataTable.getString(r, "country") === state &&
      dataTable.getString(r, "year") === year &&
      dataTable.getString(r, "commodity") === commodity
    ) {
      return float(dataTable.getString(r, "loss_percentage"));
    }
  }
  return 0;
}

// ---------------------------------------------
// Titolo
// ---------------------------------------------
function drawTitle() {
  fill(30);
  textSize(22);
  textAlign(CENTER, CENTER);
  text(
    `${commodity} — ${state} (${currentYear})`,
    width / 2,
    40
  );
}

// ---------------------------------------------
// Pulsante Torna indietro
// ---------------------------------------------
function drawBackButton() {
  const bx = 20;
  const by = 20;
  const bw = 120;
  const bh = 30;

  fill(230);
  stroke(60);
  rect(bx, by, bw, bh, 6);

  noStroke();
  fill(0);
  textSize(14);
  textAlign(CENTER, CENTER);
  text("⟵ Torna indietro", bx + bw / 2, by + bh / 2);

  if (
    mouseIsPressed &&
    mouseX > bx &&
    mouseX < bx + bw &&
    mouseY > by &&
    mouseY < by + bh
  ) {
    window.history.back();
  }
}

// ---------------------------------------------
// Timeline
// ---------------------------------------------
function drawTimeline() {
  const y = 560;

  fill(70);
  textSize(14);
  textAlign(LEFT, CENTER);
  text("Anno:", 40, y);

  let x = 110;
  for (let yr of years) {
    const isSelected = yr === currentYear;

    if (isSelected) {
      fill(20);
      stroke(20);
      rect(x - 10, y - 14, 40, 28, 5);
      fill(255);
    } else {
      noStroke();
      fill(100);
    }

    textAlign(CENTER, CENTER);
    text(yr, x + 10, y);

    // click
    if (
      mouseIsPressed &&
      mouseX > x - 10 &&
      mouseX < x + 30 &&
      mouseY > y - 14 &&
      mouseY < y + 14
    ) {
      currentYear = yr;
    }

    x += 60;
  }
}

// ---------------------------------------------
// Disegno cassonetto + grafico a torta
// ---------------------------------------------
function drawBin(percent) {
  push();
  translate(width / 2, height / 2);

  // cassonetto (contorno)
  fill(200);
  stroke(60);
  strokeWeight(4);
  ellipse(0, 0, 300, 220);

  // grafico a torta interno
  const angle = percent * TWO_PI;

  fill(120, 170, 255);
  noStroke();
  arc(0, 0, 240, 160, -HALF_PI, -HALF_PI + angle, PIE);

  pop();

  // testo sotto
  fill(30);
  textSize(18);
  textAlign(CENTER, CENTER);
  text(`Spreco: ${(percent * 100).toFixed(1)}%`, width / 2, height - 120);
}
