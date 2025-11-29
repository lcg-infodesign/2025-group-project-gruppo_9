// ===== VARIABILI GLOBALI E CONFIGURAZIONE =====

// Riferimento al canvas (globale per ridimensionamento dinamico)
let cnv;

// Dati e strutture
let table;              
let data = [];          
let countries = [];     
let commodities = [];   

// Stato dell'applicazione
let selectedCountry = "";   
let selectedYear = null;    

// ===== GESTIONE IMMAGINI =====
const ASSETS_BASE = "assets/";
let img_empty = null;   
let img_over = null;    
let img_basket = null;  
let img_nodata = null;  
let commodityImgs = {}; 

// ===== PARAMETRI VISIVI =====
const COLS = 4;                     
const INTERNAL_NOMINAL_W = 90;      
const INTERNAL_NOMINAL_H = 112;     
const CELL_GAP = 50;                
const CELL_PADDING = 30;            
const LEVEL2_COLOR = [220, 60, 90, 220];
const SIDE_MARGIN = 60;             

// ===== FUNZIONI DI UTILITÀ =====

// Normalizza i nomi dei file per garantire compatibilità
function normalizeFilename(name) {
  if (!name) return "";
  return name.toLowerCase().trim()
    .replace(/\s+/g, "*")                          
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "") 
    .replace(/[^a-z0-9*-]/g, "");                 
}

function loadImageSafe(path, callback) {
  loadImage(
    path,
    (img) => { callback && callback(img); },       
    () => { callback && callback(null); } // Fallback su errore
  );
}

// ===== INIZIALIZZAZIONE p5.js =====
function preload() {
  // Carica il dataset CSV
  table = loadTable("cleaned_dataset.csv", "csv", "header",
    () => console.log("CSV caricato:", table.getRowCount(), "righe"),
    (err) => console.error("Errore caricamento CSV:", err)
  );
  
  // Carica le immagini base dei cestini
  loadImageSafe(ASSETS_BASE + "empty.basket.png", img => img_empty = img);
  loadImageSafe(ASSETS_BASE + "over.basket.png", img => img_over = img);
  loadImageSafe(ASSETS_BASE + "basket.png", img => img_basket = img);
  loadImageSafe(ASSETS_BASE + "nodatafound.png", img => img_nodata = img);
}

//Setup iniziale dell'applicazione
function setup() {
  // Crea canvas che occupa tutta la finestra
  cnv = createCanvas(windowWidth, windowHeight);
  cnv.parent("canvasContainer");
  
  clear();
  noStroke();
  textFont("Inter, Arial, sans-serif");

  // Elabora i dati e inizializza l'interfaccia
  parseCSV();
  setupCountrySelect();
  setupTimelineUI();

  // Carica le immagini per ogni commodity
  for (let commodity of commodities) {
    const normalizedName = normalizeFilename(commodity);
    const imagePath = ASSETS_BASE + normalizedName + ".png";
    loadImageSafe(imagePath, img => {
      commodityImgs[normalizedName] = img || null;
    });
  }

  // Applica i parametri dall'URL (se presenti)
  applyUrlParams();
  
  // Imposta valori di default se non specificati nell'URL
  if (!selectedCountry && countries.length > 0) {
    selectedCountry = countries[0];
    const countrySelect = document.getElementById("countrySelect");
    if (countrySelect) countrySelect.value = selectedCountry;
  }
  
  if (!selectedYear) {
    const yearSlider = document.getElementById("yearSlider");
    if (yearSlider) selectedYear = parseInt(yearSlider.value);
  }

  updateVisualization();
}

// ===== ELABORAZIONE DATI =====
function parseCSV() {
  data = [];
  commodities = [];
  countries = [];

  if (!table) return;

  // Itera attraverso tutte le righe del CSV
  for (let rowIndex = 0; rowIndex < table.getRowCount(); rowIndex++) {
    const row = table.getRow(rowIndex);
    
    // Estrai i dati dalla riga
    const country = row.getString("country");
    const commodity = row.getString("commodity");
    const year = parseInt(row.getString("year"));
    
    // Pulisci e converti la percentuale di spreco
    let lossPercentage = parseFloat(String(row.getString("loss_percentage")).replace(",", "."));
    lossPercentage = isNaN(lossPercentage) ? NaN : lossPercentage;

    // Aggiungi ai dati
    data.push({ 
      country, 
      commodity, 
      year, 
      loss: lossPercentage 
    });

    // Aggiorna liste uniche
    if (commodity && !commodities.includes(commodity)) {
      commodities.push(commodity);
    }
    if (country && !countries.includes(country)) {
      countries.push(country);
    }
  }

  // Ordina le liste
  countries.sort();
  commodities.sort();
}

