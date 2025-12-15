// ===== CONFIGURAZIONE STILE (da Codice B) =====
const CONFIG = {
  colors: {
      background: '#FFFFFF', // O quello che preferisci per il canvas
      slider: {
          track: '#415E5A',
          thumb: '#F5F3EE',
          text: '#16201f',
          wave: '#415E5A' // Colore per il grafico a onda
      },
      overlay: '#415E5A' // AGGIUNTO: Verde per l'overlay
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

// AGGIUNTO: Variabile per hover cella
let isHoveringCell = false;
let hoveredCellIndex = -1;

// ===== IMMAGINI RIEMPIMENTO DINAMICO =====
const fillImages = {};

// Immagini
const ASSETS_BASE = "../assets/img/";
let img_empty = null;
let img_over = null;
let img_basket = null;
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

// AGGIUNTO: Costante per altezza minima riempimento
const MIN_FILL_HEIGHT = 10; // Altezza minima in pixel
const MIN_FILL_PERCENTAGE = 3; // Percentuale minima visibile


// ===== Utility =====
function normalizeFilename(name) {
  if (!name) return "";
  return name.toLowerCase().trim()
    .replace(/\s+/g, "_")
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9*-]/g, "");
}
//immagini riempimenti

function getFillImage(supplyStage, cause) {
  if (!supplyStage || !cause) return fillImages.default;

  const key = 
    normalizeFilename(supplyStage) + "_" +
    normalizeFilename(cause);

  return fillImages[key] || fillImages.default;
}

function drawImageFillLevel(img, x, bottomY, w, h, fillH) {
  if (!img || fillH <= 0) return;

  const srcH = img.height * (fillH / h);
  const srcY = img.height - srcH;

  const destY = bottomY - fillH;

  image(
    img,
    x, destY, w, fillH,
    0, srcY, img.width, srcH
  );
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
    "../assets/dataset/cleaned_dataset_inglese.csv",
    "csv",
    "header",
    () => console.log("CSV caricato", table.getRowCount()),
    (err) => console.error("Errore CSV", err)
  );

  loadImageSafe(ASSETS_BASE + "empty.basket.png", img => img_empty = img);
  loadImageSafe(ASSETS_BASE + "empty.basket.png", img => img_over = img);
  loadImageSafe(ASSETS_BASE + "basket.png", img => img_basket = img);



  loadImageSafe(ASSETS_BASE + "glifi/default.png", img => fillImages.default = img);

  const stages = [
    "production",
    "post_harvest",
    "storage",
    "transport",
    "retail",
    "consumption"
  ];

  const causes = [
    "mechanical_damage",
    "spoilage",
    "overproduction",
    "poor_storage",
    "handling"
  ];

  for (let s of stages) {
    for (let c of causes) {
      const key = `${s}_${c}`;
      loadImageSafe(
        ASSETS_BASE + "fills/" + key + ".png",
        img => fillImages[key] = img || null
      );
    }
  }
}



