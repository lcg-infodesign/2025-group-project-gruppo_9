/* countrySketch.js — versione corretta per griglia 4xN con livelli */
let table;
let data = [];
let countries = [];
let commodities = [];

let selectedCountry = "";
let selectedYear = null;

// images
const ASSETS_BASE = "assets/";
const BASKET_FILE_ASSET = ASSETS_BASE + "basket.png";
const BOTTOM_BIN_FILE_ASSET = ASSETS_BASE + "empty.basket.png";
// fallback paths (uploaded to session)
const BASKET_FILE_FALLBACK = "/mnt/data/basket.png";            
const BOTTOM_BIN_FILE_FALLBACK = "/mnt/data/empty.basket.png";
const BACKGROUND_FILE = "assets/sfondo.png";
const BACKGROUND_FILE_FALLBACK = "/mnt/data/sfondo.png";

// --- Funzione per leggere i parametri dall'URL
// --- Funzione per leggere i parametri dall'URL
function getURLParams() {
    try {
        const params = new URLSearchParams(window.location.search);
        const urlCountry = params.get('country');
        let urlYear = params.get('year');
        
        // Converti l'anno in numero, se presente
        if (urlYear) {
            urlYear = parseInt(urlYear);
            if (isNaN(urlYear)) {
                console.warn("Invalid year parameter:", params.get('year'));
                urlYear = null;
            }
        }
        
        console.log("URL Parameters parsed:", { country: urlCountry, year: urlYear });
        
        return {
            country: urlCountry,
            year: urlYear
        };
    } catch (error) {
        console.error("Error parsing URL parameters:", error);
        return { country: null, year: null };
    }
}

// normalize function for filenames
function normalizeFilename(name) {
if (!name) return "";
return name.toLowerCase().trim()
.replace(/\s+/g, "*")
.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
.replace(/[^a-z0-9*-]/g, "");
}

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

loadImageSafe(ASSETS_BASE + "empty.basket.png", img => img_empty = img);
loadImageSafe(ASSETS_BASE + "over.basket.png", img => img_over = img);
loadImageSafe(ASSETS_BASE + "basket.png", img => img_basket = img);
loadImageSafe(ASSETS_BASE + "nodatafound.png", img => img_nodata = img);
}

