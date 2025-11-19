// ===== CONFIGURAZIONE =====
const CONFIG = {
    colors: {
        background: '#fefae0',
        cell: {
            active: '#bc6c25',
            inactive: '#f8f9fa', 
            hoverActive: '#a35a1f',
            hoverInactive: '#e9ecef',
            dot: '#7f4f24',
            stroke: '#dee2e6'
        },
        text: {
            primary: '#283618',
            tooltip: '#283618'
        },
        tooltip: {
            background: '#ffffff',
            border: '#adb5bd'
        }
    },
    layout: {
        margin: 100,
        minCellHeight: 30,
        maxCellHeight: 50,
        maxCellWidth: 120
    },
    typography: {
        columnSize: 11,
        rowSize: 10,
        tooltipSize: 12,
        maxCountryChars: 18,
        fontFamily: 'Inter'
    }
};

// ===== VARIABILI GLOBALI =====
let dataset = [], commodities = [], countries = [];
let cellWidth, cellHeight;
let hoveredCol = -1, hoveredRow = -1;
let currentYear = 2014;
let yearRange = { min: 2000, max: 2023 }; // Default

// ===== CACHE =====
let combinationCache = {};
let currentCacheYear = null;

// ===== INIZIALIZZAZIONE =====
function preload() {
    dataset = loadTable('../assets/dataset/cleaned_dataset.csv', 'csv', 'header', initializeData);
}

function initializeData() {
    commodities = getUniqueValues('commodity');
    countries = getUniqueValues('country');
    
    // CALCOLA IL RANGE ANNI DAL DATASET
    calculateYearRange();
    
    // INIZIALIZZA LO SLIDER CON I DATI REALI
    initializeSliderWithData();
}

function calculateYearRange() {
    const years = [];
    for (let i = 0; i < dataset.getRowCount(); i++) {
        years.push(dataset.getNum(i, 'year'));
    }
    yearRange = {
        min: Math.min(...years),
        max: Math.max(...years)
    };
    console.log("Year range:", yearRange);
}

function initializeSliderWithData() {
    // Comunica con la pagina principale per aggiornare lo slider
    if (window.initializeSliderFromData) {
        window.initializeSliderFromData(yearRange);
    }
}

function getUniqueValues(columnName) {
    const values = new Set();
    for (let i = 0; i < dataset.getRowCount(); i++) {
        values.add(dataset.getString(i, columnName));
    }
    return Array.from(values);
}

function setup() {
    // CALCOLA ALTEZZA DINAMICA IN BASE AL NUMERO DI RIGHE
    const dynamicHeight = calculateDynamicHeight();
    const canvas = createCanvas(windowWidth, dynamicHeight);
    canvas.parent('p5-container');
    calculateCellSize();
    
    // Ascolta i cambiamenti dello slider dalla pagina principale
    setupSliderListener();
}

function calculateDynamicHeight() {
    const headerHeight = 150; // Spazio per header e slider
    const matrixHeight = CONFIG.layout.margin * 2 + (countries.length * CONFIG.layout.minCellHeight);
    const minHeight = 600; // Altezza minima
    return Math.max(matrixHeight + headerHeight, minHeight);
}

// ===== COMUNICAZIONE CON SLIDER =====
function setupSliderListener() {
    const yearSlider = document.getElementById("yearSlider");
    if (yearSlider) {
        yearSlider.addEventListener("input", function() {
            currentYear = parseInt(this.value);
            combinationCache = {};
            redraw();
        });
        
        // Imposta l'anno iniziale dal dataset
        currentYear = yearRange.max;
    }
}

function getCurrentYear() {
    const yearSlider = document.getElementById("yearSlider");
    return yearSlider ? parseInt(yearSlider.value) : currentYear;
}

// ===== LAYOUT =====
function calculateCellSize() {
    const availableW = width - CONFIG.layout.margin * 2;
    const availableH = height - CONFIG.layout.margin * 2;

    cellWidth = min(availableW / commodities.length, CONFIG.layout.maxCellWidth);
    cellHeight = constrain(
        availableH / countries.length,
        CONFIG.layout.minCellHeight,
        CONFIG.layout.maxCellHeight
    );
}

function windowResized() {
    const dynamicHeight = calculateDynamicHeight();
    resizeCanvas(windowWidth, dynamicHeight);
    calculateCellSize();
}

// ===== RENDER =====
function draw() {
    background(CONFIG.colors.background);
    if (commodities.length === 0) return;

    const year = getCurrentYear();
    updateHoveredCell();
    drawColumnLabels();
    drawRowLabels();
    drawMatrix(year);
    
    if (isValidCell(hoveredRow, hoveredCol)) {
        drawTooltip();
    }
}

