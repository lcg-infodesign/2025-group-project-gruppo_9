let cnv; // <--- reso globale per poter ridimensionare il canvas in draw
let table;
let data = [];
let countries = [];
let commodities = [];

let selectedCountry = "";
let selectedYear = null;

// images
const ASSETS_BASE = "assets/";
let img_empty = null;
let img_over = null;
let img_basket = null;
let img_nodata = null;
let commodityImgs = {};

// visual params
const COLS = 4;
const INTERNAL_NOMINAL_W = 90;
const INTERNAL_NOMINAL_H = 112;
const CELL_GAP = 60;//40
const CELL_PADDING = 40;//12
const LEVEL2_COLOR = [220, 60,90, 220];
//assicurarsi che i nomi vengano interpretati giusti
function normalizeFilename(name) {
  if (!name) return "";
  return name.toLowerCase().trim()
    .replace(/\s+/g, "*")
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9*-]/g, "");
}
//immagini
function loadImageSafe(path, cb) {
  loadImage(path,
    (img) => { cb && cb(img); },
    () => { cb && cb(null); }
  );
}

function preload() {
  table = loadTable("cleaned_dataset.csv", "csv", "header",
    () => console.log("CSV loaded:", table.getRowCount()),
    (err) => console.error("Failed to load CSV", err)
  );
  //oggetti cestini ecc...
  loadImageSafe(ASSETS_BASE + "empty.basket.png", img => img_empty = img);
  loadImageSafe(ASSETS_BASE + "over.basket.png", img => img_over = img);
  loadImageSafe(ASSETS_BASE + "basket.png", img => img_basket = img);
  loadImageSafe(ASSETS_BASE + "nodatafound.png", img => img_nodata = img);
}

