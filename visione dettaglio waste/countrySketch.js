function setup() {

  /* ---- CREA CANVAS DENTRO IL CONTAINER HTML ---- */
  let cnv = createCanvas(windowWidth, 600);
  cnv.parent("canvasContainer");

  /* ---- CARICA DATI E UI ---- */
  loadData();
  setupCountrySelect();
  setupTimeline();

  /* ---- AGGIORNA SCENA ---- */
  updateVisualization();
}


let table;
let data = [];
let countries = [];

let selectedCountry = "";
let selectedYear = 2005;

let items = []; 

function preload() {
  // CSV nella stessa cartella dello sketch
  table = loadTable("cleaned_dataset.csv", "csv", "header");
}



function draw() {
  background(245);

  drawBasketPlaceholder();
  drawCommodityCircles();
  drawTooltip();
}

/* ------------------ CARICAMENTO DATI ------------------- */

function loadData() {
  data = table.getRows().map(r => ({
    country: r.get("country"),
    commodity: r.get("commodity"),
    year: int(r.get("year")),
    loss: float(r.get("loss_percentage"))
  }));

  countries = [...new Set(data.map(d => d.country))];
}

/* ------------------ UI ------------------- */

function setupCountrySelect() {
  let sel = document.getElementById("countrySelect");
  sel.innerHTML = "";

  countries.forEach(c => {
    let option = document.createElement("option");
    option.value = c;
    option.textContent = c;
    sel.appendChild(option);
  });

  selectedCountry = countries[0];
  sel.value = selectedCountry;

  sel.addEventListener("change", () => {
    selectedCountry = sel.value;
    updateVisualization();
  });
}

function setupTimeline() {
  let slider = document.getElementById("yearSlider");
  slider.addEventListener("input", () => {
    selectedYear = int(slider.value);
    updateVisualization();
  });

  let marks = document.getElementById("yearMarks");
  marks.innerHTML = "";

  for (let y = 2005; y <= 2022; y++) {
    let div = document.createElement("div");
    div.textContent = y;
    marks.appendChild(div);
  }
}

/* ------------------ UPDATE SCENA ------------------- */

function updateVisualization() {
  document.getElementById("title").textContent =
    selectedCountry + " – " + selectedYear;

  let filtered = data.filter(
    d => d.country === selectedCountry && d.year === selectedYear
  );

  items = [];

  let centerX = width / 2;
  let centerY = height / 2 - 40;
  let radius = 170;

  for (let i = 0; i < filtered.length; i++) {
    let d = filtered[i];
    let ang = map(i, 0, filtered.length, 0, TWO_PI);

    let size = map(d.loss, 0, 20, 40, 150);

    let x = centerX + cos(ang) * radius;
    let y = centerY + sin(ang) * radius;

    // colore random stabile
    let col = color(
      (d.commodity.length * 40) % 255,
      (d.commodity.length * 80) % 255,
      (d.commodity.length * 120) % 255
    );

    items.push({
      commodity: d.commodity,
      loss: d.loss,
      x,
      y,
      size,
      col
    });
  }

  createBottomBins(filtered);
}

/* ------------------ DISEGNO ------------------- */

function drawBasketPlaceholder() {
  push();
  noStroke();
  fill(200);
  ellipse(width / 2, height / 2 + 60, 220, 220);
  pop();
}

function drawCommodityCircles() {
  for (let it of items) {
    push();
    fill(it.col);
    noStroke();
    ellipse(it.x, it.y, it.size, it.size);
    pop();
  }
}

/* ------------------ CESTINI SOTTO ------------------- */

function createBottomBins(list) {
  let container = document.getElementById("bottomScroll");
  container.innerHTML = "";
  container.style.paddingLeft = "20px";


  list.forEach(d => {
    let wrap = document.createElement("div");
    wrap.className = "bottomBinWrapper";

    let box = document.createElement("div");
    box.className = "bottomBin";

    let fill = document.createElement("div");
    fill.className = "bottomFill";
    fill.style.height = (d.loss * 2) + "%";

    let label = document.createElement("div");
    label.className = "bottomLabel";
    label.textContent = d.commodity + " (" + d.loss + "%)";

    box.appendChild(fill);
    wrap.appendChild(box);
    wrap.appendChild(label);
    container.appendChild(wrap);
  });
}


/* ------------------ TOOLTIP ------------------- */

let hoveredItem = null;

function drawTooltip() {
  hoveredItem = null;

  for (let it of items) {
    let d = dist(mouseX, mouseY, it.x, it.y);
    if (d < it.size / 2) hoveredItem = it;
  }

  let tip = document.getElementById("tooltip");

  if (hoveredItem) {
    tip.style.display = "block";
    tip.style.left = mouseX + 15 + "px";
    tip.style.top = mouseY + 15 + "px";
    tip.innerHTML = `<b>${hoveredItem.commodity}</b><br>${hoveredItem.loss}%`;
  } else {
    tip.style.display = "none";
  }
}

function windowResized() {
  resizeCanvas(windowWidth, 600);
  updateVisualization();
}