function setup() {
const cnv = createCanvas(windowWidth, windowHeight);
cnv.parent("canvasContainer");
clear();
noStroke();
textFont("Inter, Arial, sans-serif");

  if (!table) {
    console.error("CSV table not available in setup()");
  } else {
    loadData();
    setupCountrySelect();
    // setupTimeline() viene chiamato DOPO loadData() ora
    updateVisualization();
  }

for (let c of commodities) {
const n = normalizeFilename(c);
const path = ASSETS_BASE + n + ".png";
loadImageSafe(path, img => {
commodityImgs[n] = img || null;
});
}

const slider = document.getElementById("yearSlider");
if (slider) selectedYear = parseInt(slider.value);
if (countries.length) {
selectedCountry = countries[0];
const sel = document.getElementById("countrySelect");
if (sel) sel.value = selectedCountry;
}

// ---------------- DATA LOADING ----------------
function loadData() {
  data = [];
  for (let r = 0; r < table.getRowCount(); r++) {
    const row = table.getRow(r);
    const country = row.getString("country");
    const commodity = row.getString("commodity");
    const year = int(row.getString("year"));
    const lossRaw = row.getString("loss_percentage");
    const loss = parseFloat(String(lossRaw).replace(",", "."));
    if (!country || !commodity || isNaN(year) || isNaN(loss)) continue;
    data.push({ country, commodity, year, loss });
    if (!countries.includes(country)) countries.push(country);
  }
  countries.sort();
  
  // Leggi i parametri dall'URL
  const urlParams = getURLParams();
  
  console.log("URL Parameters:", urlParams);
  
  // Imposta l'anno dai parametri URL o usa il più recente
  const years = [...new Set(data.map(d => d.year))].sort((a,b)=>a-b);
  
  console.log("Available years in dataset:", years);
  console.log("Max year:", Math.max(...years));
  
  if (years.length) {
    const s = document.getElementById("yearSlider");
    if (s) { 
      const minYear = Math.min(...years);
      const maxYear = Math.max(...years);
      
      s.min = minYear; 
      s.max = maxYear; 
      
      // IMPOSTA L'ANNO PRIMA DI setupTimeline
      //if (urlParams.year && years.includes(urlParams.year)) {
        selectedYear = urlParams.year;
        console.log("Using year from URL:", selectedYear);
      /*} else {
        selectedYear = maxYear;
        console.log("Using max year from dataset:", selectedYear);
      }*/
      
      s.value = selectedYear;
      document.getElementById('yearLabel').innerText = selectedYear;
      
      console.log("Slider configured:", { 
        min: s.min, 
        max: s.max, 
        value: s.value,
        selectedYear: selectedYear 
      });
    }
  }
  
  // Imposta la nazione dai parametri URL se disponibile
  if (urlParams.country && countries.includes(urlParams.country)) {
    selectedCountry = urlParams.country;
    console.log("Using country from URL:", selectedCountry);
  } else if (countries.length) {
    selectedCountry = countries[0];
    console.log("Using first country from dataset:", selectedCountry);
  }
  
  // Setup UI dopo che i dati sono caricati
  setTimeout(() => {
    setupCountrySelect();
    setupTimeline();
    updateVisualization();
  }, 100);
}

function setupCountrySelect() {
  const sel = document.getElementById("countrySelect");
  sel.innerHTML = "";
  for (let c of countries) {
    const opt = document.createElement("option");
    opt.value = c;
    opt.text = c;
    sel.appendChild(opt);
  }
  
  // Imposta la nazione dai parametri URL se disponibile
  if (selectedCountry) {
    sel.value = selectedCountry;
  }
  
  sel.addEventListener("change", () => {
    selectedCountry = sel.value;
    updateVisualization();
  });
}

function setupTimeline() {
  const slider = document.getElementById("yearSlider");
  const marks = document.getElementById("yearMarks");
  
  if (!slider) {
    console.error("Slider element not found!");
    return;
  }
  
  console.log("Setup Timeline - Current values:", {
    min: slider.min,
    max: slider.max, 
    value: slider.value,
    selectedYear: selectedYear
  });
  
  marks.innerHTML = "";

  // compute min/max
  const minY = parseInt(slider.min);
  const maxY = parseInt(slider.max);

  // Verifica che i valori siano validi
  if (isNaN(minY) || isNaN(maxY)) {
    console.error("Invalid slider min/max values:", minY, maxY);
    return;
  }

  console.log("Valid years range:", minY, "to", maxY);

  // only show decade labels (very close to slider)
  const firstDecade = Math.ceil(minY/10)*10;
  const lastDecade = Math.floor(maxY/10)*10;
  const decades = [];
  for (let y = firstDecade; y <= lastDecade; y += 10) decades.push(y);

  console.log("Decades to show:", decades);

  // create labels positioned evenly in the marks container
  const totalSlots = decades.length;
  for (let i=0;i<totalSlots;i++){
    const lbl = document.createElement("div");
    lbl.className = "decadeLabel";
    lbl.innerText = decades[i];
    // click to set year to decade
    lbl.addEventListener("click", (() => {
      const yy = decades[i];
      return () => { 
        console.log("Decade clicked:", yy);
        slider.value = yy; 
        document.getElementById('yearLabel').innerText = yy; 
        selectedYear = yy; 
        updateVisualization(); 
      };
    })());
    marks.appendChild(lbl);
  }

  // slider change event - IMPORTANTE: non resettare selectedYear qui
  slider.addEventListener("input", (e) => {
    console.log("Slider input:", e.target.value);
    selectedYear = parseInt(e.target.value);
    document.getElementById('yearLabel').innerText = selectedYear;
    updateVisualization();
  });

  // IMPORTANTE: NON resettare selectedYear qui!
  // Usa il valore già impostato da loadData()
  document.getElementById('yearLabel').innerText = selectedYear;
  
  console.log("Timeline setup complete - selectedYear:", selectedYear);
  console.log("Slider final value:", slider.value);
}


// keyboard control for timeline
function keyPressed() {
  // left/right arrows adjust year by 1
  const slider = document.getElementById("yearSlider");
  if (!slider) return;
  const minY = parseInt(slider.min);
  const maxY = parseInt(slider.max);

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
  console.log("Updating visualization for:", selectedCountry, selectedYear);
  
  document.getElementById('title').innerText = selectedCountry + "  " + selectedYear;

  const filtered = data.filter(d => d.country === selectedCountry && d.year === selectedYear);

  console.log("Filtered data for", selectedCountry, selectedYear + ":", filtered.length, "items");

  items = [];
  if (filtered.length === 0) {
    console.log("No data found for", selectedCountry, "in", selectedYear);
    createBottomBins([]);
    return;
  }


  // conic sector above basket
  const spanDeg = 110;
  const centerAngle = -PI/2;
  const startAngle = centerAngle - radians(spanDeg/2);
  const endAngle = centerAngle + radians(spanDeg/2);

  const centerX = width/2;
  const basketY = height/2.5 ; // basket drawn lower, spawn above
  const spawnRadius = Math.min(260, height*0.26);

  for (let i = 0; i < filtered.length; i++) {
    const d = filtered[i];
    const ang = map(i, 0, Math.max(1, filtered.length-1), startAngle, endAngle);
    const extra = map(i % 3, 0, 2, -18, 18);
    const rx = spawnRadius + extra;
    const size = map(d.loss, 0, 20, 18, 70);
    const x = centerX + cos(ang) * rx;
    const y = basketY + sin(ang) * rx * 0.5;
    const norm = normalizeFilename(d.commodity);
    let img = commodityImgs[norm];
    if (!img) img = commodityImgs[d.commodity.toLowerCase()];
    items.push({commodity: d.commodity, loss: d.loss, x, y, size, img});
  }

  createBottomBins(filtered);
}

function draw() {
if (!img_empty) return; // wait for images

clear();

const header = document.getElementById("headerBar");
const timeline = document.getElementById("timelineContainer");
const headerH = header ? header.getBoundingClientRect().height : 0;
const footerH = timeline ? timeline.getBoundingClientRect().height : 100;

const gridTop = headerH + 12;
const gridBottom = height - (footerH + 24);
const gridW = width - 40;
const gridH = Math.max(200, gridBottom - gridTop);

const cols = COLS;
const gap = CELL_GAP;
const totalGapW = gap * (cols - 1);
const cellW = Math.floor((gridW - totalGapW) / cols);
const cellH = Math.round(cellW * (INTERNAL_NOMINAL_H / INTERNAL_NOMINAL_W));

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
stroke(0, 12);
strokeWeight(0.6);
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
image(img_basket, x  +  (w - bw) / 2, y + (h - bh) / 2, bw, bh);
}
if (img_nodata && img_nodata.width) {
const s2 = Math.min(baseW / img_nodata.width, baseH / img_nodata.height);
const nw = Math.round(img_nodata.width * s2);
const nh = Math.round(img_nodata.height * s2);
imageMode(CORNER);
image(img_nodata, x + (w - nw) / 2, y + (h - nh) / 2, nw/2, nh/2);
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
const VERTICAL_OFFSET = 20;
const SHRINK = 10;
const reducedInnerX = innerX + SHRINK;
const reducedInnerW = innerW - SHRINK * 2;
const fillH = Math.round(innerH * (pct / 100));
const fillY = innerBottomY - fillH - VERTICAL_OFFSET;

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
} else {
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
textSize(12);
textAlign(CENTER, TOP);
const labelY = y + h - 22;
text(name, x + w/2, labelY, w - 6, 36);
pop();
}

function windowResized() {
  resizeCanvas(windowWidth, 600);
  updateVisualization();
}
}