function updateHoveredCell() {
    hoveredCol = floor((mouseX - CONFIG.layout.margin) / cellWidth);
    hoveredRow = floor((mouseY - CONFIG.layout.margin) / cellHeight);
}

function drawColumnLabels() {
    drawLabels(commodities, CONFIG.typography.columnSize, (i) => ({
        x: CONFIG.layout.margin + i * cellWidth + 5,
        y: CONFIG.layout.margin - 15,
        rotation: -PI / 4
    }));
}

function drawRowLabels() {
    drawLabels(countries, CONFIG.typography.rowSize, (i) => ({
        x: 10,
        y: CONFIG.layout.margin + i * cellHeight + cellHeight / 2,
        truncate: CONFIG.typography.maxCountryChars
    }), false);
}

function drawLabels(items, fontSize, positionCallback, rotated = true) {
    push();
    textAlign(LEFT, CENTER);
    textSize(fontSize);
    textFont(CONFIG.typography.fontFamily); 
    fill(CONFIG.colors.text.primary);

    for (let i = 0; i < items.length; i++) {
        const pos = positionCallback(i);
        let labelText = items[i];
        
        if (pos.truncate && labelText.length > pos.truncate) {
            labelText = labelText.slice(0, pos.truncate) + '…';
        }

        if (rotated) {
            push();
            translate(pos.x, pos.y);
            rotate(pos.rotation);
            text(labelText, 0, 0);
            pop();
        } else {
            text(labelText, pos.x, pos.y);
        }
    }
    pop();
}

function drawMatrix(currentYear) {
    if (currentCacheYear !== currentYear) {
        combinationCache = {};
        currentCacheYear = currentYear;
    }
    
    for (let r = 0; r < countries.length; r++) {
        for (let c = 0; c < commodities.length; c++) {
            drawCell(r, c, currentYear);
        }
    }
}

function drawCell(row, col, year) {
    const x = CONFIG.layout.margin + col * cellWidth;
    const y = CONFIG.layout.margin + row * cellHeight;
    
    const exists = checkCombinationCached(countries[row], commodities[col], year);
    const isHovered = (row === hoveredRow || col === hoveredCol);

    setCellStyle(exists, isHovered);
    drawCellRect(x, y);
    
    if (exists) {
        drawCellDot(x, y);
    }
}

function checkCombinationCached(country, commodity, year) {
    const cacheKey = `${country}-${commodity}-${year}`;
    
    if (combinationCache[cacheKey] === undefined) {
        combinationCache[cacheKey] = checkCombination(country, commodity, year);
    }
    
    return combinationCache[cacheKey];
}

function setCellStyle(exists, isHovered) {
    if (exists) {
        fill(isHovered ? CONFIG.colors.cell.hoverActive : CONFIG.colors.cell.active);
    } else {
        fill(isHovered ? CONFIG.colors.cell.hoverInactive : CONFIG.colors.cell.inactive);
    }
    stroke(CONFIG.colors.cell.stroke);
    strokeWeight(0.5);
}

function drawCellRect(x, y) {
    rect(x, y, cellWidth, cellHeight);
}

function drawCellDot(x, y) {
    fill(CONFIG.colors.cell.dot);
    noStroke();
    ellipse(x + cellWidth / 2, y + cellHeight / 2, min(cellWidth, cellHeight) * 0.4);
}

function drawTooltip() {
    if (!isValidCell(hoveredRow, hoveredCol)) return;

    const tooltipText = `${countries[hoveredRow]} — ${commodities[hoveredCol]}`;
    const w = textWidth(tooltipText) + 12;
    
    push();
    textSize(CONFIG.typography.tooltipSize);
    textFont(CONFIG.typography.fontFamily); 
    
    fill(CONFIG.colors.tooltip.background);
    stroke(CONFIG.colors.tooltip.border);
    rect(mouseX + 10, mouseY + 10, w, 24, 4);
    
    noStroke();
    fill(CONFIG.colors.text.tooltip);
    text(tooltipText, mouseX + 16, mouseY + 26);
    pop();
}

function isValidCell(row, col) {
    return row >= 0 && row < countries.length && col >= 0 && col < commodities.length;
}

function checkCombination(country, commodity, year) {
    for (let i = 0; i < dataset.getRowCount(); i++) {
        if (dataset.getNum(i, 'year') !== year) continue;
        if (dataset.getString(i, 'country') !== country) continue;
        if (dataset.getString(i, 'commodity') !== commodity) continue;
        return true;
    }
    return false;
}