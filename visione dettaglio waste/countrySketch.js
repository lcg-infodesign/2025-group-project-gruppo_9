// ===== CONFIGURAZIONE STILE  =====
const CONFIG = {
  colors: {
    background: '#FFFFFF',
    slider: {
      track: '#415E5A',
      thumb: '#F5F3EE',
      text: '#16201f',
      circle: '#EDC69A',
      wave: '#415E5A'
    },
    overlay: '#415E5A',
    legend: {
      background: '#D4D7D2', // Colore di sfondo della legenda
      border: '#D4D7D2',
      circle: '#415E5A' // Colore dei pallini (stesso sfondo del sito)
    }
  },
  layout: {
    gridWidth: 1200, // Modificare questo valore per stringere/allargare la  griglia
    legend: {
      width: 175, // Leggermente più larga
      height: 1350, // Più alta per  l'immagine
      marginRight: 150, // Più vicina al centro
      padding: 15
    },
    margin: {
      horizontal: 100, // punto di ancoraggio a sinistra
      vertical: 110
    }
  },
  typography: {
    fontFamily: 'Roboto',
    titleFont: 'Roboto',
    sliderValueSize: 20,
    tooltipSize: 12,
    legendSize: 18,
    legendSliderSize: 11
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
let tooltipData = null;

// Stato
let selectedCountry = "";
let selectedYear = null;

// Variabili per lo Slider (Timeline)
let yearDataCounts = {};
let slider = {
  x: 0,
  y: 0,
  width: 0,
  height: 30,
  thumb: {
    x: 0,
    width: 28,
    dragging: false
  }
};
let isHoveringSlider = false;
let hoveredYear = null;
let yearRange = {
  min: 0,
  max: 0
};

//  Variabile per hover cella
let isHoveringCell = false;
let hoveredCellIndex = -1;

// ===== IMMAGINI RIEMPIMENTO DINAMICO =====
const fillImages = {};

// Immagini
const ASSETS_BASE = "../assets/img/";
let img_empty = null;
let img_over = null;
let img_basket = null;
let legendImage = null;
let commodityImgs = {};
let commodityOutline = {};
let causeImgs = {};

//TUTORIAL
let tutorialOpen = false;

//timeline
let hoveredTimelineYear = null;

// Parametri visivi griglia 
const INTERNAL_NOMINAL_W = 90;
const INTERNAL_NOMINAL_H = 132;
const TARGET_CELL_WIDTH = 260; // La cella non cambia più dimensione in base allo schermo
const CELL_SPACING = 0;      // Spaziatura tra le celle
const SIDE_MARGIN =0;

// Layout Verticale
const TOP_TEXT_MARGIN = 20;
const HEADER_HEIGHT_DOM = 0;
let SLIDER_Y_POS = 80;
let GRID_START_Y = 180;

// Colore riempimento commodity
const LEVEL2_COLOR = ['#4F5257'];

// Costante per altezza minima riempimento
const MIN_FILL_HEIGHT = 0;
const MIN_FILL_PERCENTAGE = 0;

// Costante per food supply stages
  const foodSupplyStage = [
    "wholesupplychain",
    "pre-harvest",
    "harvest",
    "post-harvest",
    "farm",
    "grading",
    "packing",
    "storage",
    "transport",
    "collector",
    "trader",
    "market",
    "processing",
    "wholesale",
    "distributor",
    "retail",
    "export",
    "foodservices",
    "households"
  ];

// ===== Utility =====
function normalizeFilename(name) {
  if (!name) return "";
  return name.toLowerCase().trim()
    .replace(/\s+/g, "_")
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9*-]/g, "");
}

function getFillImage(supplyStage, cause) {
  if (!supplyStage || !cause) return fillImages.default;

  const key = normalizeFilename(supplyStage) + "_" + normalizeFilename(cause);

  if (fillImages[key]) return fillImages[key];

  const stageDefaultKey = normalizeFilename(supplyStage) + "_default";
  if (fillImages[stageDefaultKey]) return fillImages[stageDefaultKey];

  return fillImages.default;
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

  for (let i = 0; i < table.getRowCount(); i++) {
    const row = table.getRow(i);
    if (
      row.getString("country") === country &&
      parseInt(row.getString("year")) === year &&
      row.getString("commodity") === commodity
    ) {
      return {
        commodity: commodity,
        lossPercentage: parseFloat(String(row.getString("loss_percentage")).replace(",", ".")),
        supplyChainPhase: row.getString("food_supply_stage"),
        mainCauseOfWaste: row.getString("cause_of_loss"),
        hasData: true
      };
    }
  }

  return {
    commodity: commodity,
    hasData: false
  };
}

// ===== PRELOAD =====
function preload() {
  table = loadTable(
    "../assets/dataset/Dataset.csv", 
    "csv",
    "header",
    () => console.log("CSV caricato", table.getRowCount()),
    (err) => console.error("Errore CSV", err)
  );

  loadImageSafe(ASSETS_BASE + "empty.basket.png", img => img_empty = img);
  loadImageSafe(ASSETS_BASE + "empty.basket.png", img => img_over = img);
  loadImageSafe(ASSETS_BASE + "basket.png", img => img_basket = img);
  loadImageSafe(ASSETS_BASE + "legenda.svg", img => legendImage = img);

  //loadImageSafe(ASSETS_BASE + "glifi/default.png", img => fillImages.default = img);
  let causes = ["conservation", "disease", "machinery damage", "market", "drying", "processing",
                "environmental factor", "storage", "harvest and management", "transport", "waste", "insects, parasites and animals"];
  
  for (let c of causes) {
    const normCause = normalizeFilename(c);
    // Carica l'immagine dalla cartella assets/img/cause/
    loadImageSafe(ASSETS_BASE + normCause + ".png", img => {
      causeImgs[normCause] = img || null;
    });
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
  calculateYearDataCounts();
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
    selectedYear = yearRange.max;
  }

  updateSliderThumb();
  document.addEventListener('keydown', handleKeyPress);
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

    data.push({
      country,
      commodity,
      year,
      loss
    });

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

  for (let d of data) {
    const y = d.year;

    if (selectedCountry && d.country !== selectedCountry) {
      continue;
    }

    if (!isNaN(y)) {
      if (!yearDataCounts[y]) yearDataCounts[y] = 0;
      yearDataCounts[y]++;
    }
  }

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
  });

  if (countries.length > 0) sel.value = countries[0];
}

