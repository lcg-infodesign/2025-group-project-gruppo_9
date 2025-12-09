// ===== CONFIGURAZIONE STILE (da Codice B) =====
const CONFIG = {
  colors: {
      background: '#FFFFFF', // O quello che preferisci per il canvas
      slider: {
          track: '#415E5A',
          thumb: '#F5F3EE',
          text: '#16201f',
          wave: '#415E5A' // Colore per il grafico a onda
      }
  },
  typography: {
      fontFamily: 'Inter, Arial, sans-serif',
      sliderValueSize: 18
  }
};

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

// Variabili per lo Slider (Timeline)
let yearDataCounts = {}; // Per il grafico a onda
let slider = {
  x: 0, y: 0, width: 0, height: 30,
  thumb: { x: 0, width: 28, dragging: false }
};
let isHoveringSlider = false;
let hoveredYear = null;
let yearRange = { min: 0, max: 0 };


// Immagini
const ASSETS_BASE = "assets/img/";
let img_empty = null;
let img_over = null;
let img_basket = null;
let img_nodata = null;
let commodityImgs = {};

// Parametri visivi griglia
const INTERNAL_NOMINAL_W = 90;
const INTERNAL_NOMINAL_H = 112;
const TARGET_CELL_WIDTH = 300;
const CELL_SPACING = 25;
const SIDE_MARGIN = 100;

// Layout Verticale
const TOP_TEXT_MARGIN = 20; 
const HEADER_HEIGHT_DOM = 0; // Se hai un header HTML, metti qui l'altezza stimata
let SLIDER_Y_POS = 80;       // Posizione verticale dello slider
let GRID_START_Y = 180;      // Dove inizia la griglia

// Colore riempimento commodity
const LEVEL2_COLOR = [220, 60, 90, 220];


// ===== Utility =====
function normalizeFilename(name) {
  if (!name) return "";
  return name.toLowerCase().trim()
    .replace(/\s+/g, "_")
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
  cnv = createCanvas(windowWidth, windowHeight+1000);
  cnv.parent("canvasContainer");

  clear();
  noStroke();
  textFont(CONFIG.typography.fontFamily);

  parseCSV();
  setupCountrySelect();
  
  // Setup Slider
  calculateYearDataCounts(); // Calcola dati per la wave
  setupSliderDimensions();

  // carica icone commodity
  for (let c of commodities) {
    const norm = normalizeFilename(c);
    loadImageSafe(ASSETS_BASE + norm + ".png", img => commodityImgs[norm] = img || null);
  }

  applyUrlParams();

  // Inizializzazioni default
  if (!selectedCountry && countries.length > 0) {
    selectedCountry = countries[0];
    const sel = document.getElementById("countrySelect");
    if (sel) sel.value = selectedCountry;
  }

  if (!selectedYear) {
    selectedYear = yearRange.max; // Default all'anno più recente
  }
  
  updateSliderThumb(); // Posiziona il thumb corretto
  document.addEventListener('keydown',handleKeyPress);
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

  // Calcola range anni
  const years = data.map(d => d.year).filter(y => !isNaN(y));
  if (years.length > 0) {
    yearRange.min = Math.min(...years);
    yearRange.max = Math.max(...years);
  }
}

// Calcola densità dati per la "Wave" della timeline
function calculateYearDataCounts() {
    yearDataCounts = {};
    
    // Conta quante entry ci sono per ogni anno
    for (let d of data) {
        const y = d.year;
        if (!isNaN(y)) {
            if (!yearDataCounts[y]) yearDataCounts[y] = 0;
            yearDataCounts[y]++;
        }
    }
    
    // Normalizza tra 0 e 1
    const maxCount = Math.max(...Object.values(yearDataCounts), 1);
    for (let year in yearDataCounts) {
        yearDataCounts[year] = yearDataCounts[year] / maxCount;
    }
}


// ===== UI LOGIC =====
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
    // Non serve chiamare updateVisualization esplicitamente perché draw() è in loop
  });

  if (countries.length > 0) sel.value = countries[0];
}

function setupSliderDimensions() {
    slider.width = Math.min(windowWidth * 0.8); // Max width 800px
    slider.x = (windowWidth - slider.width) / 2;
    
    // Posizionamento verticale layout
    const headerH = document.getElementById("headerBar") ? document.getElementById("headerBar").getBoundingClientRect().height : 0;
    
    // Definiamo le altezze
    const textY = headerH + 20;
    SLIDER_Y_POS = textY + 50; // Slider sotto il testo
    GRID_START_Y = SLIDER_Y_POS + 80; // Griglia sotto lo slider
    
    slider.y = SLIDER_Y_POS;
}

function updateSliderThumb() {
    if (!selectedYear) return;
    const percent = (selectedYear - yearRange.min) / (yearRange.max - yearRange.min);
    slider.thumb.x = slider.x + percent * slider.width;
}

// Funzione helper slider
function getYearFromX(x) {
    const percent = constrain((x - slider.x) / slider.width, 0, 1);
    return yearRange.min + round(percent * (yearRange.max - yearRange.min));
}

