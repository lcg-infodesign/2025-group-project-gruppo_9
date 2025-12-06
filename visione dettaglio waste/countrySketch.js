// ===== VARIABILI GLOBALI E CONFIGURAZIONE =====

// Riferimento canvas
let cnv;

// Dati
let table;
let data = [];
let countries = [];
let commodities = [];

// Stato
let selectedCountry = "";
let selectedYear = null;

// Immagini
const ASSETS_BASE = "assets/img/";
let img_empty = null;
let img_over = null;
let img_basket = null;
let img_nodata = null;
let commodityImgs = {};

// Parametri visivi
const INTERNAL_NOMINAL_W = 90;
const INTERNAL_NOMINAL_H = 112;

// Nuovo layout semplificato
const TARGET_CELL_WIDTH = 300;
const CELL_SPACING = 25;
const SIDE_MARGIN = 30;

// Colore riempimento
const LEVEL2_COLOR = [220, 60, 90, 220];


// ===== Utility =====
function normalizeFilename(name) {
  if (!name) return "";
  return name.toLowerCase().trim()
    .replace(/\s+/g, "*")
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9*-]/g, "");
}

function loadImageSafe(path, cb) {
  loadImage(path, img => cb && cb(img), () => cb && cb(null));
}


// ===== PRELOAD =====
function preload() {
  table = loadTable(
    "cleaned_dataset.csv",
    "csv",
    "header",
    () => console.log("CSV caricato", table.getRowCount()),
    (err) => console.error("Errore CSV", err)
  );

  loadImageSafe(ASSETS_BASE + "empty.basket.png", img => img_empty = img);
  loadImageSafe(ASSETS_BASE + "over.basket.png", img => img_over = img);
  loadImageSafe(ASSETS_BASE + "basket.png", img => img_basket = img);
  loadImageSafe(ASSETS_BASE + "nodatafound.png", img => img_nodata = img);
}


// ===== SETUP =====
function setup() {
  cnv = createCanvas(windowWidth, windowHeight);
  cnv.parent("canvasContainer");

  clear();
  noStroke();
  textFont("Inter, Arial, sans-serif");

  parseCSV();
  setupCountrySelect();
  setupTimelineUI();

  // carica icone commodity
  for (let c of commodities) {
    const norm = normalizeFilename(c);
    loadImageSafe(ASSETS_BASE + norm + ".png", img => commodityImgs[norm] = img || null);
  }

  applyUrlParams();

  if (!selectedCountry && countries.length > 0) {
    selectedCountry = countries[0];
    const sel = document.getElementById("countrySelect");
    if (sel) sel.value = selectedCountry;
  }

  if (!selectedYear) {
    const sl = document.getElementById("yearSlider");
    if (sl) selectedYear = parseInt(sl.value);
  }

  updateVisualization();
}


// ===== PARSING CSV =====
function parseCSV() {
  data = [];
  commodities = [];
  countries = [];

  if (!table) return;

  for (let i = 0; i < table.getRowCount(); i++) {
    const row = table.getRow(i);
    const country = row.getString("country");
    const commodity = row.getString("commodity");
    const year = parseInt(row.getString("year"));

    let loss = parseFloat(String(row.getString("loss_percentage")).replace(",", "."));
    loss = isNaN(loss) ? NaN : loss;

    data.push({ country, commodity, year, loss });

    if (commodity && !commodities.includes(commodity)) commodities.push(commodity);
    if (country && !countries.includes(country)) countries.push(country);
  }

  countries.sort();
  commodities.sort();
}


// ===== UI =====
function setupCountrySelect() {
  const sel = document.getElementById("countrySelect");
  if (!sel) return;

  sel.innerHTML = "";
  for (let c of countries) {
    const opt = document.createElement("option");
    opt.value = c;
    opt.textContent = c;
    sel.appendChild(opt);
  }

  sel.addEventListener("change", () => {
    selectedCountry = sel.value;
    updateVisualization();
  });

  if (countries.length > 0) sel.value = countries[0];
}

function setupTimelineUI() {
  const slider = document.getElementById("yearSlider");
  if (!slider) return;

  const years = Array.from(new Set(data.map(d => d.year)))
    .filter(y => !isNaN(y))
    .sort((a, b) => a - b);

  if (years.length > 0) {
    slider.min = Math.min(...years);
    slider.max = Math.max(...years);
    if (!slider.value) slider.value = slider.max;
  }

  slider.addEventListener("input", e => {
    selectedYear = parseInt(e.target.value);
    const lab = document.getElementById("yearLabel");
    if (lab) lab.textContent = selectedYear;
    updateVisualization();
  });

  setupKeyboardNavigation(slider);
}

function setupKeyboardNavigation(slider) {
  window.addEventListener("keydown", e => {
    const minY = parseInt(slider.min);
    const maxY = parseInt(slider.max);

    if (e.key === "ArrowLeft") selectedYear = Math.max(minY, selectedYear - 1);
    else if (e.key === "ArrowRight") selectedYear = Math.min(maxY, selectedYear + 1);
    else return;

    slider.value = selectedYear;
    const lab = document.getElementById("yearLabel");
    if (lab) lab.textContent = selectedYear;
    updateVisualization();
  });
}

function updateVisualization() {
  const t = document.getElementById("title");
  if (t) t.textContent = `${selectedCountry || "—"} ${selectedYear || ""}`;
}


// ===== DRAW =====
function draw() {
  if (!img_empty) return;

  clear();

  const header = document.getElementById("headerBar");
  const headerHeight = header ? header.getBoundingClientRect().height : 0;
  const topY = headerHeight + 20;

  drawFlexGrid(commodities, topY);
}