function setupSliderDimensions() {
  slider.width = Math.min(windowWidth * 0.8);
  slider.x = (windowWidth - slider.width) / 2;

  const headerH = document.getElementById("headerBar") ? document.getElementById("headerBar").getBoundingClientRect().height : 0;

  const textY = headerH + 20;
  SLIDER_Y_POS = textY + 50;
  GRID_START_Y = SLIDER_Y_POS + 80;

  slider.y = SLIDER_Y_POS;
}

function updateSliderThumb() {
  if (!selectedYear) return;
  const percent = (selectedYear - yearRange.min) / (yearRange.max - yearRange.min);
  slider.thumb.x = slider.x + percent * slider.width;

  // Aggiorna il testo nell'HTML
    const yearElement = document.getElementById('current-year');
    if (yearElement) {
        yearElement.textContent = selectedYear;
    }
}

function getYearFromX(x) {
  const percent = constrain((x - slider.x) / slider.width, 0, 1);
  return yearRange.min + round(percent * (yearRange.max - yearRange.min));
}

// ===== INTERAZIONE MOUSE (P5.JS) =====

function mouseMoved() {
  if (tutorialOpen) {
        hoveredRowData = null;
        hoveredRow = -1;
        hoveredCol = -1;
        document.body.style.cursor = 'default';
        return false;
    }

  isHoveringSlider = false;
  isHoveringCell = false;
  tooltipData = null;
  hoveredCellIndex = -1;
  cursor('default');

  if (!slider.thumb.dragging) {
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

    const hoverResult = checkGridHover(commodities, GRID_START_Y);

    if (hoverResult) {
      isHoveringCell = true;
      hoveredCellIndex = hoverResult.index;
      cursor('default');
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
  if (tutorialOpen) return false;
  if (dist(mouseX, mouseY, slider.thumb.x, slider.y + 5) < slider.thumb.width / 2) {
    slider.thumb.dragging = true;
    cursor('pointer');
    return;
  }

  if (isHoveringSlider) {
    updateYearFromSlider(mouseX);
    slider.thumb.dragging = true;
    cursor('pointer');
    return;
  }
}

function mouseDragged() {
  if (tutorialOpen) return false;
  if (slider.thumb.dragging) {
    updateYearFromSlider(mouseX);
    cursor('grabbing');
  }
  return false;
}

function mouseReleased() {
  slider.thumb.dragging = false;
  if (isHoveringSlider) cursor('pointer');
  else if (isHoveringCell) cursor('default');
  else cursor('default');
}

function updateYearFromSlider(x) {
  if (tutorialOpen) return false;
  const newYear = getYearFromX(x);
  if (newYear !== selectedYear) {
    selectedYear = newYear;
    updateSliderThumb();

    const yearElement = document.getElementById('current-year');
        if (yearElement) {
            yearElement.textContent = selectedYear;
        }

    const lab = document.getElementById("yearLabel");
    if (lab) lab.textContent = selectedYear;

    updateVisualization();
  }
}

// ===== DRAW MAIN =====
function draw() {
  if (!img_empty) return;

  clear();

  // 2. Disegna Slider
  drawTimeline();
  
drawTimelineTooltip();
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

  // 6. Disegna legenda
  drawLegends();

  // 7. Disegna Tooltip 
  if (tooltipData && isHoveringCell) {
    drawTooltip();
  }

}

function drawHoverOverlay() {
  push();
  fill(CONFIG.colors.overlay + '80');
  noStroke();
  rect(0, 0, width, height);
  pop();
}

function drawTimeline() {
  drawSliderWaveGraph();
  
  fill(CONFIG.colors.slider.track);
  noStroke();
  rect(slider.x, slider.y, slider.width, 20, 5);

  drawSliderDataPoints(slider.y);

  stroke(CONFIG.colors.slider.track);
  strokeWeight(2);
  fill(CONFIG.colors.slider.thumb);
  ellipse(slider.thumb.x, slider.y + 10, slider.thumb.width);
  noStroke();

  // --- Year Box in Center ---
  const boxX = width / 2;
  const boxY = 20; // sopra lo slider

  
  textStyle(NORMAL);

  textSize(12);
  textAlign(LEFT);
  text(yearRange.min, slider.x, slider.y + 45);
  textAlign(RIGHT);
  text(yearRange.max, slider.x + slider.width, slider.y + 45);
}

function drawSliderDataPoints(y) {
  const years = Object.keys(yearDataCounts).map(Number).sort((a, b) => a - b);

  for (let year of years) {
    const x = map(year, yearRange.min, yearRange.max, slider.x, slider.x + slider.width);
    const pointHeight = 6.5;

    // Rimuovi qualsiasi modifica a variabili globali
    // if (dist(mouseX, mouseY, x, y + 10) < 8) {
    //   hoveredTimelineYear = year;
    // }

    fill(CONFIG.colors.slider.circle);
    ellipse(x, y + 10, pointHeight);
  }
}



function drawSliderWaveGraph() {
  const originalDataCounts = {
    ...yearDataCounts
  };

  if (selectedCountry) {
    calculateYearDataCounts();
  }

  const allYearData = {};
  for (let year = yearRange.min; year <= yearRange.max; year++) {
    allYearData[year] = yearDataCounts[year] || 0;
  }

  const years = Object.keys(allYearData).map(Number).sort((a, b) => a - b);
  const graphHeight = 30;
  const graphY = slider.y - graphHeight;

  // Disegna linea che indica la parte più alta del grafico
  push();
  stroke(CONFIG.colors.slider.wave);
  strokeWeight(1);
  line(slider.x, graphY, slider.x + slider.width, graphY);
  
  // Etichetta "max data availability" a sinistra della linea
  noStroke();
  fill(CONFIG.colors.slider.wave);
  textSize(10);
  textAlign(LEFT, BOTTOM);
  text("Max data\navailability", slider.x - 53, graphY + 12);
  pop();
  
  push();
  noFill();


  push();
  beginShape();
  stroke(CONFIG.colors.slider.wave);
  strokeWeight(2);
  fill(CONFIG.colors.slider.wave + '30');

  vertex(slider.x, graphY + graphHeight + 10);

  for (let year of years) {
    const x = map(year, yearRange.min, yearRange.max, slider.x, slider.x + slider.width);
    const dataRatio = allYearData[year];
    const y = graphY + graphHeight - (dataRatio * graphHeight);
    vertex(x, y);
  }

  vertex(slider.x + slider.width, graphY + graphHeight + 10);
  endShape(CLOSE);

  noStroke();
  fill(CONFIG.colors.slider.wave);
  for (let year of years) {
    const dataRatio = allYearData[year];
    if (dataRatio > 0) {
      const x = map(year, yearRange.min, yearRange.max, slider.x, slider.x + slider.width);
      const y = graphY + graphHeight - (dataRatio * graphHeight);
      ellipse(x, y, 4);
    }
  }
  pop();

  if (selectedCountry) {
    yearDataCounts = originalDataCounts;
  }
}

// calcolo colonne nella larghezza definita
function getDynamicColumns() {
  return max(1, floor(CONFIG.layout.gridWidth / (TARGET_CELL_WIDTH + CELL_SPACING)));
}

function checkGridHover(items, startY) {
   if (tutorialOpen) return;
  const dynamicCols = getDynamicColumns();
  const cellWidth = TARGET_CELL_WIDTH;
  const cellHeight = Math.round(cellWidth * (INTERNAL_NOMINAL_H / INTERNAL_NOMINAL_W));

  const startX = CONFIG.layout.margin.horizontal;

  const hoverReduction = 0.5;
  const hoverWidth = cellWidth * hoverReduction;
  const hoverHeight = cellHeight * hoverReduction;

  let currentX = startX;
  let currentY = startY;

  for (let i = 0; i < items.length; i++) {
    const commodity = items[i];

    if (i > 0 && i % dynamicCols === 0) {
      currentX = startX;
      currentY += cellHeight - 20 + CELL_SPACING;
    }

    const hoverX = currentX + (cellWidth - hoverWidth) / 2;
    const hoverY = currentY + (cellHeight - hoverHeight) / 2;

    if (
      mouseX >= hoverX &&
      mouseX <= hoverX + hoverWidth &&
      mouseY >= hoverY &&
      mouseY <= hoverY + hoverHeight
    ) {
      return {
        commodity: commodity,
        x: currentX,
        y: currentY,
        w: cellWidth,
        h: cellHeight,
        index: i,
        hasData: true
      };
    }

    currentX += cellWidth + CELL_SPACING;
  }

  return null;
}

function drawFlexGrid(items, startY) {
  const dynamicCols = getDynamicColumns();
  const cellWidth = TARGET_CELL_WIDTH;
  const cellHeight = Math.round(cellWidth * (INTERNAL_NOMINAL_H / INTERNAL_NOMINAL_W));

  const startX = CONFIG.layout.margin.horizontal;

  let currentX = startX;
  let currentY = startY;

  for (let i = 0; i < items.length; i++) {
    const item = items[i];

    if (i > 0 && i % dynamicCols === 0) {
      currentX = startX;
      currentY += cellHeight - 20 + CELL_SPACING;
    }

    if (i === hoveredCellIndex && isHoveringCell) {
      // Viene disegnata dopo sopra l'overlay
    } else {
      drawComplexCell(item, currentX, currentY, cellWidth, cellHeight, i);
      drawCellDetails(item, currentX, currentY, cellWidth, cellHeight);
    }

    currentX += cellWidth + CELL_SPACING;
  }

  const footerBuffer = 150;
  if (height < currentY + cellHeight + footerBuffer) {
    resizeCanvas(windowWidth, currentY + cellHeight + footerBuffer);
  }
}

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
    x,
    y,
    w,
    h,
    commodity,
    lossPercentage,
    supplyChainPhase,
    mainCauseOfWaste,
    hasData,
    index
  } = tooltipData;

  const tooltipW = TOOLTIP_CONFIG.w;
  const tooltipH = hasData ? TOOLTIP_CONFIG.h_data : TOOLTIP_CONFIG.h_nodata;
  const pad = TOOLTIP_CONFIG.pad;
  const offset = TOOLTIP_CONFIG.offset;

  const dynamicCols = getDynamicColumns();
  const column = index % dynamicCols;

  let ttX;

  const rightX = x + w + offset;
  const leftX = x - tooltipW - offset;
  const canFitRight = (rightX + tooltipW) <= (width - pad);
  const canFitLeft = leftX >= pad;

  if (column === 0) {
    ttX = rightX;
    if (!canFitRight) {
      ttX = leftX;
    }
  } else if (column === dynamicCols - 1) {
    ttX = leftX;
    if (!canFitLeft) {
      ttX = rightX;
    }
  } else {
    if (canFitLeft) {
      ttX = leftX;
    } else {
      ttX = rightX;
    }
  }

  let ttY = y + (h / 2) - (tooltipH / 2);

  if (ttY < pad) {
    ttY = pad;
  }
  if (ttY + tooltipH > height - pad) {
    ttY = height - tooltipH - pad;
  }

  push();

  drawingContext.shadowOffsetX = 2;
  drawingContext.shadowOffsetY = 2;
  drawingContext.shadowBlur = 8;
  drawingContext.shadowColor = 'rgba(0, 0, 0, 0.3)';

  fill(TOOLTIP_CONFIG.bgColor);
  noStroke();
  rect(ttX, ttY, tooltipW, tooltipH, TOOLTIP_CONFIG.radius);

  drawingContext.shadowBlur = 0;
  drawingContext.shadowOffsetX = 0;
  drawingContext.shadowOffsetY = 0;

  fill(TOOLTIP_CONFIG.textColor);
  textAlign(LEFT, TOP);

  let textY = ttY + pad;

  textSize(20);
  textStyle(BOLD);
  textFont(CONFIG.typography.fontFamily);
  text(commodity, ttX + pad, textY);
  textY += 30;

  if (hasData) {
    textStyle(NORMAL);
    textSize(16);

    const lossText = `Loss: ${nf(lossPercentage, 0, 1)}%`;
    text(lossText, ttX + pad, textY);
    textY += 24;
     
    // Testo 
    let supplyText = `Supply chain phase: ${supplyChainPhase}`;
    text(supplyText, ttX + 20, textY);
  } else {
    textSize(16);
    fill('#FFFFFF');
    text("Data not available for this year", ttX + pad, textY + 5);
  }

  pop();
}