// ===== INTERAZIONE MOUSE (P5.JS) =====

function mouseMoved() {
    // Gestione hover slider
    isHoveringSlider = (
        mouseX >= slider.x - 20 && 
        mouseX <= slider.x + slider.width + 20 &&
        mouseY >= slider.y - 60 && 
        mouseY <= slider.y + 40
    );
    
    if (isHoveringSlider) {
        hoveredYear = getYearFromX(mouseX);
        cursor('pointer');
    } else {
        hoveredYear = null;
        cursor('default');
    }
    return false;
}

function mousePressed() {
    // Click sul pallino (Thumb)
    if (dist(mouseX, mouseY, slider.thumb.x, slider.y + 5) < slider.thumb.width / 2) {
        slider.thumb.dragging = true;
        cursor('grabbing');
        return;
    }
    
    // Click sulla track
    if (isHoveringSlider) {
        updateYearFromSlider(mouseX);
        slider.thumb.dragging = true;
        cursor('grabbing');
        return;
    }
}

function mouseDragged() {
    if (slider.thumb.dragging) {
        updateYearFromSlider(mouseX);
        cursor('grabbing');
    }
    return false;
}

function mouseReleased() {
    slider.thumb.dragging = false;
    if (isHoveringSlider) cursor('pointer');
    else cursor('default');
}

function updateYearFromSlider(x) {
    const newYear = getYearFromX(x);
    if (newYear !== selectedYear) {
        selectedYear = newYear;
        updateSliderThumb();
        
        // Aggiorna label HTML se esiste ancora
        const lab = document.getElementById("yearLabel");
        if (lab) lab.textContent = selectedYear;
        
        updateVisualization(); // Aggiorna titolo HTML
    }
}


// ===== DRAW MAIN =====
function draw() {
  if (!img_empty) return;

  clear();
  
  // 1. Disegna Titolo (Nazione - Anno)
  drawHeaderInfo();

  // 2. Disegna Slider
  drawTimeline();

  // 3. Disegna Griglia
  drawFlexGrid(commodities, GRID_START_Y);
}

function drawHeaderInfo() {
    push();
    fill(0);
    noStroke();
    textAlign(CENTER, TOP);
    textSize(40);
    
    const textToDisplay = `${selectedCountry || "Seleziona Nazione"}`;
    
    // Posiziona sopra lo slider, allineato a sinistra del layout
    text(textToDisplay, 735, 40 );
    pop();
}

function drawTimeline() {
    // --- Wave Graph (Hover) ---
    if (isHoveringSlider && hoveredYear) {
        drawSliderWaveGraph();
    }
    
    // --- Track ---
    fill(CONFIG.colors.slider.track);
    noStroke();
    rect(slider.x, slider.y, slider.width, 20, 5);
    
    // --- Data Points ---
    drawSliderDataPoints();
    
    // --- Thumb ---
    stroke(CONFIG.colors.slider.track);
    strokeWeight(2);
    fill(CONFIG.colors.slider.thumb);
    ellipse(slider.thumb.x, slider.y + 10, slider.thumb.width);
    noStroke();
    
    // --- Text Labels ---
    fill(CONFIG.colors.slider.text);
    textAlign(CENTER, CENTER);
    textSize(CONFIG.typography.sliderValueSize);
    
    // Anno corrente sotto il pallino
    text(selectedYear, slider.x + slider.width / 2, slider.y + 45);
    
    // Range min/max
    textSize(12);
    textAlign(LEFT);
    text(yearRange.min, slider.x, slider.y + 45);
    textAlign(RIGHT);
    text(yearRange.max, slider.x + slider.width, slider.y + 45);
}

function drawSliderDataPoints() {
    const years = Object.keys(yearDataCounts).map(Number).sort((a, b) => a - b);
    
    for (let year of years) {
        const x = map(year, yearRange.min, yearRange.max, slider.x, slider.x + slider.width);
        const dataRatio = yearDataCounts[year];
        
        // Dimensione e colore punto
        const pointHeight = 3 + (dataRatio * 7); 
        const colorValue = map(dataRatio, 0, 1, 150, 255);
        fill(colorValue, colorValue * 0.8, colorValue * 0.6);
        
        ellipse(x, slider.y + 10, pointHeight);
    }
}

function drawSliderWaveGraph() {
    const years = Object.keys(yearDataCounts).map(Number).sort((a, b) => a - b);
    const graphHeight = 30;
    const graphY = slider.y - graphHeight;
    
    push();
    // Linea
    beginShape();
    stroke(CONFIG.colors.slider.wave);
    strokeWeight(2);
    fill(CONFIG.colors.slider.wave + '30'); // Hex opacity
    
    vertex(slider.x + slider.width, graphY + graphHeight + 10);
    vertex(slider.x, graphY + graphHeight + 10);
    
    for (let year of years) {
        const x = map(year, yearRange.min, yearRange.max, slider.x, slider.x + slider.width);
        const dataRatio = yearDataCounts[year];
        const y = graphY + graphHeight - (dataRatio * graphHeight);
        vertex(x, y);
    }
    endShape(CLOSE);
    
    // Pallini sulla wave
    noStroke();
    fill(CONFIG.colors.slider.wave);
    for (let year of years) {
        const x = map(year, yearRange.min, yearRange.max, slider.x, slider.x + slider.width);
        const dataRatio = yearDataCounts[year];
        const y = graphY + graphHeight - (dataRatio * graphHeight);
        ellipse(x, y, 4);
    }
    pop();
}


