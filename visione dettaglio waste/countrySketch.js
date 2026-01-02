// ===== CONFIGURAZIONE STILE (da Codice B) =====
const CONFIG = {
  colors: {
    background: '#FFFFFF',
    slider: {
      track: '#415E5A',
      thumb: '#F5F3EE',
      text: '#16201f',
      wave: '#415E5A'
    },
    overlay: '#415E5A',
    legend: {
      background: '#415E5A', // Colore di sfondo della legenda
      border: '#415E5A',
      circle: '#F5F3EE' // Colore dei pallini (stesso sfondo del sito)
    }
  },
  layout: {
    legend: {
      width: 180, // Leggermente più larga
      height: 500, // Più alta per ospitare l'immagine
      marginRight: 50, // Più vicina al centro
      padding: 15
    },
    margin: {
      horizontal: 300,
      vertical: 110
    }
  },
  typography: {
    fontFamily: 'Roboto',
    titleFont: 'Roboto',
    sliderValueSize: 20,
    tooltipSize: 12,
    legendSize: 18
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
const HEADER_HEIGHT_DOM = 0;
let SLIDER_Y_POS = 80;
let GRID_START_Y = 180;

// Colore riempimento commodity
const LEVEL2_COLOR = ['#EDC69A'];

// AGGIUNTO: Costante per altezza minima riempimento
const MIN_FILL_HEIGHT = 10;
const MIN_FILL_PERCENTAGE = 3;

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
    "../assets/dataset/cleaned_dataset_inglese.csv",
    "csv",
    "header",
    () => console.log("CSV caricato", table.getRowCount()),
    (err) => console.error("Errore CSV", err)
  );

  loadImageSafe(ASSETS_BASE + "empty.basket.png", img => img_empty = img);
  loadImageSafe(ASSETS_BASE + "empty.basket.png", img => img_over = img);
  loadImageSafe(ASSETS_BASE + "basket.png", img => img_basket = img);

  /*loadImageSafe(ASSETS_BASE + "glifi/default.png", img => fillImages.default = img);

  const stages = [
    "collector",
    "distributor",
    "export",
    "farm",
    "foodservices",
    "grading",
    "harvest",
    "households",
    "market",
    "packing",
    "post-harvest",
    "pre-harvest",
    "processing",
    "retail",
    "storage",
    "trader",
    "transport",
    "wholesupplychain",
    "wholesale"
  ];*/

  const causes = [
    "conservation",
    "diseasesandmolds",
    "drying",
    "environmentalfactors",
    "harvestandmanagement",
    "insects_parasitesandanimals",
    "machinerydamage",
    "market",
    "processing",
    "storage",
    "transport",
    "waste"
  ];

  /*for (let s of stages) {
    for (let c of causes) {
      const key = `${s}_${c}`;
      loadImageSafe(
        ASSETS_BASE + "glifi/" + key + ".png",
        img => fillImages[key] = img || null
      );
    }
  }*/
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
}

function getYearFromX(x) {
  const percent = constrain((x - slider.x) / slider.width, 0, 1);
  return yearRange.min + round(percent * (yearRange.max - yearRange.min));
}

// ===== INTERAZIONE MOUSE (P5.JS) =====