function drawComplexCell(commodityName, x, y, w, h, cellIndex) {
  push();
  noFill();
  stroke(0, 12);
  strokeWeight(0);
  rect(x, y, w, h, 8);

  const pb = 13;
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

  // Calcola le coordinate del cestino PRIMA di verificare i dati
  const nominalW = INTERNAL_NOMINAL_W + 50;
  const nominalH = INTERNAL_NOMINAL_H + 50;
  const scaleInner = Math.min(1, baseW / (nominalW + 12), baseH / (nominalH + 12));
  const innerW = Math.round(nominalW * scaleInner);
  const innerH = Math.round(nominalH * scaleInner);
  const innerX = baseX + Math.round((baseW - innerW) / 2);
  const innerBottomY = baseY + baseH - Math.round(innerH * 0.08)+12;

  const rowData = data.find(d =>
    d.country === selectedCountry &&
    d.year === selectedYear &&
    d.commodity === commodityName
  );

  // === NO DATA ===
  if (!rowData) {
    if (img_over && img_over.width) {
      const s = Math.min(availW / img_over.width, availH / img_over.height);
      const bw = Math.round(img_over.width * s);
      const bh = Math.round(img_over.height * s);
      image(img_over, baseX, baseY, baseW, baseH);
    }

    const norm = normalizeFilename(commodityName);
    const iconImg = commodityOutline[norm] || null;

    if (iconImg && iconImg.width) {
      const maxIconW = Math.round(w * 0.5);
      const iconScale = Math.min(maxIconW / iconImg.width, (h * 0.35) / iconImg.height) * 0.8;
      const iw = Math.round(iconImg.width * iconScale);
      const ih = Math.round(iconImg.height * iconScale);
      imageMode(CENTER);
      image(iconImg, x + w / 2, baseY + ih * 1.3, iw, ih);
    } else {
      push();
      fill(0, 120);
      noStroke();
      textSize(12);
      textAlign(CENTER, CENTER);
      textFont(CONFIG.typography.fontFamily);
      text(commodityName, x + w / 2, baseY - 12);
      pop();
    }

    // === DISEGNA MAX/MIN LABELS ANCHE PER CESTINI SENZA DATI ===
    if (cellIndex === 0) {
      drawMaxMinLabels(innerX, innerBottomY, innerH);
    }

    pop();
    return;
  }

  // === FILL LEVEL ===
  let pct = isNaN(rowData.loss) ? 0 : Math.max(0, Math.min(100, rowData.loss));

  //  Altezza minima garantita
  if (pct > 0 && pct < MIN_FILL_PERCENTAGE) {
    pct = MIN_FILL_PERCENTAGE;
  }

  // Altezza con map()
  const fillH = map(pct, 0, 100, MIN_FILL_HEIGHT, innerH);
  let fillY = innerBottomY - fillH - 18;

  const innerTopY = innerBottomY - innerH;
  if (fillY < innerTopY) fillY = innerTopY;

  // === IMMAGINE RIEMPIMENTO CON CLIPPING ===
  const fullRow = getFullDataRow(
    selectedCountry,
    selectedYear,
    commodityName
  );

  const fillImg = getFillImage(
    fullRow.supplyChainPhase,
    fullRow.mainCauseOfWaste
  );

  // Disegno del rettangolo colorato in base alla food_supply_stage
  push();
  noStroke();
  
  fill(LEVEL2_COLOR);
  rect(innerX + 4, fillY - 8, innerW - 10, fillH + 8);
  pop();
 

  // === BASKET OVERLAY ===
  if (img_over && img_over.width)
    image(img_over, baseX, baseY, baseW, baseH);

  // === ICONA (Piena - DATA PRESENTE) ===
  const norm = normalizeFilename(commodityName);
  const iconImg = commodityImgs[norm] || null;
  if (iconImg && iconImg.width) {
    const maxIconW = Math.round(w * 0.5);
    const iconScale = Math.min(maxIconW / iconImg.width, (h * 0.35) / iconImg.height) * 0.8;
    const iw = Math.round(iconImg.width * iconScale);
    const ih = Math.round(iconImg.height * iconScale);
    imageMode(CENTER);
    image(iconImg, x + w / 2, baseY + ih * 1.3, iw, ih);
  } else {
    push();
    fill(0, 120);
    noStroke();
    textSize(12);
    textFont(CONFIG.typography.fontFamily);
    textAlign(CENTER, CENTER);
    text(commodityName, x + w / 2, baseY - 12);
    pop();
  }

  // === DISEGNA MAX/MIN LABELS SOLO SUL PRIMO CESTINO ===
  if (cellIndex === 0) {
    drawMaxMinLabels(innerX, innerBottomY, innerH);
  }

  pop();
}