// ===== SETUP =====
function setup() {
  cnv = createCanvas(windowWidth, windowHeight);
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
    loadImageSafe(ASSETS_BASE + '/cibi/' + norm + ".png", img => commodityImgs[norm] = img || null);
  }


  // carica outline commodity
  for (let c of commodities) {
    const norm = normalizeFilename(c);
    loadImageSafe("../assets/img/outline/" + norm + "vuoto.png", img => commodityOutline[norm] = img || null);
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

function calculateYearDataCounts() {
    yearDataCounts = {};
    
    // Conta quante entry ci sono per ogni anno
    for (let d of data) {
        const y = d.year;
        
        // Filtra per paese se specificato
        if (selectedCountry && d.country !== selectedCountry) {
            continue; // Salta questo dato se non è del paese selezionato
        }
        
        if (!isNaN(y)) {
            if (!yearDataCounts[y]) yearDataCounts[y] = 0;
            yearDataCounts[y]++;
        }
    }
    
    // Normalizza tra 0 e 1
    const values = Object.values(yearDataCounts);
    const maxCount = values.length > 0 ? Math.max(...values) : 1;
    
    for (let year in yearDataCounts) {
        yearDataCounts[year] = yearDataCounts[year] / maxCount;
    }
    
    console.log(`Dati calcolati per: ${selectedCountry || "Tutti i paesi"}`, yearDataCounts);
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
    // Reset hover states
    isHoveringSlider = false;
    isHoveringCell = false;
    tooltipData = null;
    hoveredCellIndex = -1;
    cursor('default');

    if (!slider.thumb.dragging) {
      // Rilevamento hover sullo slider
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
            isHoveringCell = true;
            hoveredCellIndex = hoverResult.index;
            cursor('pointer');
            tooltipData = getFullDataRow(selectedCountry, selectedYear, hoverResult.commodity);
            if (tooltipData) {
                tooltipData.x = hoverResult.x;
                tooltipData.y = hoverResult.y;
                tooltipData.w = hoverResult.w;
                tooltipData.h = hoverResult.h;
                tooltipData.index = hoverResult.index;
            }
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
    else if (isHoveringCell) cursor('pointer');
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
  //drawHeaderInfo();

  // 2. Disegna Slider
  drawTimeline();

  // 3. Disegna Griglia
  drawFlexGrid(commodities, GRID_START_Y);

  // 4. Disegna Overlay se c'è hover su cella
  if (isHoveringCell && tooltipData) {
    drawHoverOverlay();
    
    // 5. Ridisegna SOPRA l'overlay SOLO la cella hoverata
    if (hoveredCellIndex !== -1) {
      drawHoveredCell();
    }
  }

  // 6. Disegna Tooltip 
  if (tooltipData && isHoveringCell) {
    drawTooltip();
    
  }
  push();
  fill('#415E5A');
  rect((windowWidth)/10,windowHeight/38, 300,100,12);
  pop();
}

// AGGIUNTO: Funzione per disegnare overlay hover
function drawHoverOverlay() {
  push();
  fill(CONFIG.colors.overlay + '80'); // Verde con trasparenza 50%
  noStroke();
  rect(0, 0, width, height);
  pop();
}

function drawHeaderInfo() {
    push();
    fill(0);
    noStroke();
    textFont(CONFIG.typography.fontFamily);
    textAlign(CENTER, TOP);
    textSize(40);
    
    const textToDisplay = `${selectedCountry || "Select Country"}`;
    
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
    textFont(CONFIG.typography.fontFamily);
    
    // Anno corrente sotto il pallino
    text(selectedYear, slider.x + slider.width / 2, slider.y + 45);
    textFont(CONFIG.typography.fontFamily);
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
    // Salva lo stato attuale dei dati
    const originalDataCounts = {...yearDataCounts};
    
    // Se c'è un paese selezionato, ricalcola per quel paese
    if (selectedCountry) {
        calculateYearDataCounts();
    }

    // Crea un oggetto con TUTTI gli anni inizializzati a 0
    const allYearData = {};
    for (let year = yearRange.min; year <= yearRange.max; year++) {
        allYearData[year] = yearDataCounts[year] || 0;
    }
    
    const years = Object.keys(allYearData).map(Number).sort((a, b) => a - b);
    const graphHeight = 30;
    const graphY = slider.y - graphHeight;
    
    push();
    // Linea
    beginShape();
    stroke(CONFIG.colors.slider.wave);
    strokeWeight(2);
    fill(CONFIG.colors.slider.wave + '30');
    
    // Punto di partenza in basso a sinistra
    vertex(slider.x, graphY + graphHeight + 10);
    
    // Aggiungi vertex per ogni anno
    for (let year of years) {
        const x = map(year, yearRange.min, yearRange.max, slider.x, slider.x + slider.width);
        const dataRatio = allYearData[year];
        const y = graphY + graphHeight - (dataRatio * graphHeight);
        vertex(x, y);
    }
    
    // Punto di arrivo in basso a destra
    vertex(slider.x + slider.width, graphY + graphHeight + 10);
    endShape(CLOSE);
    
    // Pallini sulla wave (solo per anni con dati > 0)
    noStroke();
    fill(CONFIG.colors.slider.wave);
    for (let year of years) {
        const dataRatio = allYearData[year];
        if (dataRatio > 0) { // Solo se non è 0
            const x = map(year, yearRange.min, yearRange.max, slider.x, slider.x + slider.width);
            const y = graphY + graphHeight - (dataRatio * graphHeight);
            ellipse(x, y, 4);
        }
    }    
    pop();

    // Ripristina i dati originali (per tutti i paesi)
    if (selectedCountry) {
        yearDataCounts = originalDataCounts;
    }
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
        const commodity = items[i];
        
        // MODIFICA: Controlla prima se c'è un dato per questa commodity
        const rowData = data.find(d =>
            d.country === selectedCountry &&
            d.year === selectedYear &&
            d.commodity === commodity
        );
        
        // Se non c'è dato, salta questa cella (nessun hover)
        if (!rowData) {
            // Aggiorna comunque la posizione per le celle successive
            if (i > 0 && i % COLUMNS === 0) {
                currentX = centeringOffset; 
                currentY += cellHeight - 80 + CELL_SPACING;
            }
            currentX += cellWidth + CELL_SPACING;
            continue;
        }
        
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
            // Mouse sopra questa cella E c'è un dato!
            return {
                commodity: commodity,
                x: currentX,
                y: currentY,
                w: cellWidth,
                h: cellHeight,
                index: i,
                hasData: true // Aggiungi flag che c'è dato
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

        // Se è la cella hoverata, la disegna sopra l'overlay
        if (i === hoveredCellIndex && isHoveringCell) {
            push();
            drawComplexCell(item, currentX, currentY, cellWidth, cellHeight);
            pop();
        } else {
            drawComplexCell(item, currentX, currentY, cellWidth, cellHeight);
        }
        
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
        w: 400,
        h_data: 130,
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
    fill(TOOLTIP_CONFIG.bgColor);
    noStroke();
    rect(ttX, ttY, tooltipW, tooltipH, TOOLTIP_CONFIG.radius);
    
    // Rimuovi ombra per il testo
    drawingContext.shadowBlur = 0;
    drawingContext.shadowOffsetX = 0;
    drawingContext.shadowOffsetY = 0;
    
    fill(TOOLTIP_CONFIG.textColor);
    textAlign(LEFT, TOP);
    
    let textY = ttY + pad;

    // --- Contenuto del Tooltip ---
    
    // Titolo
    textSize(20);
    textStyle(BOLD);
    textFont(CONFIG.typography.fontFamily);
    text(commodity, ttX + pad, textY);
    textY += 30;

    if (hasData) {
        // Dati disponibili - TESTO IN INGLESE
        textStyle(NORMAL);
        textSize(16);

        // Loss
        const lossText = `Loss: ${nf(lossPercentage, 0, 1)}%`;
        text(lossText, ttX + pad, textY);
        textY += 24;
        
        // Fase
        text(`Supply chain phase: ${supplyChainPhase}`, ttX + pad, textY);
        textY += 24;
        
        // Causa
        let cause = mainCauseOfWaste || "Data not available";
        text(`Main cause: ${cause}`, ttX + pad, textY);

    } else {
        // No Data - TESTO IN INGLESE
        textSize(16);
        fill('#EDC69A');
        text("Data not available for this year", ttX + pad, textY + 5);
    }
    
    pop();
}

// ===== DRAW COMPLEX CELL (Mantenuta dal codice A) =====
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
    const scale = Math.min(availW / img_empty.width, availH / img_empty.height) * 0.8;
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
      image(img_over, baseX, baseY, baseW, baseH);
    }
    
    // 2. Disegna l'Outline della commodity
    const norm = normalizeFilename(commodityName);
    const iconImg = commodityOutline[norm] || null; 
    
    if (iconImg && iconImg.width) {
      const maxIconW = Math.round(w * 0.36);
      const iconScale = Math.min(maxIconW / iconImg.width, (h * 0.28) / iconImg.height)*0.8;
      const iw = Math.round(iconImg.width * iconScale);
      const ih = Math.round(iconImg.height * iconScale);
      imageMode(CENTER);
      // MANTENUTO: stessa posizione originale
      image(iconImg, x + w/2, baseY+ih * 1.3, iw, ih);
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

  // === FILL LEVEL ===
  let pct = isNaN(rowData.loss) ? 0 : Math.max(0, Math.min(100, rowData.loss));
  
  // MODIFICA 1: Altezza minima garantita
  if (pct > 0 && pct < MIN_FILL_PERCENTAGE) {
    pct = MIN_FILL_PERCENTAGE;
  }

  const nominalW = INTERNAL_NOMINAL_W+50;
  const nominalH = INTERNAL_NOMINAL_H + 50;
  const scaleInner = Math.min(1, baseW / (nominalW + 12), baseH / (nominalH + 12));
  const innerW = Math.round(nominalW * scaleInner);
  const innerH = Math.round(nominalH * scaleInner)+5;
  const innerX = baseX + Math.round((baseW - innerW) / 2);
  const innerBottomY = baseY + baseH - Math.round(innerH * 0.08)+5;

  // MODIFICA 2: Altezza minima garantita
  //const fillH = Math.max(MIN_FILL_HEIGHT, Math.round(innerH * (pct / 100)));
  const fillH = pct === 0 ? 0 : map(pct, 0, 100, MIN_FILL_HEIGHT, innerH);
  let fillY = innerBottomY - fillH - 18;

  const innerTopY = innerBottomY - innerH;
  if (fillY < innerTopY) fillY = innerTopY;

  // Riempiemento
  // === IMAGE FILL LEVEL ===
const fullRow = getFullDataRow(
  selectedCountry,
  selectedYear,
  commodityName
);

const fillImg = getFillImage(
  fullRow.supplyChainPhase,
  fullRow.mainCauseOfWaste
);

// Clipping area
push();
drawingContext.save();
drawingContext.beginPath();
drawingContext.rect(innerX+4, innerBottomY - innerH, innerW-10, innerH);
drawingContext.clip();

// Disegno PNG riempimento
drawImageFillLevel(
  fillImg,
  innerX+4,
  innerBottomY - 8,
  innerW-10,
  innerH,
  fillH
);

drawingContext.restore();
pop();

  // Parte superiore curva (bianca) - MANTENUTA COME ORIGINALE
  const hoverResult = checkGridHover(commodities, GRID_START_Y);
  if (!(hoverResult && hoverResult.commodity === commodityName)) {
    push();
    fill('#F5F3EE'); // Bianco normale
    ellipse(innerX+70, fillY-37, 170, 80);
    pop();
  }

  // === BASKET OVERLAY ===
  if (img_over && img_over.width)
    image(img_over, baseX, baseY, baseW, baseH);

  // === ICONA (Piena - DATA PRESENTE) ===
  const norm = normalizeFilename(commodityName);
  const iconImg = commodityImgs[norm] || null;
  if (iconImg && iconImg.width) {
    const maxIconW = Math.round(w * 0.36);
    const iconScale = Math.min(maxIconW / iconImg.width, (h * 0.28) / iconImg.height) * 0.8;
    const iw = Math.round(iconImg.width * iconScale);
    const ih = Math.round(iconImg.height * iconScale);
    imageMode(CENTER);
    // MANTENUTO: stessa posizione originale
    image(iconImg, x + w/2, baseY + ih*1.3, iw, ih);
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

function drawHoveredCell() {
  // Calcola la posizione della cella hoverata (simile a drawFlexGrid)
  const availableW = width - (SIDE_MARGIN * 2); 
  const totalSpacing = (COLUMNS - 1) * CELL_SPACING;
  const cellWidth = floor((availableW - totalSpacing) / COLUMNS);
  const cellHeight = Math.round(cellWidth * (INTERNAL_NOMINAL_H / INTERNAL_NOMINAL_W));
  const gridTotalWidth = (cellWidth * COLUMNS) + totalSpacing;
  const centeringOffset = floor((width - gridTotalWidth) / 2);
  
  let currentX = centeringOffset;
  let currentY = GRID_START_Y;
  
  // Trova la posizione della cella hoverata
  for (let i = 0; i < commodities.length; i++) {
    const commodity = commodities[i];
    
    if (i > 0 && i % COLUMNS === 0) {
      currentX = centeringOffset;
      currentY += cellHeight - 80 + CELL_SPACING;
    }
    
    if (i === hoveredCellIndex) {
      // Disegna SOLO questa cella (senza lo sfondo della cella)
      drawComplexCell(commodity, currentX, currentY, cellWidth, cellHeight);
      return;
    }
    
    currentX += cellWidth + CELL_SPACING;
  }
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