function mouseMoved() {
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
  if (dist(mouseX, mouseY, slider.thumb.x, slider.y + 5) < slider.thumb.width / 2) {
    slider.thumb.dragging = true;
    cursor('grabbing');
    return;
  }

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
  drawSizeLegend();

  // 6. Disegna Tooltip 
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

function drawHeaderInfo() {
  push();
  fill(0);
  noStroke();
  textFont(CONFIG.typography.fontFamily);
  textAlign(CENTER, TOP);
  textSize(40);

  const textToDisplay = `${selectedCountry || "Select Country"}`;

  text(textToDisplay, 735, 40);
  pop();
}

function drawTimeline() {
  drawSliderWaveGraph();

  fill(CONFIG.colors.slider.track);
  noStroke();
  rect(slider.x, slider.y, slider.width, 20, 5);

  drawSliderDataPoints();

  stroke(CONFIG.colors.slider.track);
  strokeWeight(2);
  fill(CONFIG.colors.slider.thumb);
  ellipse(slider.thumb.x, slider.y + 10, slider.thumb.width);
  noStroke();

  const boxW = 120;
  const boxH = 50;
  const boxX = slider.x + slider.width / 2 - boxW / 2;
  const boxY = slider.y + 80;

  fill('#415E5A');
  noStroke();
  textSize(14);
  textAlign(CENTER, TOP);
  textFont(CONFIG.typography.fontFamily);
  text("Selected Year", boxX + boxW / 2, boxY - 20);

  textSize(CONFIG.typography.sliderValueSize);
  textStyle(BOLD);
  textAlign(CENTER, CENTER);
  text(selectedYear, boxX + boxW / 2, boxY + boxH / 2 - 10);
  textStyle(NORMAL);

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
    const pointHeight = 6.5;
    const colorValue = LEVEL2_COLOR;
    fill(colorValue);

    ellipse(x, slider.y + 10, pointHeight);
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

function checkGridHover(items, startY) {
  const availableW = width - (SIDE_MARGIN * 2);
  const totalSpacing = (COLUMNS - 1) * CELL_SPACING;
  const cellWidth = floor((availableW - totalSpacing) / COLUMNS);
  const cellHeight = Math.round(cellWidth * (INTERNAL_NOMINAL_H / INTERNAL_NOMINAL_W));

  const gridTotalWidth = (cellWidth * COLUMNS) + totalSpacing;
  const centeringOffset = floor((width - gridTotalWidth) / 2);

  const hoverReduction = 0.5;
  const hoverWidth = cellWidth * hoverReduction;
  const hoverHeight = cellHeight * hoverReduction;

  let currentX = centeringOffset;
  let currentY = startY;

  for (let i = 0; i < items.length; i++) {
    const commodity = items[i];

    const rowData = data.find(d =>
      d.country === selectedCountry &&
      d.year === selectedYear &&
      d.commodity === commodity
    );

    if (!rowData) {
      if (i > 0 && i % COLUMNS === 0) {
        currentX = centeringOffset;
        currentY += cellHeight - 80 + CELL_SPACING;
      }
      currentX += cellWidth + CELL_SPACING;
      continue;
    }

    if (i > 0 && i % COLUMNS === 0) {
      currentX = centeringOffset;
      currentY += cellHeight - 80 + CELL_SPACING;
    }

    // Calcola l'area di hover ridotta centrata
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
        hoverX: hoverX, // Aggiunto per debug
        hoverY: hoverY, // Aggiunto per debug
        hoverW: hoverWidth, // Aggiunto per debug
        hoverH: hoverHeight, // Aggiunto per debug
        index: i,
        hasData: true
      };
    }

    currentX += cellWidth + CELL_SPACING;
  }

  return null;
}

const COLUMNS = 4;