function drawMaxMinLabels(innerX, innerBottomY, innerH) {
  push();
  
  // Posizioni dei label
  const maxLabelY = innerBottomY - innerH +3;  // Sopra il cestino
  const minLabelY = innerBottomY-25;           // Sotto il cestino
  const labelX = innerX -10;                    // A sinistra del cestino
  
  // Stile del testo
  fill('#415E5A');
  noStroke();
  textFont('Roboto Mono');
  textSize(14);
  textStyle(NORMAL);
  textAlign(RIGHT, CENTER);
  
  // Disegna "max" in alto
  text('max', labelX, maxLabelY);
  
  // Disegna "min" in basso
  text('min', labelX, minLabelY);
  
  pop();
}

function drawHoveredCell() {
  const dynamicCols = getDynamicColumns();
  const cellWidth = TARGET_CELL_WIDTH;
  const cellHeight = Math.round(cellWidth * (INTERNAL_NOMINAL_H / INTERNAL_NOMINAL_W));
  
  const startX = CONFIG.layout.margin.horizontal;

  let currentX = startX;
  let currentY = GRID_START_Y;

  for (let i = 0; i < commodities.length; i++) {
    const commodity = commodities[i];

    if (i > 0 && i % dynamicCols === 0) {
      currentX = startX;
      currentY += cellHeight - 20 + CELL_SPACING;
    }

    if (i === hoveredCellIndex) {
      drawComplexCell(commodity, currentX, currentY, cellWidth, cellHeight, i);
      drawCellDetails(commodity, currentX, currentY, cellWidth, cellHeight);
      return;
    }

    currentX += cellWidth + CELL_SPACING;
  }
}