function setup() {
  cnv = createCanvas(windowWidth, windowHeight); // non const, per poter ridimensionare dopo
  cnv.parent("canvasContainer");
  clear();
  noStroke();
  textFont("Inter, Arial, sans-serif");

  parseCSV();
  setupCountrySelect();
  setupTimelineUI();

  for (let c of commodities) {
    const n = normalizeFilename(c);
    const path = ASSETS_BASE + n + ".png";
    loadImageSafe(path, img => {
      commodityImgs[n] = img || null;
    });
  }
  //timeline e tendina
  const slider = document.getElementById("yearSlider");
  if (slider) selectedYear = parseInt(slider.value);
  if (countries.length) {
    selectedCountry = countries[0];
    const sel = document.getElementById("countrySelect");
    if (sel) sel.value = selectedCountry;
  }

  // Applica i parametri URL
  applyUrlParams();
  
  // Se non ci sono parametri URL, usa i valori di default
  if (!selectedCountry && countries.length) {
      selectedCountry = countries[0];
      const sel = document.getElementById("countrySelect");
      if (sel) sel.value = selectedCountry;
  }
  if (!selectedYear) {
      const slider = document.getElementById("yearSlider");
      if (slider) selectedYear = parseInt(slider.value);
  }

  updateVisualization();
}
//parse dati
function parseCSV() {
  data = [];
  commodities = [];
  countries = [];

  if (!table) return;

  for (let r = 0; r < table.getRowCount(); r++) {
    const row = table.getRow(r);
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

function setupCountrySelect() {
  const sel = document.getElementById("countrySelect");
  if (!sel) return;
  sel.innerHTML = "";
  for (let c of countries) {
    const opt = document.createElement("option");
    opt.value = c;
    opt.text = c;
    sel.appendChild(opt);
  }
  sel.addEventListener("change", () => {
    selectedCountry = sel.value;
    updateVisualization();
  });
  if (countries.length) {
    selectedCountry = countries[0];
    sel.value = selectedCountry;
  }
}

function setupTimelineUI() {
  const slider = document.getElementById("yearSlider");
  if (!slider) return;

  const years = Array.from(new Set(data.map(d => d.year))).filter(y => !isNaN(y)).sort((a, b) => a - b);
  if (years.length) {
    slider.min = Math.min(...years);
    slider.max = Math.max(...years);
    if (!slider.value) slider.value = slider.max;
  }

  slider.addEventListener("input", e => {
    selectedYear = parseInt(e.target.value);
    const lbl = document.getElementById("yearLabel");
    if (lbl) lbl.innerText = selectedYear;
    updateVisualization();
  });

  const marks = document.getElementById("yearMarks");
  if (marks) {
    marks.innerHTML = "";
    if (years.length) {
      const firstDec = Math.ceil(years[0] / 10) * 10;
      const lastDec = Math.floor(years[years.length - 1] / 10) * 10;
      for (let y = firstDec; y <= lastDec; y += 10) {
        const lbl = document.createElement("div");
        lbl.className = "decadeLabel";
        lbl.innerText = y;
        lbl.style.cursor = "pointer";
        lbl.addEventListener("click", () => {
          slider.value = y;
          selectedYear = y;
          const yearLbl = document.getElementById("yearLabel");
          if (yearLbl) yearLbl.innerText = y;
          updateVisualization();
        });
        marks.appendChild(lbl);
      }
    }
  }

  window.addEventListener("keydown", ev => {
    const slider = document.getElementById("yearSlider");
    if (!slider) return;
    const minY = parseInt(slider.min);
    const maxY = parseInt(slider.max);
    if (ev.key === "ArrowLeft") {
      selectedYear = Math.max(minY, (selectedYear || minY) - 1);
      slider.value = selectedYear;
      document.getElementById("yearLabel").innerText = selectedYear;
      updateVisualization();
    } else if (ev.key === "ArrowRight") {
      selectedYear = Math.min(maxY, (selectedYear || maxY) + 1);
      slider.value = selectedYear;
      document.getElementById("yearLabel").innerText = selectedYear;
      updateVisualization();
    }
  });
}

function updateVisualization() {
  const titleEl = document.getElementById("title");
  if (titleEl) titleEl.innerText = (selectedCountry || "—") + "  " + (selectedYear || "");
}

function draw() {
  if (!img_empty) return; // wait for images

  clear();

  const header = document.getElementById("headerBar");
  const headerH = header ? header.getBoundingClientRect().height : 0;

  // area grid
  const gridTop = headerH + 20;
  const gridW = width - 40;

  const cols = COLS;
  const gap = CELL_GAP;
  const totalGapW = gap * (cols - 1);
  const cellW = Math.floor((gridW - totalGapW) / cols);
  const cellH = Math.round(cellW * (INTERNAL_NOMINAL_H / INTERNAL_NOMINAL_W));

  // calcolo quante righe servono e altezza totale della griglia
  const rows = Math.ceil(commodities.length / cols);
  const totalGridHeight = rows > 0 ? (rows * cellH + Math.max(0, rows - 1) * gap) : cellH;
  const neededHeight = Math.max(windowHeight, Math.round(gridTop + totalGridHeight + 80)); // +padding bottom

  // se il canvas non è abbastanza alto, lo ridimensiono così la pagina può scrollare
  if (height !== neededHeight || width !== windowWidth) {
    resizeCanvas(windowWidth, neededHeight);
  }

  const startX = Math.round((width - ((cellW * cols) + totalGapW)) / 2);

  for (let i = 0; i < commodities.length; i++) {
    const c = commodities[i];
    const col = i % cols;
    const row = Math.floor(i / cols);

    const x = startX + col * (cellW + gap);
    const y = gridTop + row * (cellH + gap);

    drawComplexCell(c, x, y, cellW, cellH);
  }
}

function drawComplexCell(commodityName, x, y, w, h) {
  push();
  noFill();
  stroke(0,12);
  strokeWeight(0);
  rect(x, y, w, h, 8);

  const pb = CELL_PADDING;
  const availW = w - pb * 2;
  const availH = h - pb * 2;

  let baseW = availW;
  let baseH = availH;
  if (img_empty && img_empty.width) {
    const scale = Math.min(availW / img_empty.width, availH / img_empty.height);
    baseW = Math.round(img_empty.width * scale);
    baseH = Math.round(img_empty.height * scale);
  }
  const baseX = x + (w - baseW) / 2;
  const baseY = y + (h - baseH) / 2 + 6;

  const rowData = data.find(d => d.country === selectedCountry && d.year === selectedYear && d.commodity === commodityName);

  if (!rowData) {
    if (img_basket && img_basket.width) {
      const s = Math.min(availW / img_basket.width, availH / img_basket.height);
      const bw = Math.round(img_basket.width * s);
      const bh = Math.round(img_basket.height * s);
      imageMode(CORNER);
      image(img_basket, x + (w - bw) / 2, y + (h - bh) / 2, bw, bh);
    }
    if (img_nodata && img_nodata.width) {
      const s2 = Math.min(baseW / img_nodata.width, baseH / img_nodata.height);
      const nw = Math.round(img_nodata.width * s2);
      const nh = Math.round(img_nodata.height * s2);
      imageMode(CORNER);
      image(img_nodata, x + (w - nw)/1.2, y-75);
    } else {
      fill(100);
      noStroke();
      textAlign(CENTER, CENTER);
      textSize(14);
      text("No data", x + w/2, y + h/2);
    }
    drawCommodityLabel(commodityName, x, y, w, h);
    pop();
    return;
  }

  imageMode(CORNER);
  if (img_empty && img_empty.width) image(img_empty, baseX, baseY, baseW, baseH);

  const nominalW = INTERNAL_NOMINAL_W;
  const nominalH = INTERNAL_NOMINAL_H;
  const scaleInner = Math.min(1, baseW / (nominalW + 12), baseH / (nominalH + 12));
  const innerW = Math.round(nominalW * scaleInner);
  const innerH = Math.round(nominalH * scaleInner);
  const innerX = baseX + Math.round((baseW - innerW) / 2);
  const innerBottomY = baseY + baseH - Math.round(innerH * 0.08) - 6;

  const pct = isNaN(rowData.loss) ? 0 : Math.max(0, Math.min(100, rowData.loss));

  
  const SHRINK = -35; 
  
  const VERTICAL_OFFSET = 18; 
  

  const reducedInnerX = innerX + SHRINK;
  const reducedInnerW = innerW - SHRINK * 2;

  const fillH = Math.round(innerH * (pct / 100));
  let fillY = innerBottomY - fillH - VERTICAL_OFFSET;

  // protezione: non far uscire il rettangolo sopra il bordo superiore interno
  const innerTopY = innerBottomY - innerH;
  if (fillY < innerTopY) fillY = innerTopY;

  push();
  noStroke();
  fill(...LEVEL2_COLOR);
  rect(reducedInnerX, fillY, reducedInnerW, fillH, 4);
  pop();

  if (img_over && img_over.width) image(img_over, baseX, baseY, baseW, baseH);

  const norm = normalizeFilename(commodityName);
  const iconImg = commodityImgs[norm] || null;
  if (iconImg && iconImg.width) {
    const maxIconW = Math.round(w * 0.36);
    const iconScale = Math.min(maxIconW / iconImg.width, (h * 0.28) / iconImg.height);
    const iw = Math.round(iconImg.width * iconScale);
    const ih = Math.round(iconImg.height * iconScale);
    imageMode(CENTER);
    image(iconImg, x + w/2, baseY - ih * 0.28, iw, ih);
  } 
  
  else {
    push();
    fill(0, 120);
    noStroke();
    textSize(12);
    textAlign(CENTER, CENTER);
    text(commodityName, x + w/2, baseY - 12);
    pop();
  }

  drawCommodityLabel(commodityName, x, y, w, h);
  pop();
}

function drawCommodityLabel(name, x, y, w, h) {
  push();
  noStroke();
  fill(30, 30, 30);
  textSize(20);
  textAlign(CENTER, TOP);
  const labelY = y + h ;
  text(name, x + w/2, labelY);
  pop();
}

function windowResized() {
  // manteniamo resize al width della finestra; l'altezza verrà adattata in draw() in base al contenuto
  resizeCanvas(windowWidth, windowHeight);
}

// - Leggere i parametri dalla URL
function getUrlParams() {
    const urlParams = new URLSearchParams(window.location.search);
    const country = urlParams.get('country');
    const year = urlParams.get('year');
    
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
        if (countrySelect) {
            countrySelect.value = selectedCountry;
        }
    }
    
    if (params.year) {
        selectedYear = params.year;
        const yearSlider = document.getElementById("yearSlider");
        const yearLabel = document.getElementById("yearLabel");
        
        if (yearSlider) {
            yearSlider.value = selectedYear;
        }
        if (yearLabel) {
            yearLabel.innerText = selectedYear;
        }
    }
    
    updateVisualization();
}