// ===== FLEX GRID SEMPLIFICATO =====
function drawFlexGrid(items, startY) {
  let x = SIDE_MARGIN;
  let y = startY;
  const maxW = width - SIDE_MARGIN -10;

  for (let item of items) {
    const w = TARGET_CELL_WIDTH;
    const h = Math.round(w * (INTERNAL_NOMINAL_H / INTERNAL_NOMINAL_W));

    if (x + w > maxW) {
      x = SIDE_MARGIN;
      y += h + CELL_SPACING;
    }

    drawComplexCell(item, x, y, w, h);

    x += w + CELL_SPACING;
  }

  if (height < y + 300) resizeCanvas(windowWidth, y + 300);
}


// ===== DRAW COMPLEX CELL =====
function drawComplexCell(commodityName, x, y, w, h) {

  push();
  noFill();
  stroke(0, 12);
  strokeWeight(0);
  rect(x, y, w, h, 8);

  const pb = 30;
  const availW = w - pb * 4;
  const availH = h - pb * 4;

  let baseW = availW;
  let baseH = availH;

  if (img_empty && img_empty.width) {
    const scale = Math.min(availW / img_empty.width, availH / img_empty.height);
    baseW = Math.round(img_empty.width * scale);
    baseH = Math.round(img_empty.height * scale);
  }

  const baseX = x + (w - baseW) / 2;
  const baseY = y + (h - baseH) / 2;

  const rowData = data.find(d =>
    d.country === selectedCountry &&
    d.year === selectedYear &&
    d.commodity === commodityName
  );

  // === NO DATA ===
  if (!rowData) {
    if (img_basket && img_basket.width) {
      const s = Math.min(availW / img_basket.width, availH / img_basket.height);
      const bw = Math.round(img_basket.width * s);
      const bh = Math.round(img_basket.height * s);
      image(img_basket, x + (w - bw)/2, y + (h - bh)/2, bw, bh);
    }

    if (img_nodata && img_nodata.width) {
      const s2 = Math.min(baseW / img_nodata.width, baseH / img_nodata.height);
      const nw = Math.round(img_nodata.width * s2);
      const nh = Math.round(img_nodata.height * s2);
      image(img_nodata, x + w/2 - nw/2, y + h/2 - nh/2);
    } else {
      fill(100);
      noStroke();
      textAlign(CENTER, CENTER);
      textSize(14);
      text("No data", x + w/2, y + h/2);
    }

    pop();
    return;
  }

  // === BASKET EMPTY BASE ===
  imageMode(CORNER);
  if (img_empty && img_empty.width)
    image(img_empty, baseX, baseY, baseW, baseH);


  // === FILL LEVEL ===
  const pct = isNaN(rowData.loss) ? 0 : Math.max(0, Math.min(100, rowData.loss));

  const nominalW = INTERNAL_NOMINAL_W+50;
  const nominalH = INTERNAL_NOMINAL_H + 50;
  const scaleInner = Math.min(1, baseW / (nominalW + 12), baseH / (nominalH + 12));
  const innerW = Math.round(nominalW * scaleInner);
  const innerH = Math.round(nominalH * scaleInner)+5;
  const innerX = baseX + Math.round((baseW - innerW) / 2);
  const innerBottomY = baseY + baseH - Math.round(innerH * 0.08)+5;

  const fillH = Math.round(innerH * (pct / 100));
  let fillY = innerBottomY - fillH - 18;

  const innerTopY = innerBottomY - innerH;
  if (fillY < innerTopY) fillY = innerTopY;

  push();
  noStroke();
  fill(...LEVEL2_COLOR);
  rect(innerX, fillY, innerW, fillH, 4);
  pop();


  // === BASKET OVERLAY ===
  if (img_over && img_over.width)
    image(img_over, baseX, baseY, baseW, baseH);


  // === ICONA ===
  const norm = normalizeFilename(commodityName);
  const iconImg = commodityImgs[norm] || null;
  if (iconImg && iconImg.width) {
    const maxIconW = Math.round(w * 0.36);
    const iconScale = Math.min(maxIconW / iconImg.width, (h * 0.28) / iconImg.height);
    const iw = Math.round(iconImg.width * iconScale);
    const ih = Math.round(iconImg.height * iconScale);
    imageMode(CENTER);
    image(iconImg, x + w/2, baseY - ih * 0.28, iw, ih);
  } else {
    push();
    fill(0, 120);
    noStroke();
    textSize(12);
    textAlign(CENTER, CENTER);
    text(commodityName, x + w/2, baseY - 12);
    pop();
  }

  pop();
}


// ===== RESIZE =====
function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}


// ===== URL PARAMS =====
function getUrlParams() {
  const urlParams = new URLSearchParams(window.location.search);
  const country = urlParams.get("country");
  const year = urlParams.get("year");

  return {
    country: country,
    year: year ? parseInt(year) : null
  };
}

function applyUrlParams() {
  const params = getUrlParams();

  if (params.country) {
    selectedCountry = params.country;
    const countrySelect = document.getElementById("countrySelect");
    if (countrySelect) countrySelect.value = selectedCountry;
  }

  if (params.year) {
    selectedYear = params.year;
    const yearSlider = document.getElementById("yearSlider");
    const yearLabel = document.getElementById("yearLabel");

    if (yearSlider) yearSlider.value = selectedYear;
    if (yearLabel) yearLabel.innerText = selectedYear;
  }

  updateVisualization();
}