function drawLegends(){
    // Puoi aggiungere altre legende qui se necessario
    drawSizeLegend();
    drawInfoLegend();
    drawSliderLegend();
}

function drawSliderLegend() {
    const legendX = slider.x
    const legendY = 15;
    push();
    fill(CONFIG.colors.slider.track);
    noStroke();
    
    rect(legendX, legendY, 200, 70, 8);
    pop();

    // Testo della legenda
    push();
    fill(CONFIG.colors.background);
    noStroke();
    textFont(CONFIG.typography.fontFamily);
    textAlign(LEFT, TOP);
    textSize(CONFIG.typography.legendSliderSize +1);
    textLeading(14); // interlinea
    const textX = legendX + 10;
    const textY = legendY + 16;
    text(
        "The graph above the timeline\nshows the amount of food waste\ndata available by year.",
        textX,
        textY
    );
    pop();
}

function drawInfoLegend() {
    const legendX = width - CONFIG.layout.legend.marginRight - CONFIG.layout.legend.width;
    const legendY = GRID_START_Y + 20;
    const padding = CONFIG.layout.legend.padding;
    const legendWidth = CONFIG.layout.legend.width + 40;
    const legendHeight = 395;
    
    push();

    // Sfondo della legenda
    fill(CONFIG.colors.overlay);
    noStroke();
    rect(legendX, legendY, legendWidth+20, legendHeight+70, 8);

    let currentY = legendY + padding;

    // --- legenda DIDASCALIA ---
    fill(CONFIG.colors.background);
    noStroke();
    textFont(CONFIG.typography.fontFamily);
    textAlign(LEFT, TOP);

    // 1) Testo principale 
    textSize(CONFIG.typography.legendSize - 5);
    textStyle(NORMAL);
    textLeading(16); // interlinea

    const textX = legendX + padding;
    const textY = currentY;

    text(
        "Each bin is filled according to\nthe percentage of waste for\neach commodity.\n\nWhen present, the glyph below\nindicates the primary cause\nof loss.",
        textX,
        textY
    );

    currentY +=115;

    // 2) Testo Cause of loss
    textSize(CONFIG.typography.legendSize - 5);
    textStyle(BOLD);
    text("Causes of loss:", textX, currentY);

    currentY +=25;

  
   // 3) Immagini cause of loss
    let causes = ["conservation", "disease", "machinery damage", "market", "drying", "processing",
                  "environmental factor", "storage", "harvest and management", "transport",  "waste", "insects, parasites and animals"];
    
    for (let i = 0; i < causes.length; i++) {
      const cause = causes[i];
      const normCause = normalizeFilename(cause);
      const imgSize = 38; // Leggermente più grande per visibilità
      const spacingX = 115;
      const spacingY = 42;
      const xPos = textX + (i % 2) * spacingX;
      const yPos = currentY + Math.floor(i / 2) * spacingY;

      // Disegna l'immagine se caricata, altrimenti usa un cerchio di fallback
      if (causeImgs[normCause]) {
        imageMode(CENTER);
        image(causeImgs[normCause], xPos + imgSize / 2, yPos + imgSize / 2, imgSize, imgSize);
      } else {
        fill(CONFIG.colors.background + '50'); // Cerchio semi-trasparente se manca l'immagine
        noStroke();
        ellipse(xPos + imgSize / 2, yPos + imgSize / 2, imgSize);
      }

      // Testo a fianco
      let causeText = cause.replace(" and ", ", ");
      if (causeText.length > 15) {
        causeText = causeText.replace(/ /g, '\n');
      }   

      fill(CONFIG.colors.background);
      textLeading(10);
      textSize(11);
      textAlign(LEFT, CENTER);
      textStyle(NORMAL);
      // Sposta il testo leggermente a destra dell'immagine
      text(causeText, xPos + imgSize + 6, yPos + imgSize / 2);
    }

    currentY +=255;

    // Linea separatrice
    stroke(CONFIG.colors.background);
    strokeWeight(1);
    line(legendX + padding, currentY, legendX + legendWidth - padding, currentY);
    
    // Immagine outline e testo "dato non presente"
    currentY += 25;
    const outlineImageY = currentY;
    
    if (legendImage && legendImage.width > 0) {
        const outlineImg = legendImage;
        if (outlineImg && outlineImg.width > 0) {
            push();
            imageMode(CENTER);
            noSmooth();
            
            const imgSize = 35;
            const scale = imgSize / max(outlineImg.width, outlineImg.height);
            const w = outlineImg.width * scale;
            const h = outlineImg.height * scale;
            
            image(outlineImg, legendX + 30, outlineImageY, w, h);
            pop();
            smooth();
        }
    }
    
    // Testo "dato non presente"
    fill(CONFIG.colors.background);
    noStroke();
    textSize(CONFIG.typography.legendSize);
    textFont(CONFIG.typography.fontFamily);
    textAlign(LEFT, CENTER);
    text("No available data", legendX + 50, outlineImageY+3);
    
    pop();
}

