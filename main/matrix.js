// ===== CONFIGURAZIONE =====
const CONFIG = {
    colors: {
        background: '#ffffffff',
        cell: {
            active: '#EC3434',
            inactive: '#f8f9fa', 
            hoverActive: '#C31A1A',
            hoverInactive: '#e9ecef',
            clicked: '#8B0000',
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
let clickedCol = -1, clickedRow = -1;
let currentYear = 2014;
let yearRange = { min: 2000, max: 2023 };
let sortedCountries = [];

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
    
    calculateYearRange();
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
}

function initializeSliderWithData() {
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
    const dynamicHeight = calculateDynamicHeight();
    const canvas = createCanvas(windowWidth, dynamicHeight);
    canvas.parent('p5-container');
    calculateCellSize();
    setupSliderListener();
    
    // Ordina le nazioni inizialmente
    sortCountriesByCommodities(currentYear);
}

function calculateDynamicHeight() {
    const headerHeight = 150;
    // Usa countries.length invece di sortedCountries.length per il calcolo iniziale
    const matrixHeight = CONFIG.layout.margin * 2 + (countries.length * CONFIG.layout.minCellHeight);
    const minHeight = 600;
    return Math.max(matrixHeight + headerHeight, minHeight);
}

// ===== COMUNICAZIONE CON SLIDER =====
function setupSliderListener() {
    const yearSlider = document.getElementById("yearSlider");
    if (yearSlider) {
        yearSlider.addEventListener("input", function() {
            currentYear = parseInt(this.value);
            combinationCache = {};
            clickedCol = -1;
            clickedRow = -1;
            
            // Riordina le nazioni per il nuovo anno
            sortCountriesByCommodities(currentYear);
            // Ricalcola le dimensioni delle celle dopo l'ordinamento
            calculateCellSize();
            redraw();
        });
        currentYear = yearRange.max;
        
        // Ordina anche all'inizio con l'anno massimo
        sortCountriesByCommodities(currentYear);
    }
}

function getCurrentYear() {
    const yearSlider = document.getElementById("yearSlider");
    return yearSlider ? parseInt(yearSlider.value) : currentYear;
}

// ===== ORDINAMENTO NAZIONI =====
function sortCountriesByCommodities(year) {
    console.log(`Calcolo ordinamento per l'anno ${year}...`);
    
    const countryCommodityCounts = [];
    
    for (let country of countries) {
        let count = 0;
        for (let commodity of commodities) {
            if (checkCombination(country, commodity, year)) {
                count++;
            }
        }
        countryCommodityCounts.push({
            name: country,
            count: count
        });
    }
    
    // Ordina in ordine decrescente (dalla nazione con più commodity a quella con meno)
    countryCommodityCounts.sort((a, b) => b.count - a.count);
    
    // Aggiorna l'array sortedCountries
    sortedCountries = countryCommodityCounts.map(item => item.name);
    
    console.log(`Nazioni ordinate per l'anno ${year}: ${sortedCountries.length} nazioni totali`);
    countryCommodityCounts.forEach((item, index) => {
        console.log(`${index + 1}. ${item.name}: ${item.count} commodity`);
    });
}

// ===== LAYOUT =====
function calculateCellSize() {
    const availableW = width - CONFIG.layout.margin * 2;
    const availableH = height - CONFIG.layout.margin * 2;

    cellWidth = min(availableW / commodities.length, CONFIG.layout.maxCellWidth);
    
    // Usa sortedCountries.length per calcolare l'altezza delle celle
    const calculatedHeight = availableH / sortedCountries.length;
    cellHeight = constrain(
        calculatedHeight,
        CONFIG.layout.minCellHeight,
        CONFIG.layout.maxCellHeight
    );
    
    console.log(`Cell dimensions: ${cellWidth}x${cellHeight}, ${sortedCountries.length} countries`);
}

function windowResized() {
    const dynamicHeight = calculateDynamicHeight();
    resizeCanvas(windowWidth, dynamicHeight);
    calculateCellSize();
}

// ===== RENDER SEMPLIFICATO =====
function draw() {
    background(CONFIG.colors.background);
    
    if (commodities.length === 0 || sortedCountries.length === 0) {
        console.log("Waiting for data...");
        return;
    }

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
    drawLabels(sortedCountries, CONFIG.typography.rowSize, (i) => ({
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
    
    // Debug: verifica che stiamo disegnando tutte le nazioni
    if (sortedCountries.length > 0) {
        console.log(`Drawing matrix: ${sortedCountries.length} countries x ${commodities.length} commodities`);
    }
    
    for (let r = 0; r < sortedCountries.length; r++) {
        for (let c = 0; c < commodities.length; c++) {
            drawCell(r, c, currentYear);
        }
    }
}

function drawCell(row, col, year) {
    const x = CONFIG.layout.margin + col * cellWidth;
    const y = CONFIG.layout.margin + row * cellHeight;
    
    const country = sortedCountries[row];
    const exists = checkCombinationCached(country, commodities[col], year);
    const isHovered = (row === hoveredRow || col === hoveredCol);
    const isClicked = (row === clickedRow && col === clickedCol);

    setCellStyle(exists, isHovered, isClicked);
    drawCellRect(x, y);
    
    if (exists) {
        drawCellDot(x, y, isClicked);
    }
}

function checkCombinationCached(country, commodity, year) {
    const cacheKey = `${country}-${commodity}-${year}`;
    
    if (combinationCache[cacheKey] === undefined) {
        combinationCache[cacheKey] = checkCombination(country, commodity, year);
    }
    
    return combinationCache[cacheKey];
}

function setCellStyle(exists, isHovered, isClicked) {
    if (exists) {
        if (isClicked) {
            fill(CONFIG.colors.cell.clicked);
        } else {
            fill(isHovered ? CONFIG.colors.cell.hoverActive : CONFIG.colors.cell.active);
        }
    } else {
        fill(isHovered ? CONFIG.colors.cell.hoverInactive : CONFIG.colors.cell.inactive);
    }
    stroke(CONFIG.colors.cell.stroke);
    strokeWeight(0.5);
}

function drawCellRect(x, y) {
    rect(x, y, cellWidth, cellHeight);
}

function drawCellDot(x, y, isClicked) {
    fill(isClicked ? CONFIG.colors.cell.clicked : CONFIG.colors.cell.dot);
    noStroke();
    ellipse(x + cellWidth / 2, y + cellHeight / 2, min(cellWidth, cellHeight) * 0.4);
}

// AGGIUNTA: Funzione per gestire il click del mouse
function mouseClicked() {
    if (isValidCell(hoveredRow, hoveredCol)) {
        const country = sortedCountries[hoveredRow];
        const exists = checkCombinationCached(country, commodities[hoveredCol], getCurrentYear());
        
        if (exists) {
            clickedCol = hoveredCol;
            clickedRow = hoveredRow;
            
            const countryName = country;
            window.location.href = `../visione%20dettaglio%20waste/country.html?country=${encodeURIComponent(countryName)}`;
            
            return false;
        }
    }
    
    clickedCol = -1;
    clickedRow = -1;
    return true;
}

function drawTooltip() {
    if (!isValidCell(hoveredRow, hoveredCol)) return;

    const country = sortedCountries[hoveredRow];
    const exists = checkCombinationCached(country, commodities[hoveredCol], getCurrentYear());
    
    // Calcola il numero di commodity per questa nazione
    let commodityCount = 0;
    for (let commodity of commodities) {
        if (checkCombination(country, commodity, getCurrentYear())) {
            commodityCount++;
        }
    }
    
    const percentage = (commodityCount / commodities.length * 100).toFixed(1);
    
    let tooltipText = `${country} — ${commodities[hoveredCol]}`;
    tooltipText += `\nCommodity: ${commodityCount}/${commodities.length} (${percentage}%)`;
    
    if (exists) {
        tooltipText += '\nClick for details →';
    }
    
    const lines = tooltipText.split('\n');
    const lineHeight = 16;
    const padding = 8;
    
    let maxWidth = 0;
    push();
    textSize(CONFIG.typography.tooltipSize);
    textFont(CONFIG.typography.fontFamily);
    for (let line of lines) {
        const lineWidth = textWidth(line);
        if (lineWidth > maxWidth) maxWidth = lineWidth;
    }
    pop();
    
    const w = maxWidth + padding * 2;
    const h = lines.length * lineHeight + padding * 2;
    
    push();
    textSize(CONFIG.typography.tooltipSize);
    textFont(CONFIG.typography.fontFamily); 
    
    fill(CONFIG.colors.tooltip.background);
    stroke(CONFIG.colors.tooltip.border);
    rect(mouseX + 10, mouseY + 10, w, h, 4);
    
    noStroke();
    fill(CONFIG.colors.text.tooltip);
    
    for (let i = 0; i < lines.length; i++) {
        const yPos = mouseY + 26 + i * lineHeight;
        
        if (i === lines.length - 1 && exists && lines[i].includes('Click')) {
            push();
            textStyle(BOLD);
            text(lines[i], mouseX + 16, yPos);
            pop();
        } else {
            text(lines[i], mouseX + 16, yPos);
        }
    }
    pop();
}

function isValidCell(row, col) {
    return row >= 0 && row < sortedCountries.length && col >= 0 && col < commodities.length;
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