function drawFlexGrid(items, startY) {
  const availableW = width - (SIDE_MARGIN * 2);
  const totalSpacing = (COLUMNS - 1) * CELL_SPACING;
  const cellWidth = floor((availableW - totalSpacing) / COLUMNS);
  const cellHeight = Math.round(cellWidth * (INTERNAL_NOMINAL_H / INTERNAL_NOMINAL_W));

  const gridTotalWidth = (cellWidth * COLUMNS) + totalSpacing;
  const centeringOffset = floor((width - gridTotalWidth) / 2);

  let currentX = centeringOffset;
  let currentY = startY;

  for (let i = 0; i < items.length; i++) {
    const item = items[i];

    if (i > 0 && i % COLUMNS === 0) {
      currentX = centeringOffset;
      currentY += cellHeight - 80 + CELL_SPACING;
    }

    if (i === hoveredCellIndex && isHoveringCell) {
      push();
      drawComplexCell(item, currentX, currentY, cellWidth, cellHeight);
      pop();
    } else {
      drawComplexCell(item, currentX, currentY, cellWidth, cellHeight);
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

  const column = index % COLUMNS;

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
  } else if (column === COLUMNS - 1) {
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
    fill('#EDC69A');
    text("Data not available for this year", ttX + pad, textY + 5);
  }

  pop();
}

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
    if (img_over && img_over.width) {
      const s = Math.min(availW / img_over.width, availH / img_over.height);
      const bw = Math.round(img_over.width * s);
      const bh = Math.round(img_over.height * s);
      image(img_over, baseX, baseY, baseW, baseH);
    }

    const norm = normalizeFilename(commodityName);
    const iconImg = commodityOutline[norm] || null;

    if (iconImg && iconImg.width) {
      const maxIconW = Math.round(w * 0.36);
      const iconScale = Math.min(maxIconW / iconImg.width, (h * 0.28) / iconImg.height) * 0.8;
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

    pop();
    return;
  }

  // === FILL LEVEL ===
  let pct = isNaN(rowData.loss) ? 0 : Math.max(0, Math.min(100, rowData.loss));

  // MODIFICA 1: Altezza minima garantita
  if (pct > 0 && pct < MIN_FILL_PERCENTAGE) {
    pct = MIN_FILL_PERCENTAGE;
  }

  const nominalW = INTERNAL_NOMINAL_W + 50;
  const nominalH = INTERNAL_NOMINAL_H + 50;
  const scaleInner = Math.min(1, baseW / (nominalW + 12), baseH / (nominalH + 12));
  const innerW = Math.round(nominalW * scaleInner);
  const innerH = Math.round(nominalH * scaleInner) + 5;
  const innerX = baseX + Math.round((baseW - innerW) / 2);
  const innerBottomY = baseY + baseH - Math.round(innerH * 0.08) + 5;

  // MODIFICA 2: Altezza con map()
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

  // === IMMAGINE RIEMPIMENTO SOPRA IL RETTANGOLO COLORATO ===
  /*if (fillImg) {
    push();
    drawingContext.save();
    drawingContext.beginPath();
    drawingContext.rect(innerX + 4, fillY - 8, innerW - 10, fillH + 8);
    drawingContext.clip();

    drawImageFillLevel(
      fillImg,
      innerX + 4,
      innerBottomY - 8,
      innerW - 10,
      innerH,
      fillH
    );

    drawingContext.restore();
    pop();
  }*/

  // Parte superiore curva (bianca)
  const hoverResult = checkGridHover(commodities, GRID_START_Y);
  if (!(hoverResult && hoverResult.commodity === commodityName)) {
    push();
    fill(CONFIG.colors.slider.thumb);
    ellipse(innerX + 70, fillY - 37, 170, 80);
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

  pop();
}

function drawHoveredCell() {
  const availableW = width - (SIDE_MARGIN * 2);
  const totalSpacing = (COLUMNS - 1) * CELL_SPACING;
  const cellWidth = floor((availableW - totalSpacing) / COLUMNS);
  const cellHeight = Math.round(cellWidth * (INTERNAL_NOMINAL_H / INTERNAL_NOMINAL_W));
  const gridTotalWidth = (cellWidth * COLUMNS) + totalSpacing;
  const centeringOffset = floor((width - gridTotalWidth) / 2);

  let currentX = centeringOffset;
  let currentY = GRID_START_Y;

  for (let i = 0; i < commodities.length; i++) {
    const commodity = commodities[i];

    if (i > 0 && i % COLUMNS === 0) {
      currentX = centeringOffset;
      currentY += cellHeight - 80 + CELL_SPACING;
    }

    if (i === hoveredCellIndex) {
      drawComplexCell(commodity, currentX, currentY, cellWidth, cellHeight);
      return;
    }

    currentX += cellWidth + CELL_SPACING;
  }
}

function drawSizeLegend() {
    const legendX = width - CONFIG.layout.margin.horizontal + 50;
    const legendY = GRID_START_Y + 20;
    const legendWidth = CONFIG.layout.legend.width;
    const legendHeight = CONFIG.layout.legend.height;
    const padding = CONFIG.layout.legend.padding;
    
    push();
    
    // Sfondo della legenda
    fill(CONFIG.colors.legend.background);
    noStroke();
    rect(legendX, legendY, legendWidth, legendHeight, 8);


    // --- legenda DIDASCALIA ---
    fill(CONFIG.colors.background);
    noStroke();
    textFont(CONFIG.typography.fontFamily);
    textAlign(LEFT, TOP);

    // 1) Testo principale 
    textSize(CONFIG.typography.legendSize);
    textLeading(14); // interlinea

    const textX = legendX + padding;
    const textY = legendY + padding;

    text(
        "Food supply stage",
        textX,
        textY
    );

    //fill("red");
    strokeWeight(5);
    stroke(CONFIG.colors.slider.thumb);
    line(legendX + legendWidth -20 , textY + 30, legendX + legendWidth -20 , legendY + legendHeight - 20);

    for(let i=0; i<19; i++){
      let divario = 20 * i;
      fill(CONFIG.colors.slider.thumb);
      circle(legendX + legendWidth -20, textY + 30 + (divario), 10);
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
    if (selectedYear > yearRange.min) {
      selectedYear--;
      updateSliderThumb();
      updateYear();
    }
  } else if (event.key === 'ArrowRight') {
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