function drawSizeLegend() {
    const legendX = width - CONFIG.layout.legend.marginRight - CONFIG.layout.legend.width;
    const legendY = GRID_START_Y + 75 + 420;
    const padding = CONFIG.layout.legend.padding;
    
    // 1. PRIMA CALCOLA L'ALTEZZA NECESSARIA
    const totalStages = foodSupplyStage.length;
    
    // Parametri layout
    const maxIconsPerRow = 3;
    const iconSize = 22;
    const iconSpacingY = 30;
    const stageLabelHeight = 40;
    
    // Raccogli commodity per stage
    const stageCommodities = {};
    foodSupplyStage.forEach(stage => {
        stageCommodities[stage] = [];
    });
    
    // Popola con dati reali
    for (let i = 0; i < data.length; i++) {
        const row = data[i];
        if (row.country === selectedCountry && row.year === selectedYear && row.loss) {
            const fullRow = getFullDataRow(selectedCountry, selectedYear, row.commodity);
            if (fullRow && fullRow.supplyChainPhase) {
                const stage = fullRow.supplyChainPhase.toLowerCase().replace(/\s+/g, '');
                if (stageCommodities[stage] && !stageCommodities[stage].includes(row.commodity)) {
                    stageCommodities[stage].push(row.commodity);
                }
            }
        }
    }
    
    // Calcola altezza totale necessaria
    let totalHeightNeeded = 0;
    const stageHeights = {};
    
    foodSupplyStage.forEach(stage => {
        const commoditiesList = stageCommodities[stage] || [];
        const commodityCount = commoditiesList.length;
        
        let stageHeight = stageLabelHeight;
        if (commodityCount > 0) {
            const iconRows = Math.ceil(commodityCount / maxIconsPerRow);
            stageHeight += iconRows * iconSpacingY;
        }
        
        stageHeights[stage] = stageHeight;
        totalHeightNeeded += stageHeight;
    });
    
    // Aggiungi padding superiore e inferiore, titolo, ecc.
    const titleAreaHeight = 150; // Titolo + spazio
    const bottomAreaHeight = 30; // Spazio in basso
    const calculatedHeight = titleAreaHeight + totalHeightNeeded + bottomAreaHeight;
    
    // Usa l'altezza calcolata invece di quella fissa
    const legendHeight = min(calculatedHeight, height - legendY - 50); // Non oltre l'altezza del canvas
    const legendWidth = CONFIG.layout.legend.width + 62;
    
    // Calcola lineBottomY in base all'altezza calcolata
    const lineX = legendX + 30;
    const lineTopY = legendY + titleAreaHeight - 20;
    const lineBottomY = legendY + legendHeight - bottomAreaHeight;
    
    push();
    
    // Sfondo della legenda
    fill(CONFIG.colors.legend.background);
    stroke(CONFIG.colors.legend.border);
    strokeWeight(2);
    rect(legendX, legendY, legendWidth, legendHeight, 12);
    
    // Titolo
    fill('#415E5A');
    noStroke();
    textFont(CONFIG.typography.fontFamily);
    textAlign(LEFT, TOP);
    textSize(CONFIG.typography.legendSize);
    textStyle(BOLD);
    
    const titleX = legendX + 15;
    let currentY = legendY + padding;
    
    text("Waste along\nthe supply chain", titleX, currentY);
    
    currentY += 50;
    textSize(CONFIG.typography.legendSize - 5);
    textStyle(NORMAL);
    text('This scheme maps each\ncommodity to the supply\nchain stage where greatest\nwaste occurrs', titleX, currentY);
    
    currentY += 40;

    // Linea verticale - SOLO FINO ALL'ULTIMO STAGE
    stroke('#415E5A');
    strokeWeight(2);
    strokeCap(ROUND);
    
    // Calcola l'ultima Y effettiva
    let lastStageY = lineTopY;
    let actualLastY = currentY;
    
    for(let i = 0; i < totalStages; i++) {
        const stage = foodSupplyStage[i];
        const baseStageHeight = stageHeights[stage];
        // Non scaliamo più, usiamo altezza reale
        lastStageY += baseStageHeight;
        if (i === totalStages - 1) {
            actualLastY = lastStageY;
        }
    }
    // Variabili per memorizzare icone da disegnare DOPO (per tooltip sopra)
    const iconsToDraw = [];
    
    // DISEGNA TUTTI GLI STAGES IN ORDINE
    let currentStageY = lineTopY + 20;

    // Disegna linea solo fino all'ultimo stage
    const actualLineBottomY = min(actualLastY, lineBottomY);
    line(lineX, currentStageY, lineX, actualLineBottomY);
    
    
    for(let i = 0; i < totalStages; i++) {
        const stage = foodSupplyStage[i];
        const commoditiesList = stageCommodities[stage] || [];
        const commodityCount = commoditiesList.length;
        
        const baseStageHeight = stageHeights[stage];
        const pointY = currentStageY;
        
        // PUNTO DELLO STAGE (sempre disegnato)
        push();
        noStroke();
        
        if (commodityCount > 0) {
            fill('#415E5A');
        } else {
            fill('#415E5A');
            stroke('#415E5A');
            strokeWeight(1);
        }
        
        circle(lineX, pointY, 16);
        
        fill(CONFIG.colors.legend.background);
        if (commodityCount === 0) {
            strokeWeight(0);
        }
        circle(lineX, pointY, 8);
        pop();
        
        // NOME DELLO STAGE
        push();
        fill('#415E5A');
        noStroke();
        textSize(CONFIG.typography.legendSize - 3);
        textFont(CONFIG.typography.fontFamily);
        textStyle(BOLD);
        textAlign(LEFT, CENTER);
        
        const formattedStage = getFormattedStageName(stage);
        text(formattedStage, lineX + 20, pointY);
        pop();
        
        // RACCOGLI LE COMMODITY PER DISEGNARLE DOPO
        if (commodityCount > 0) {
            const iconRows = Math.ceil(commodityCount / maxIconsPerRow);
            const iconsStartY = pointY + 25;
            
            for (let row = 0; row < iconRows; row++) {
                const rowY = iconsStartY + (row * iconSpacingY);
                const iconsInThisRow = Math.min(maxIconsPerRow, commodityCount - (row * maxIconsPerRow));
                
                for (let iconIndex = 0; iconIndex < iconsInThisRow; iconIndex++) {
                    const globalIndex = (row * maxIconsPerRow) + iconIndex;
                    const commodityName = commoditiesList[globalIndex];
                    const norm = normalizeFilename(commodityName);
                    const iconImg = commodityImgs[norm];
                    
                    const rowStartX = lineX + 40;
                    const iconX = rowStartX + (iconIndex * (iconSize + 8)) + (iconSize / 2);
                    
                    iconsToDraw.push({
                        iconImg,
                        commodityName,
                        x: iconX,
                        y: rowY,
                        size: iconSize,
                        norm
                    });
                }
            }
        }
        
        currentStageY += baseStageHeight;
    }
    
    // ORA DISEGNA TUTTE LE ICONE (dopo gli stages)
    iconsToDraw.forEach(iconData => {
        const { iconImg, commodityName, x, y, size, norm } = iconData;
        
        if (iconImg && iconImg.width > 0) {
            push();
            imageMode(CENTER);
            
            const scale = size / max(iconImg.width, iconImg.height);
            const w = iconImg.width * scale;
            const h = iconImg.height * scale;
            
            image(iconImg, x, y, w, h);
            pop();
        } else {
            push();
            fill('#415E5A');
            noStroke();
            circle(x, y, size * 0.7);
            
            fill(CONFIG.colors.legend.background);
            textSize(10);
            textAlign(CENTER, CENTER);
            text(commodityName.charAt(0).toUpperCase(), x, y);
            pop();
        }
    });
    
    // ORA DISEGNA I TOOLTIP (sopra le icone)
    iconsToDraw.forEach(iconData => {
        const { commodityName, x, y, size } = iconData;
        
        if (dist(mouseX, mouseY, x, y) < size / 2) {
            drawIconTooltip(mouseX, mouseY, commodityName);
        }
    });
    
    // Se non ci sono dati
    const totalCommodities = Object.values(stageCommodities).reduce((sum, arr) => sum + arr.length, 0);
    if (totalCommodities === 0) {
        push();
        fill('#888888');
        noStroke();
        textSize(CONFIG.typography.legendSize - 3);
        textAlign(LEFT, CENTER);
        text("No data available\nfor selected filters", 
             legendX + 15, legendY + legendHeight - 22);
        pop();
    }
    
    // Contatore in basso (solo se ci sono commodity)
    if (totalCommodities > 0) {
        push();
        fill('#415E5A');
        noStroke();
        textSize(CONFIG.typography.legendSize - 4);
        textAlign(LEFT, CENTER);
        text(`${totalCommodities} commodities`, legendX + 15, legendY + legendHeight - 15);
        pop();
    }
    
    pop();
}

