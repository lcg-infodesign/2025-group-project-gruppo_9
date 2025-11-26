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
    
    // IMPORTANTE: Ordina le nazioni dopo che i dati sono caricati
    sortCountriesByCommodities(yearRange.max);
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
    console.log("Year range calculated:", yearRange);
}

function initializeSliderWithData() {
    if (window.initializeSliderFromData) {
        window.initializeSliderFromData(yearRange);
        console.log("Slider initialized with data");
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
    console.log("setup() called");
    const dynamicHeight = calculateDynamicHeight();
    const canvas = createCanvas(windowWidth, dynamicHeight);
    canvas.parent('p5-container');
    
    // Aspetta che il DOM sia pronto prima di setupSliderListener
    setTimeout(() => {
        setupSliderListener();
    }, 100);
}

function calculateDynamicHeight() {
    const headerHeight = 150;
    const rowCount = sortedCountries.length > 0 ? sortedCountries.length : countries.length;
    const matrixHeight = CONFIG.layout.margin * 2 + (rowCount * CONFIG.layout.minCellHeight);
    const minHeight = 600;
    return Math.max(matrixHeight + headerHeight, minHeight);
}

// ===== COMUNICAZIONE CON SLIDER =====
function setupSliderListener() {
    console.log("setupSliderListener called");
    const yearSlider = document.getElementById("yearSlider");
    console.log("yearSlider element:", yearSlider);
    
    if (yearSlider) {
        // Rimuovi eventuali listener precedenti per evitare duplicati
        yearSlider.removeEventListener("input", handleSliderInput);
        
        // Aggiungi il nuovo listener
        yearSlider.addEventListener("input", handleSliderInput);
        
        console.log("Slider listener attached successfully");
        
        // Forza un primo ordinamento con l'anno corrente
        const currentYear = parseInt(yearSlider.value);
        console.log("Initial year from slider:", currentYear);
        sortCountriesByCommodities(currentYear);
        calculateCellSize();
        
    } else {
        console.error("yearSlider non trovato!");
        // Riprova dopo un breve delay
        setTimeout(setupSliderListener, 500);
    }
}

function handleSliderInput() {
    console.log("Slider input detected, value:", this.value);
    const newYear = parseInt(this.value);
    currentYear = newYear;
    
    // Pulisci cache
    combinationCache = {};
    currentCacheYear = null;
    clickedCol = -1;
    clickedRow = -1;

    // Riordina le nazioni
    console.log("Calling sortCountriesByCommodities for year:", newYear);
    sortCountriesByCommodities(newYear);
    
    // Ricalcola dimensioni e ridisegna
    calculateCellSize();
    redraw();
    
    console.log("Redraw triggered for year:", newYear);
}

function getCurrentYear() {
    const yearSlider = document.getElementById("yearSlider");
    return yearSlider ? parseInt(yearSlider.value) : currentYear;
}

// ===== ORDINAMENTO NAZIONI =====
function sortCountriesByCommodities(year) {
    console.log(`=== sortCountriesByCommodities called for year ${year} ===`);
    console.log("Total countries before sorting:", countries.length);
    
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
    
    // Ordina in ordine decrescente
    countryCommodityCounts.sort((a, b) => b.count - a.count);
    
    // Aggiorna l'array sortedCountries
    const oldSortedCountries = [...sortedCountries];
    sortedCountries = countryCommodityCounts.map(item => item.name);
    
    console.log(`Sorted ${sortedCountries.length} countries for year ${year}`);
    
    // Verifica se l'ordinamento è cambiato
    const orderChanged = JSON.stringify(oldSortedCountries) !== JSON.stringify(sortedCountries);
    console.log("Order changed:", orderChanged);
    
    // Stampa i primi 5 per debug
    console.log("Top 5 countries:");
    countryCommodityCounts.slice(0, 5).forEach((item, index) => {
        console.log(`${index + 1}. ${item.name}: ${item.count} commodities`);
    });
    
    return sortedCountries;
}

// ===== LAYOUT =====
function calculateCellSize() {
    const availableW = width - CONFIG.layout.margin * 2;
    const availableH = height - CONFIG.layout.margin * 2;

    cellWidth = min(availableW / commodities.length, CONFIG.layout.maxCellWidth);
    
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
        drawLoadingMessage();
        return;
    }

    const year = getCurrentYear();
    console.log(`Drawing for year: ${year}, ${sortedCountries.length} countries`);
    
    updateHoveredCell();
    drawColumnLabels();
    drawRowLabels();
    drawMatrix(year);
    
    if (isValidCell(hoveredRow, hoveredCol)) {
        drawTooltip();
    }
}

function drawLoadingMessage() {
    push();
    textAlign(CENTER, CENTER);
    textSize(16);
    fill(CONFIG.colors.text.primary);
    text("Loading data...", width / 2, height / 2);
    pop();
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
    // Debug: verifica cosa stiamo disegnando
    console.log(`Drawing row labels for ${sortedCountries.length} countries`);
    
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
        console.log("Cache cleared for new year:", currentYear);
    }
    
    console.log(`Drawing matrix with ${sortedCountries.length} countries and ${commodities.length} commodities`);
    
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

// ===== FUNZIONE PER OTTENERE LA PERCENTUALE DI WASTE =====
function getWastePercentage(country, commodity, year) {
    for (let i = 0; i < dataset.getRowCount(); i++) {
        if (dataset.getNum(i, 'year') !== year) continue;
        if (dataset.getString(i, 'country') !== country) continue;
        if (dataset.getString(i, 'commodity') !== commodity) continue;
        
        // Restituisce la percentuale di waste per quella combinazione
        return dataset.getNum(i, 'loss_percentage');
    }
    return null; // Nessun dato trovato
}

function drawTooltip() {
    if (!isValidCell(hoveredRow, hoveredCol)) return;

    const country = sortedCountries[hoveredRow];
    const commodity = commodities[hoveredCol];
    const year = getCurrentYear();
    const exists = checkCombinationCached(country, commodity, year);
    
    // Costruisci il testo del tooltip
    let tooltipText = `${country} - ${commodity}`;
    
    if (exists) {
        // Ottieni la percentuale di waste per questa combinazione specifica
        const wastePercentage = getWastePercentage(country, commodity, year);
        if (wastePercentage !== null) {
            tooltipText += `\n${wastePercentage.toFixed(1)}% waste`;
        }
        tooltipText += '\nClick for details →';
    } else {
        tooltipText += '\nNo data available';
    }
    
    const lines = tooltipText.split('\n');
    const lineHeight = 16;
    const padding = 8;
    
    // Calcola la larghezza massima del tooltip
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
    
    // Sfondo del tooltip
    fill(CONFIG.colors.tooltip.background);
    stroke(CONFIG.colors.tooltip.border);
    strokeWeight(1);
    rect(mouseX + 10, mouseY + 10, w, h, 5);
    
    // Testo del tooltip
    noStroke();
    fill(CONFIG.colors.text.tooltip);
    
    for (let i = 0; i < lines.length; i++) {
        const yPos = mouseY + 26 + i * lineHeight;
        
        // Prima riga (Nazione - Commodity) in normale
        if (i === 0) {
            text(lines[i], mouseX + 16, yPos);
        }
        // Seconda riga (percentuale) 
        else if (i === 1) {
            text(lines[i], mouseX + 16, yPos);
        }
        // Ultima riga (Click for details) in grassetto se esiste
        else if (i === lines.length - 1 && exists && lines[i].includes('Click')) {
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