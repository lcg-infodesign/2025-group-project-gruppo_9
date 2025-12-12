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
      fontFamily:'Roboto',
      titleFont: 'Roboto',
      sliderValueSize: 20,
      tooltipSize: 12,
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

// Variabili per il Tooltip
let tooltipData = null; // Contiene l'oggetto con i dati completi per il tooltip



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
let commodityOutline = {};
// Parametri visivi griglia
const INTERNAL_NOMINAL_W = 90;
const INTERNAL_NOMINAL_H = 112;
const TARGET_CELL_WIDTH = 300;
const CELL_SPACING = 5;
const SIDE_MARGIN = 100;

// Layout Verticale
const TOP_TEXT_MARGIN = 20; 
const HEADER_HEIGHT_DOM = 0; // Se hai un header HTML, metti qui l'altezza stimata
let SLIDER_Y_POS = 80;       // Posizione verticale dello slider
let GRID_START_Y = 180;      // Dove inizia la griglia

// Colore riempimento commodity
const LEVEL2_COLOR = ['#EDC69A'];


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

// Funzione helper per trovare tutti i dati originali del CSV
function getFullDataRow(country, year, commodity) {
  if (!table) return null;

  // Cerchiamo direttamente nella tabella originale (più lento, ma necessario)
  for (let i = 0; i < table.getRowCount(); i++) {
    const row = table.getRow(i);
    if (
      row.getString("country") === country &&
      parseInt(row.getString("year")) === year &&
      row.getString("commodity") === commodity
    ) {
      // Trovata la riga, estraiamo tutte le info necessarie
      return {
        commodity: commodity,
        lossPercentage: parseFloat(String(row.getString("loss_percentage")).replace(",", ".")),
        supplyChainPhase: row.getString("food_supply_stage"),
        mainCauseOfWaste: row.getString("cause_of_loss"),
        hasData: true // Flag per indicare che i dati ci sono
      };
    }
  }

  // Se non ci sono dati, torniamo un oggetto minimale per il 'No Data'
  return {
      commodity: commodity,
      hasData: false
  };
}