function drawIconTooltip(x, y, commodityName) {
    push();
    
    // Calcola dimensioni
    textSize(11);
    const textW = textWidth(commodityName);
    const tooltipW = textW + 20;
    const tooltipH = 25;
    
    // Posiziona senza uscire dallo schermo
    let tooltipX = x + 15;
    let tooltipY = y + 15;
    
    if (tooltipX + tooltipW > width - 10) tooltipX = x - tooltipW - 15;
    if (tooltipY + tooltipH > height - 10) tooltipY = y - tooltipH - 15;
    
    // Sfondo con bordo
    fill('#415E5A');
    stroke('#283618');
    strokeWeight(1);
    rect(tooltipX, tooltipY, tooltipW, tooltipH, 4);
    
    // Testo
    fill('#FFFFFF');
    noStroke();
    textAlign(CENTER, CENTER);
    text(commodityName, tooltipX + tooltipW / 2, tooltipY + tooltipH / 2);
    
    pop();
}

function getFormattedStageName(stage) {
    const stageNames = {
        'wholesupplychain': 'Whole chain',
        'pre-harvest': 'Pre-harvest',
        'harvest': 'Harvest',
        'post-harvest': 'Post-harvest',
        'farm': 'Farm',
        'grading': 'Grading',
        'packing': 'Packing',
        'storage': 'Storage',
        'transport': 'Transport',
        'collector': 'Collector',
        'trader': 'Trader',
        'market': 'Market',
        'processing': 'Processing',
        'wholesale': 'Wholesale',
        'distributor': 'Distributor',
        'retail': 'Retail',
        'export': 'Export',
        'foodservices': 'Food services',
        'households': 'Households'
    };
    
    return stageNames[stage] || stage.toUpperCase();
}