// ===== FLEX GRID (Mantenuta dal codice A) =====
/*function drawFlexGrid(items, startY) {
  let x = SIDE_MARGIN;
  let y = startY;
  const maxW = width - SIDE_MARGIN - 10;

  for (let item of items) {
    //const w= maxW/4 - (CELL_SPACING*3);
    const w = TARGET_CELL_WIDTH;
    const h = Math.round(w * (INTERNAL_NOMINAL_H / INTERNAL_NOMINAL_W));

    if (x + w > maxW) {
      x = SIDE_MARGIN;
      y += h + CELL_SPACING;
    }
   circle(SIDE_MARGIN,startY,10);
   circle(maxW,startY,10);


    drawComplexCell(item, x, y, w, h);

    x += w + CELL_SPACING;
  }

  // Resize se il contenuto eccede
  if (height < y + 100) resizeCanvas(windowWidth, y + 100);
}*/


const COLUMNS = 4; // Fissiamo il numero di colonne desiderato

function drawFlexGrid(items, startY) {
    
    // 1. CALCOLO DIMENSIONI FISSE PER LA RIGA
    
    // Larghezza utilizzabile (escludendo i margini del canvas)
    const availableW = width - (SIDE_MARGIN * 2); 
    
    // Calcoliamo la larghezza di una singola cella. 
    // LarghezzaTotale = (LarghezzaCellax4) + (SpazioTraCelle x 3)
    // LarghezzaCellax4 = LarghezzaTotale - SpazioTotaleTraCelle
    // LarghezzaCella = (LarghezzaTotale - SpazioTotaleTraCelle) / 4
    
    const totalSpacing = (COLUMNS - 1) * CELL_SPACING;
    const cellWidth = floor((availableW - totalSpacing) / COLUMNS);
    
    // Altezza proporzionale della cella
    const cellHeight = Math.round(cellWidth * (INTERNAL_NOMINAL_H / INTERNAL_NOMINAL_W));

    // 2. CALCOLO DELL'OFFSET DI CENTRATURA
    
    // Larghezza totale effettiva occupata dalla griglia (comprese spaziature)
    const gridTotalWidth = (cellWidth * COLUMNS) + totalSpacing;
    
    // Spazio rimanente da dividere a metà (per centrare)
    const centeringOffset = floor((width - gridTotalWidth) / 2);
    
    
    // 3. DISEGNO DELLA GRIGLIA
    
    let currentX = centeringOffset; // Iniziamo dal margine calcolato
    let currentY = startY;
    
    for (let i = 0; i < items.length; i++) {
        const item = items[i];
        
        // Se siamo sulla quinta cella (o multipli di 4), andiamo a capo
        if (i > 0 && i % COLUMNS === 0) {
            currentX = centeringOffset; // Reimposta X al margine di centratura
            currentY += cellHeight + CELL_SPACING;
        }

        // Disegna la cella
        drawComplexCell(item, currentX, currentY, cellWidth, cellHeight);
        
        // Sposta X per la prossima cella
        currentX += cellWidth + CELL_SPACING;
    }

    // Resize se il contenuto eccede
    // Aggiungiamo un buffer più grande per il footer
    const footerBuffer = 150; 
    if (height < currentY + cellHeight + footerBuffer) {
         resizeCanvas(windowWidth, currentY + cellHeight + footerBuffer);
    }
}


// ===== DRAW COMPLEX CELL (Mantenuta dal codice A) =====
function drawComplexCell(commodityName, x, y, w, h) {
 /*fill("black");
 circle(x,y,10);
 fill("red");
  circle(x+w,y+h-1,10);*/

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
  /*imageMode(CORNER);
  if (img_empty && img_empty.width)
    image(img_empty, baseX, baseY, baseW, baseH);*/


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
  rect(innerX+1, fillY-8, innerW-3, fillH+8, 4);

  pop();
  push();
  fill('#F5F3EE');
  circle(innerX+70, fillY-143, 300);

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
  resizeCanvas(windowWidth, height);
  setupSliderDimensions();
  updateSliderThumb();
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
  }
  updateVisualization();
}
function handleKeyPress(event) {
    if (event.key === 'ArrowLeft') {
        // Anno precedente
        if (selectedYear > yearRange.min) {
            selectedYear--;
            updateSliderThumb();
            updateYear();
        }
    } else if (event.key === 'ArrowRight') {
        // Anno successivo
        if (selectedYear < yearRange.max) {
            selectedYear++;
            updateSliderThumb();
            updateYear();
        }
    }
}

function updateVisualization() {
  const t = document.getElementById("title");
  if (t) t.textContent = `${selectedCountry || "—"} ${selectedYear || ""}`;
}