// ===== PRELOAD =====
function preload() {
  table = loadTable(
    "cleaned_dataset_original.csv",
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


  // carica outline commodity
  for (let c of commodities) {
    const norm = normalizeFilename(c);
    loadImageSafe("assets/img/outline/" + norm + ".png", img => commodityOutline[norm] = img || null);
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

    // --- Nuova Gestione hover Cella Griglia (Tooltip) ---
    tooltipData = null; // Resetta ad ogni movimento
    cursor('default'); // Default (verrà sovrascritto se si è su slider o cella)

    if (!slider.thumb.dragging) {
      // Rilevamento hover sullo slider (codice esistente)
      isHoveringSlider = (
          mouseX >= slider.x - 20 && 
          mouseX <= slider.x + slider.width + 20 &&
          mouseY >= slider.y - 60 && 
          mouseY <= slider.y + 40
      );
    }

    if (isHoveringSlider && !slider.thumb.dragging) {
        hoveredYear = getYearFromX(mouseX);
        cursor('pointer');
    } else {
        hoveredYear = null;
        
        // Se non siamo sullo slider, controlliamo le celle della griglia
        const hoverResult = checkGridHover(commodities, GRID_START_Y);

        if (hoverResult) {
            cursor('pointer');
            tooltipData = getFullDataRow(selectedCountry, selectedYear, hoverResult.commodity);
            // Salviamo anche le coordinate della cella per il posizionamento del tooltip
            tooltipData.x = hoverResult.x;
            tooltipData.y = hoverResult.y;
            tooltipData.w = hoverResult.w;
            tooltipData.h = hoverResult.h;
        }
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

  

  // 4. Disegna Tooltip 
  drawTooltip();
}

function drawHeaderInfo() {
    push();
    fill(0);
    noStroke();
    textFont('Roboto');
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
    textFont('Roboto');
    
    // Anno corrente sotto il pallino
    text(selectedYear, slider.x + slider.width / 2, slider.y + 45);
    textFont('Roboto');
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

// Funzione per controllare se il mouse è sopra una cella e quale
function checkGridHover(items, startY) {
    
    // 1. CALCOLO DIMENSIONI FISSE PER LA RIGA (Replicato da drawFlexGrid)
    const availableW = width - (SIDE_MARGIN * 2); 
    const totalSpacing = (COLUMNS - 1) * CELL_SPACING;
    const cellWidth = floor((availableW - totalSpacing) / COLUMNS);
    const cellHeight = Math.round(cellWidth * (INTERNAL_NOMINAL_H / INTERNAL_NOMINAL_W));
    
    // 2. CALCOLO DELL'OFFSET DI CENTRATURA (Replicato da drawFlexGrid)
    const gridTotalWidth = (cellWidth * COLUMNS) + totalSpacing;
    const centeringOffset = floor((width - gridTotalWidth) / 2);
    
    
    // 3. CHECK POSIZIONE
    
    let currentX = centeringOffset; 
    let currentY = startY;
    
    for (let i = 0; i < items.length; i++) {
        const item = items[i];
        
        if (i > 0 && i % COLUMNS === 0) {
            currentX = centeringOffset; 
            currentY += cellHeight - 80 + CELL_SPACING; // Deve usare lo stesso 'a capo' di drawFlexGrid
        }

        // Controllo se il mouse è all'interno della cella (con un leggero buffer)
        if (
            mouseX >= currentX &&
            mouseX <= currentX + cellWidth &&
            mouseY >= currentY &&
            mouseY <= currentY + cellHeight
        ) {
            // Mouse sopra questa cella!
            return {
                commodity: item,
                x: currentX,
                y: currentY,
                w: cellWidth,
                h: cellHeight,
                index: i // <-- AGGIUNGI QUESTO!
            };
        }
        
        currentX += cellWidth + CELL_SPACING;
    }
    
    return null; // Nessuna cella trovata
}



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
            currentY += cellHeight-80 + CELL_SPACING;
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
// ===== DRAW TOOLTIP MODIFICATA =====
function drawTooltip() {
    if (!tooltipData) return;

    const TOOLTIP_CONFIG = {
        w: 500,
        h_data: 200,
        h_nodata: 80,
        bgColor: '#415E5A',
        textColor: '#F5F3EE',
        fontFamily: 'Roboto',
        radius: 12,
        pad: 20,
        offset: 15,
    };
    
    const { 
        x, y, w, h, // Posizione della cella
        commodity, 
        lossPercentage, 
        supplyChainPhase, 
        mainCauseOfWaste,
        hasData,
        index // Nuovo parametro recuperato
    } = tooltipData;

    const tooltipW = TOOLTIP_CONFIG.w;
    const tooltipH = hasData ? TOOLTIP_CONFIG.h_data : TOOLTIP_CONFIG.h_nodata;
    const pad = TOOLTIP_CONFIG.pad;
    const offset = TOOLTIP_CONFIG.offset;

    // 1. Calcolo della Colonna (COLUMNS è fissato a 4)
    const column = index % COLUMNS; 
    
    let ttX;
    
    // --- NUOVA LOGICA DI POSIZIONAMENTO ORIZZONTALE CORRETTA ---
    
    // Calcola la posizione ideale a DESTRA della cella
    const rightX = x + w + offset; 
    
    // Calcola la posizione ideale a SINISTRA della cella
    const leftX = x - tooltipW - offset;
    
    // Flag che indica se il tooltip può stare a destra
    const canFitRight = (rightX + tooltipW) <= (width - pad);
    
    // Flag che indica se il tooltip può stare a sinistra
    const canFitLeft = leftX >= pad; 

    // Regola 1: Prima colonna (Column 0). Deve stare a destra.
    if (column === 0) {
        ttX = rightX;
        // Se non ci sta a destra (caso raro in Column 0), lo forziamo a sinistra, ma controllando che non esca dal bordo sinistro
        if (!canFitRight) {
             ttX = leftX; 
        }
    }
    // Regola 2: Ultima colonna (Column COLUMNS-1). Deve stare a sinistra.
    else if (column === COLUMNS - 1) {
        ttX = leftX;
        // Se non ci sta a sinistra, lo forziamo a destra, ma controllando che non esca dal bordo destro
        if (!canFitLeft) {
             ttX = rightX;
        }
    }
    // Regola 3: Colonne centrali (Column 1 e 2). Preferiamo a sinistra se possibile.
    else {
        // Tentiamo di posizionare a sinistra (migliore per la visualizzazione generale)
        if (canFitLeft) {
            ttX = leftX;
        } 
        // Altrimenti, usiamo la posizione a destra (che dovrebbe essere quasi sempre possibile)
        else {
            ttX = rightX;
        }
    }
    
    // --- FINE NUOVA LOGICA ---
    // Posizionamento verticale: Centrato verticalmente rispetto alla cella
   let ttY = y + (h / 2) - (tooltipH / 2);
    
    // --- Gestione Bordi (Facoltativa ma consigliata) ---
    // Non strettamente necessario con l'offset laterale, ma buono per sicurezza.
    
    // Controllo che non vada fuori dalla cima del canvas
    if (ttY < pad) {
        ttY = pad;
    }
    // Controllo che non vada fuori dal fondo del canvas
    if (ttY + tooltipH > height - pad) {
        ttY = height - tooltipH - pad;
    }
    
    // --- Inizio disegno ---
    push();
    
   // Ombra (Leggera)
    drawingContext.shadowOffsetX = 2;
    drawingContext.shadowOffsetY = 2;
    drawingContext.shadowBlur = 8;
    drawingContext.shadowColor = 'rgba(0, 0, 0, 0.3)';

    // Sfondo del tooltip
    fill(TOOLTIP_CONFIG.bgColor); // Nuovo colore di sfondo
    noStroke();
    rect(ttX, ttY, tooltipW, tooltipH, TOOLTIP_CONFIG.radius); // Nuovo raggio
    
    // Rimuovi ombra per il testo
    drawingContext.shadowBlur = 0;
    drawingContext.shadowOffsetX = 0;
    drawingContext.shadowOffsetY = 0;
    
    fill(TOOLTIP_CONFIG.textColor); // Nuovo colore del testo
    textAlign(LEFT, TOP);
    
    let textY = ttY + pad;

    // --- Contenuto del Tooltip ---
    
    // Titolo
    textSize(20);
    textStyle(BOLD);
    textFont('Roboto');
    text(commodity, ttX + pad, textY);
    textY += 30;

    if (hasData) {
        // Dati disponibili
        textStyle(NORMAL);
        textSize(16);

        // Loss
        const lossText = `Perdita: ${nf(lossPercentage, 0, 1)}%`;
        text(lossText, ttX + pad, textY);
        textY += 24;
        
        // Fase
        text(`Fase: ${supplyChainPhase}`, ttX + pad, textY);
        textY += 24;
        
        // Causa
        text(`Causa: ${mainCauseOfWaste}`, ttX + pad, textY);
        
    } else {
        // No Data
        textSize(16);
        fill('#EDC69A'); // Rosso chiaro sul fondo scuro
        text("No data found.", ttX + pad, textY + 5);
    }
    
    pop();
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
    // 1. Disegna l'immagine di base (img_over) come contenitore comune
    if (img_over && img_over.width) {
      const s = Math.min(availW / img_over.width, availH / img_over.height);
      const bw = Math.round(img_over.width * s);
      const bh = Math.round(img_over.height * s);
      // image(img_over, x + (w - bw)/2, y + (h - bh)/2, bw, bh); // Uso img_over
      image(img_over, baseX, baseY, baseW, baseH); // Usando le variabili base già calcolate
    }
    
    // 2. Disegna l'Outline della commodity (QUI UTILIZZIAMO commodityOutline)
    const norm = normalizeFilename(commodityName);
    const iconImg = commodityOutline[norm] || null; 
    
    if (iconImg && iconImg.width) {
      const maxIconW = Math.round(w * 0.36);
      const iconScale = Math.min(maxIconW / iconImg.width, (h * 0.28) / iconImg.height);
      const iw = Math.round(iconImg.width * iconScale);
      const ih = Math.round(iconImg.height * iconScale);
      imageMode(CENTER);
      image(iconImg, x + w/2, baseY+ih, iw, ih);
    } else {
      push();
      fill(0, 120);
      noStroke();
      textSize(12);
      textAlign(CENTER, CENTER);
      textFont(CONFIG.typography.fontFamily);
      text(commodityName, x + w/2, baseY - 12);
      pop();
    }
    
    

    pop(); // Chiude il push iniziale della cella
    return; // Termina la funzione
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
  //fill('#F5F3EE');
  fill('#F5F3EE');
  //circle(innerX+70, fillY-143, 300);
  ellipse(innerX+70,fillY-37, 180, 80 )
  pop();

// === BASKET OVERLAY ===
  if (img_over && img_over.width)
    image(img_over, baseX, baseY, baseW, baseH); // Uso img_over

  // === ICONA (Piena - DATA PRESENTE) ===
  const norm = normalizeFilename(commodityName);
  const iconImg = commodityImgs[norm] || null; // <--- QUI UTILIZZIAMO commodityImgs
  if (iconImg && iconImg.width) {
    const maxIconW = Math.round(w * 0.36);
    const iconScale = Math.min(maxIconW / iconImg.width, (h * 0.28) / iconImg.height);
    const iw = Math.round(iconImg.width * iconScale);
    const ih = Math.round(iconImg.height * iconScale);
    imageMode(CENTER);
    image(iconImg, x + w/2, baseY + ih , iw, ih);
  } else {
    push();
    fill(0, 120);
    noStroke();
    textSize(12);
    textFont(CONFIG.typography.fontFamily);
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