// Funzione per tooltip delle icone
function drawIconTooltip(x, y, commodityName) {
    push();
    
    // Calcola dimensioni del tooltip in base al testo
    const textWidth = commodityName.length * 7; // Stima approssimativa
    const tooltipW = textWidth + 20;
    const tooltipH = 25;
    
    // Posiziona il tooltip in modo che non esca dallo schermo
    let tooltipX = x + 15;
    let tooltipY = y + 15;
    
    if (tooltipX + tooltipW > width - 10) {
        tooltipX = x - tooltipW - 15;
    }
    if (tooltipY + tooltipH > height - 10) {
        tooltipY = y - tooltipH - 15;
    }
    
    // Sfondo del tooltip
    fill('#415E5A');
    noStroke();
    rect(tooltipX, tooltipY, tooltipW, tooltipH, 4);
    
    // Testo del tooltip
    fill('#FFFFFF');
    textSize(11);
    textAlign(CENTER, CENTER);
    text(commodityName, tooltipX + tooltipW / 2, tooltipY + tooltipH / 2);
    
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
    if (selectedYear > yearRange.min) {
      selectedYear--;
      updateSliderThumb();
      //updateYear();
    }
  } else if (event.key === 'ArrowRight') {
    if (selectedYear < yearRange.max) {
      selectedYear++;
      updateSliderThumb();
      //updateYear();
    }
  }
}

function updateVisualization() {
  const t = document.getElementById("title");
  if (t) t.textContent = `${selectedCountry || "—"} ${selectedYear || ""}`;
}
function drawCellDetails(commodityName, x, y, w, h) {
  push();
  // Posizionamento sotto la base del cestino
  const detailY = y + h - 85; 
  const centerX = x + w / 2;

  const rowData = getFullDataRow(selectedCountry, selectedYear, commodityName);
  
  // 1. Disegno l'icona della causa (piccola, sopra il nome)
  if (rowData && rowData.hasData && rowData.mainCauseOfWaste) {
    const normCause = normalizeFilename(rowData.mainCauseOfWaste);
    const cImg = causeImgs[normCause];
    if (cImg) {
      imageMode(CENTER);
      image(cImg, centerX-42, detailY - 144, 25, 25); // Dimensione icona 22px
    }
  }

  // 2. Disegno il nome della commodity (sotto l'icona)
  fill('#415E5A');
  noStroke();
  textAlign(CENTER, TOP);
  textSize(15);
  
  textFont(CONFIG.typography.fontFamily);
  textStyle(BOLD);
  // Scriviamo il nome in maiuscolo per ordine estetico
  text(commodityName.toUpperCase(), centerX, detailY + 32);
  
  pop();
}
/* =========================
   TUTORIAL OVERLAY CONTROL
========================= */

// ===== TUTORIAL BUTTON =====
const helpBtn = document.getElementById('helpBtn');
const tutorialOverlay = document.getElementById('tutorialOverlay');
const tutorialSection = document.getElementById('tutorialSection');
const tutorialCloseBtn = document.getElementById('tutorialCloseBtn');

if (helpBtn && tutorialSection && tutorialCloseBtn) {

    helpBtn.addEventListener('click', () => {
       tutorialOpen = true;
        tutorialSection.classList.add('active');
        tutorialOverlay.style.display = 'block';
        document.body.style.height = '100vh';
        document.body.style.overflow = 'hidden';
        const header = document.getElementById('headerBar');
        if(header) header.style.overflow = 'hidden';
    });

    tutorialCloseBtn.addEventListener('click', () => {
      tutorialOpen = false;         

    hoveredRowData = null;        
    hoveredRow = -1;
    hoveredCol = -1;
        tutorialSection.classList.remove('active');
        tutorialOverlay.style.display = 'none';
        document.body.style.height = '';
        document.body.style.overflow = '';
        const header = document.getElementById('headerBar');
        if(header) header.style.overflow = '';
    });

    tutorialOverlay.addEventListener('click', (e) => {
        if (e.target === tutorialOverlay) {
            tutorialSection.classList.remove('active');
            tutorialOverlay.style.display = 'none';
            document.body.style.height = '';
            document.body.style.overflow = '';
            const header = document.getElementById('headerBar');
            if(header) header.style.overflow = '';
        }
    });

}

function drawTimelineTooltip() {
  if (!isHoveringSlider) return;

  const x = constrain(mouseX, slider.x, slider.x + slider.width);
  const year = getYearFromX(x);

  const y = slider.y - 15;

  push();
  textSize(CONFIG.typography.sliderValueSize);
  textAlign(CENTER, BOTTOM);
  fill('#415E5A');
  noStroke();
  text(year, x, y);
  pop();
}