// ===== GESTIONE INTERFACCIA UTENTE =====
function setupCountrySelect() {
  const selectElement = document.getElementById("countrySelect");
  if (!selectElement) return;
  
  // Pulisce e popola il dropdown
  selectElement.innerHTML = "";
  for (let country of countries) {
    const option = document.createElement("option");
    option.value = country;
    option.textContent = country;
    selectElement.appendChild(option);
  }
  
  // Imposta listener per cambiamenti
  selectElement.addEventListener("change", () => {
    selectedCountry = selectElement.value;
    updateVisualization();
  });
  
  // Imposta valore iniziale
  if (countries.length > 0) {
    selectedCountry = countries[0];
    selectElement.value = selectedCountry;
  }
}

// Inizializza lo slider della timeline
function setupTimelineUI() {
  const slider = document.getElementById("yearSlider");
  if (!slider) return;

  // Estrai anni unici dal dataset
  const years = Array.from(new Set(data.map(d => d.year)))
    .filter(year => !isNaN(year))
    .sort((a, b) => a - b);

  // Configura lo slider
  if (years.length > 0) {
    slider.min = Math.min(...years);
    slider.max = Math.max(...years);
    if (!slider.value) slider.value = slider.max;
  }

  // Listener per cambiamenti dello slider
  slider.addEventListener("input", event => {
    selectedYear = parseInt(event.target.value);
    const yearLabel = document.getElementById("yearLabel");
    if (yearLabel) yearLabel.textContent = selectedYear;
    updateVisualization();
  });

  // Aggiungi navigazione da tastiera
  setupKeyboardNavigation(slider);
}

// Configura la navigazione da tastiera (freccie sinistra/destra)
function setupKeyboardNavigation(slider) {
  window.addEventListener("keydown", event => {
    if (!slider) return;
    
    const minYear = parseInt(slider.min);
    const maxYear = parseInt(slider.max);
    
    if (event.key === "ArrowLeft") {
      selectedYear = Math.max(minYear, (selectedYear || minYear) - 1);
    } else if (event.key === "ArrowRight") {
      selectedYear = Math.min(maxYear, (selectedYear || maxYear) + 1);
    } else {
      return;
    }
    
    slider.value = selectedYear;
    const yearLabel = document.getElementById("yearLabel");
    if (yearLabel) yearLabel.textContent = selectedYear;
    updateVisualization();
  });
}

function updateVisualization() {
  const titleElement = document.getElementById("title");
  if (titleElement) {
    titleElement.textContent = `${selectedCountry || "—"} ${selectedYear || ""}`;
  }
}

// ===== DRAW PRINCIPALE =====
function draw() {
  if (!img_empty) return;

  clear();

  const header = document.getElementById("headerBar");
  const headerHeight = header ? header.getBoundingClientRect().height : 0;
  const gridTop = headerHeight + 20;
  
  // Usa la nuova costante per i margini laterali
  const gridWidth = width - (SIDE_MARGIN * 2);

  // Calcola dimensioni delle celle
  const totalGapWidth = CELL_GAP * (COLS - 1);
  const cellWidth = Math.floor((gridWidth - totalGapWidth) / COLS);
  const cellHeight = Math.round(cellWidth * (INTERNAL_NOMINAL_H / INTERNAL_NOMINAL_W));

  // Calcola layout griglia
  const rowsNeeded = Math.ceil(commodities.length / COLS);
  const totalGridHeight = rowsNeeded > 0 ? 
    (rowsNeeded * cellHeight + Math.max(0, rowsNeeded - 1) * CELL_GAP) : cellHeight;
  
  const neededHeight = Math.max(windowHeight, Math.round(gridTop + totalGridHeight + 80));
  if (height !== neededHeight || width !== windowWidth) {
    resizeCanvas(windowWidth, neededHeight);
  }

  // Centra la griglia considerando i nuovi margini
  const startX = SIDE_MARGIN + Math.round((gridWidth - ((cellWidth * COLS) + totalGapWidth)) / 2);

  for (let i = 0; i < commodities.length; i++) {
    const commodity = commodities[i];
    const column = i % COLS;
    const row = Math.floor(i / COLS);

    const x = startX + column * (cellWidth + CELL_GAP);
    const y = gridTop + row * (cellHeight + CELL_GAP);

    drawComplexCell(commodity, x, y, cellWidth, cellHeight);
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

