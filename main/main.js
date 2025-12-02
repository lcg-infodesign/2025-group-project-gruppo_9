// ===== CONFIGURAZIONE COMPLETA =====
const CONFIG = {
    colors: {
        background: '#FBEFD3',
        cell: {
            active: '#ffffff',        // Bianco
            inactive: '#d6d6d6',      // Grigio medio-chiaro
            hoverActive: '#f0f0f0',   // Grigio molto chiaro al hover
            hoverInactive: '#a8a8a8', // Grigio medio al hover
            clicked: '#404040',       // Grigio scuro
            dot: '#000000',           // Nero per il "dot"
            stroke: '#808080'         // Grigio medio
        },
        text: {
            primary: '#283618',
            tooltip: '#283618'
        },
        tooltip: {
            background: '#ffffff',
            border: '#adb5bd'
        },
        slider: {
            track: '#4A4458',
            thumb: '#D0BCFF',
            text: '#331a05'
        }
    },
    layout: {
        headerHeight: 0,
        sliderHeight: 100,
        margin: {
            horizontal: 350,
            vertical: 100
        },
        minCellHeight: 50,
        maxCellHeight: 100,
        maxCellWidth: 120,
        decorativeImages: {
            size: 80, 
            opacity: 150 
        },
        basketOffset: 60
    },
    typography: {
        titleSize: 48,
        columnSize: 11,
        rowSize: 10,
        tooltipSize: 12,
        sliderValueSize: 18,
        maxCountryChars: 18,
        fontFamily: 'Roboto',
        titleFont: 'Roboto'
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
let slider = {
    x: 0, y: 0, width: 0, height: 30,
    thumb: { x: 0, width: 28, dragging: false }
};
let matrixY = 0; 
let commodityImages = []; 
let basketImage = null;

// ===== CACHE =====
let combinationCache = {};
let currentCacheYear = null;

// ===== INIZIALIZZAZIONE =====
function preload() {
    dataset = loadTable('../assets/dataset/cleaned_dataset.csv', 'csv', 'header', initializeData);

    basketImage = loadImage('../assets/img/basket.png');
}

function initializeData() {
    commodities = getUniqueValues('commodity');
    countries = getUniqueValues('country');
    calculateYearRange();
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
    currentYear = yearRange.max;
}

function getUniqueValues(columnName) {
    const values = new Set();
    for (let i = 0; i < dataset.getRowCount(); i++) {
        values.add(dataset.getString(i, columnName));
    }
    return Array.from(values);
}

function normalizeFilename(name) {
  if (!name) return "";
  return name.toLowerCase().trim()
    .replace(/\s+/g, "")                          
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "") 
    .replace(/[^a-z0-9*-]/g, "");                 
}

function setup() {
    // Calcola l'altezza totale necessaria per tutte le righe
    let commodityName;
    for(let i=0; i<commodities.length; i++){
        commodityName = normalizeFilename(commodities[i]);
        commodityImages.push(loadImage('../assets/img/' + commodityName+  '.png'));
        console.log('../assets/img/' + commodityName+  '.png');
    }

    const totalHeight = calculateTotalHeight();
    const canvas = createCanvas(windowWidth, totalHeight);
    canvas.parent('p5-container');
    
    setupUI();
    calculateCellSize();
    
    console.log(`Canvas height: ${totalHeight}, Countries: ${sortedCountries.length}, Matrix Y: ${matrixY}`);

    document.addEventListener('keydown', handleKeyPress);
}

function calculateTotalHeight() {
    const headerHeight = CONFIG.layout.headerHeight;
    const sliderHeight = CONFIG.layout.sliderHeight;
    const matrixAreaHeight = CONFIG.layout.margin.vertical * 2 + (sortedCountries.length * CONFIG.layout.minCellHeight);
    const minHeight = 800;
    
    // Calcola l'altezza totale necessaria
    const calculatedHeight = headerHeight + sliderHeight + matrixAreaHeight;
    
    console.log(`Header: ${headerHeight}, Slider: ${sliderHeight}, Matrix: ${matrixAreaHeight}, Total: ${calculatedHeight}`);
    
    return Math.max(calculatedHeight, minHeight);
}

function setupUI() {
    // Setup slider
    slider.width = width * 0.8;
    slider.x = (width - slider.width) / 2;
    slider.y = CONFIG.layout.headerHeight + 60;
    updateSliderThumb();
    matrixY = CONFIG.layout.headerHeight + CONFIG.layout.sliderHeight + CONFIG.layout.margin.vertical;
}

function calculateCellSize() {
    const basketSpace = 40; // Spazio per il cestino
    const availableW = width - CONFIG.layout.margin.horizontal * 2 - basketSpace;
    
    // Per l'altezza, usa tutto lo spazio disponibile nel canvas
    const availableH = height - matrixY - CONFIG.layout.margin.vertical;

    cellWidth = min(availableW / commodities.length, CONFIG.layout.maxCellWidth);
    
    // Calcola l'altezza delle celle in base allo spazio disponibile
    const calculatedHeight = availableH / sortedCountries.length;
    cellHeight = constrain(
        calculatedHeight,
        CONFIG.layout.minCellHeight,
        CONFIG.layout.maxCellHeight
    );
    
    console.log(`Available W: ${availableW}, Available H: ${availableH}, Cell Width: ${cellWidth}, Cell Height: ${cellHeight}`);
}

function windowResized() {
    const totalHeight = calculateTotalHeight();
    resizeCanvas(windowWidth, totalHeight);
    setupUI();
    calculateCellSize();
}

// ===== INTERFACCIA UTENTE =====
function draw() {
    background(CONFIG.colors.background);
    
    drawSlider();
    //drawDecorativeImages();
    
    if (commodities.length === 0 || sortedCountries.length === 0) {
        drawLoadingMessage();
        return;
    }

    //drawColumnLabels();
    drawRowLabels();
    drawMatrix(currentYear);
    
    if (isValidCell(hoveredRow, hoveredCol)) {
        drawTooltip();
    }
}

function drawSlider() {
    // Slider track
    fill(CONFIG.colors.slider.track);
    noStroke();
    rect(slider.x, slider.y, slider.width, 20, 5);
    
    // Slider thumb
    fill(CONFIG.colors.slider.thumb);
    ellipse(slider.thumb.x, slider.y +10, slider.thumb.width);
    
    // Year value
    fill(CONFIG.colors.slider.text);
    textFont(CONFIG.typography.fontFamily);
    textSize(CONFIG.typography.sliderValueSize);
    textAlign(CENTER, CENTER);
    text(currentYear, slider.x + slider.width / 2, slider.y + 40);
    
    // Year range labels
    textSize(12);
    text(yearRange.min, slider.x, slider.y + 40);
    text(yearRange.max, slider.x + slider.width, slider.y + 40);
}

function drawDecorativeImages() {
    if (decorativeImages.length === 0) return;
    
    const imgSize = CONFIG.layout.decorativeImages.size;
    
    // Crea più posizioni - aumentato il numero per coprire l'altezza della tabella
    const positions = [
        // Colonna destra
        { x: width - CONFIG.layout.margin.horizontal * 0.4, y: height * 0.05 },
        { x: width - CONFIG.layout.margin.horizontal * 0.4, y: height * 0.2 },
        { x: width - CONFIG.layout.margin.horizontal * 0.4, y: height * 0.4 },
        { x: width - CONFIG.layout.margin.horizontal * 0.4, y: height * 0.6 },
        { x: width - CONFIG.layout.margin.horizontal * 0.4, y: height * 0.8 },

        // Colonna sinistra
        { x: CONFIG.layout.margin.horizontal * 0.2, y: height * 0.1 },
        { x: CONFIG.layout.margin.horizontal * 0.2, y: height * 0.3 },
        { x: CONFIG.layout.margin.horizontal * 0.2, y: height * 0.5 },
        { x: CONFIG.layout.margin.horizontal * 0.2, y: height * 0.7 },
        { x: CONFIG.layout.margin.horizontal * 0.2, y: height * 0.9 }
    ];
    
    push();
    
    for (let i = 0; i < positions.length; i++) {
        const pos = positions[i];
        
        // Usa l'operatore modulo per ciclare attraverso le immagini
        const imgIndex = i % decorativeImages.length;
        const img = decorativeImages[imgIndex];
        
        if (img && img.width > 0) {
            imageMode(CENTER);
            
            // Calcola l'animazione "tic-tac"
            const time = millis() / 1000; // tempo in secondi
            const animationDuration = 2 + (i % 3) * 0.5; // durate diverse: 2s, 2.5s, 3s
            const cycle = (time / animationDuration) % 1;
            
            const rotation = cycle < 0.5 ? -0.052 : 0.052;
            
            push();
            translate(pos.x, pos.y);
            rotate(rotation);
        
            image(img, 0, 0, imgSize, imgSize * (img.height / img.width));
            pop();
        }
    }
    
    pop();
}

function updateSliderThumb() {
    const percent = (currentYear - yearRange.min) / (yearRange.max - yearRange.min);
    slider.thumb.x = slider.x + percent * slider.width;
}

function mousePressed() {
    // Check slider
    if (dist(mouseX, mouseY, slider.thumb.x, slider.y + 5) < slider.thumb.width / 2) {
        slider.thumb.dragging = true;
        return;
    }
    
    // Check slider track
    if (mouseX >= slider.x && mouseX <= slider.x + slider.width &&
        mouseY >= slider.y - 10 && mouseY <= slider.y + 20) {
        updateYearFromSlider(mouseX);
        slider.thumb.dragging = true;
        return;
    }
}

function mouseDragged() {
    if (slider.thumb.dragging) {
        updateYearFromSlider(mouseX);
    }
}

function mouseReleased() {
    slider.thumb.dragging = false;
}

function updateYearFromSlider(x) {
    const percent = constrain((x - slider.x) / slider.width, 0, 1);
    currentYear = yearRange.min + round(percent * (yearRange.max - yearRange.min));
    updateSliderThumb();
    
    // Riordina le nazioni per il nuovo anno
    combinationCache = {};
    currentCacheYear = null;
    sortCountriesByCommodities(currentYear);
    
    // Ridimensiona il canvas
    resizeCanvasForCurrentData();
    
    redraw();
}

function resizeCanvasForCurrentData() {
    // Calcola la nuova altezza necessaria
    const newHeight = calculateTotalHeight();
    
    // Ridimensiona il canvas solo se l'altezza è cambiata
    if (height !== newHeight) {
        resizeCanvas(windowWidth, newHeight);
        setupUI();
        calculateCellSize();
        console.log(`Canvas ridimensionato: ${windowWidth}x${newHeight}, Paesi: ${sortedCountries.length}`);
    }
}


// ===== ORDINAMENTO NAZIONI =====
function sortCountriesByCommodities(year) {
    const countryCommodityCounts = [];
    
    for (let country of countries) {
        let count = 0;
        for (let commodity of commodities) {
            if (checkCombination(country, commodity, year)) {
                count++;
            }
        }
        if (count > 0) { // Solo paesi con almeno una commodity
            countryCommodityCounts.push({
                name: country,
                count: count
            });
        }
    }
    
    // Ordina solo una volta
    countryCommodityCounts.sort((a, b) => b.count - a.count);
    sortedCountries = countryCommodityCounts.map(item => item.name);
    
    console.log(`Anno ${year}: ${sortedCountries.length} paesi con dati`);
    return sortedCountries;
}

// ===== MATRIX RENDERING =====
function drawLoadingMessage() {
    push();
    textAlign(CENTER, CENTER);
    textSize(16);
    fill(CONFIG.colors.text.primary);
    text("Loading data...", width / 2, height / 2);
    pop();
}

function updateHoveredCell() {
    const matrixY = CONFIG.layout.headerHeight + CONFIG.layout.sliderHeight + CONFIG.layout.margin.vertical;
    const basketSpace = 40; // Stesso spazio della matrice
    
    // Aggiungi basketSpace anche qui
    hoveredCol = floor((mouseX - CONFIG.layout.margin.horizontal - basketSpace) / cellWidth);
    hoveredRow = floor((mouseY - matrixY) / cellHeight);
}

function drawColumnLabels() {
    const matrixY = CONFIG.layout.headerHeight + CONFIG.layout.sliderHeight + CONFIG.layout.margin.vertical;
    drawLabels(commodities, CONFIG.typography.columnSize, (i) => ({
        x: CONFIG.layout.margin.horizontal + i * cellWidth + 5,
        y: matrixY - 15,
        rotation: -PI / 4
    }));
}

function drawRowLabels() {
    const matrixY = CONFIG.layout.headerHeight + CONFIG.layout.sliderHeight + CONFIG.layout.margin.vertical;
    drawLabels(sortedCountries, CONFIG.typography.rowSize, (i) => ({
        x: CONFIG.layout.margin.horizontal - 100,
        y: matrixY + i * cellHeight + cellHeight / 2,
        truncate: CONFIG.typography.maxCountryChars
    }), false);
    
    // Disegna i cestini
    if (basketImage && basketImage.width > 0) {
        for (let i = 0; i < sortedCountries.length; i++) {
            const x = CONFIG.layout.margin.horizontal +10; // Posizione a destra delle label
            const y = matrixY + i * cellHeight + cellHeight / 2;
            const size = 40; // Dimensione del cestino
            
            push();
            imageMode(CENTER);
            image(basketImage, x, y, size, size);
            pop();
        }
    }
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
    const matrixY = CONFIG.layout.headerHeight + CONFIG.layout.sliderHeight + CONFIG.layout.margin.vertical;
    
    if (currentCacheYear !== currentYear) {
        combinationCache = {};
        currentCacheYear = currentYear;
    }
    
    updateHoveredCell();
    
    for (let r = 0; r < sortedCountries.length; r++) {
        for (let c = 0; c < commodities.length; c++) {
            drawCell(r, c, currentYear, matrixY);
        }
    }
}

function drawCell(row, col, year, matrixY) {
    // Aggiungi un offset per far spazio al cestino
    const basketSpace = 40; // Spazio per il cestino
    const x = CONFIG.layout.margin.horizontal + basketSpace + col * cellWidth;
    const y = matrixY + row * cellHeight;
    
    const country = sortedCountries[row];
    const exists = checkCombinationCached(country, commodities[col], year);
    const isHovered = (row === hoveredRow || col === hoveredCol);
    const isClicked = (row === clickedRow && col === clickedCol);

    setCellStyle(exists, isHovered, isClicked);
    
    if (exists) {
        drawCellDot(x, y, isClicked, col);
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

function drawCellDot(x, y, isClicked, col) {
    //const dotImage = dotImage;
    
    if (commodityImages[col] && commodityImages[col].width > 0) {
        // Calcola la dimensione dell'immagine
        const img = commodityImages[col];
        const maxSize = min(cellWidth, cellHeight) ;
        const aspectRatio = img.width / img.height;
        let w, h;
        if (aspectRatio > 1) {
            // Immagine larga
            w = maxSize;
            h = maxSize / aspectRatio;
        } else {
            // Immagine alta
            h = maxSize;
            w = maxSize * aspectRatio;
        }
        
        push();
        imageMode(CENTER);
        image(commodityImages[col], x + cellWidth/2, y + cellHeight/2,  w, h);
        pop();
    } else {
        // Fallback: disegna il puntino se l'immagine non è disponibile
        fill(isClicked ? CONFIG.colors.cell.clicked : CONFIG.colors.cell.dot);
        noStroke();
        ellipse(x + cellWidth / 2, y + cellHeight / 2, min(cellWidth, cellHeight) * 0.4);
    }
}

function mouseClicked() {
    if (isValidCell(hoveredRow, hoveredCol)) {
        const country = sortedCountries[hoveredRow];
        const exists = checkCombinationCached(country, commodities[hoveredCol], currentYear);
        
        if (exists) {
            clickedCol = hoveredCol;
            clickedRow = hoveredRow;
            
            const countryName = country;
            window.location.href = `../visione%20dettaglio%20waste/country.html?country=${encodeURIComponent(countryName)}&year=${currentYear}`;
            
            return false;
        }
    }
    
    clickedCol = -1;
    clickedRow = -1;
    return true;
}

// ===== TOOLTIP =====
function getWastePercentage(country, commodity, year) {
    for (let i = 0; i < dataset.getRowCount(); i++) {
        if (dataset.getNum(i, 'year') !== year) continue;
        if (dataset.getString(i, 'country') !== country) continue;
        if (dataset.getString(i, 'commodity') !== commodity) continue;
        return dataset.getNum(i, 'loss_percentage');
    }
    return null;
}

function drawTooltip() {
    if (!isValidCell(hoveredRow, hoveredCol)) return;

    const country = sortedCountries[hoveredRow];
    const commodity = commodities[hoveredCol];
    const exists = checkCombinationCached(country, commodity, currentYear);
    
    let tooltipText = `${country} - ${commodity}`;
    
    if (exists) {
        const wastePercentage = getWastePercentage(country, commodity, currentYear);
        if (wastePercentage !== null) {
            tooltipText += `\n${wastePercentage.toFixed(1)}% waste`;
        }
        //tooltipText += '\nClick for details →';
    } else {
        tooltipText += '\nNo data available';
    }
    
    const lines = tooltipText.split('\n');
    const lineHeight = 16;
    const padding = 12;
    
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
    const h = lines.length * lineHeight + padding;
    
    // Posiziona il tooltip per non farlo uscire dallo schermo
    let tooltipX = mouseX + 15;
    let tooltipY = mouseY + 15;
    
    // Se il tooltip esce a destra, spostalo a sinistra del mouse
    if (tooltipX + w > width - 10) {
        tooltipX = mouseX - w - 15;
    }
    
    // Se il tooltip esce in basso, spostalo sopra il mouse
    if (tooltipY + h > height - 10) {
        tooltipY = mouseY - h - 15;
    }
    
    push();
    textSize(CONFIG.typography.tooltipSize);
    textFont(CONFIG.typography.fontFamily);
    
    // Sfondo del tooltip
    fill(CONFIG.colors.tooltip.background);
    stroke(CONFIG.colors.tooltip.border);
    strokeWeight(1);
    rect(tooltipX, tooltipY, w, h, 5);
    
    // Testo del tooltip - ALLINEATO CORRETTAMENTE
    noStroke();
    fill(CONFIG.colors.text.tooltip);
    textAlign(LEFT, TOP);
    
    for (let i = 0; i < lines.length; i++) {
        const yPos = tooltipY + padding + i * lineHeight;
        
        if (i === lines.length - 1 && exists && lines[i].includes('Click')) {
            push();
            textStyle(BOLD);
            text(lines[i], tooltipX + padding, yPos);
            pop();
        } else {
            text(lines[i], tooltipX + padding, yPos);
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

function handleKeyPress(event) {
    if (event.key === 'ArrowLeft') {
        // Anno precedente
        if (currentYear > yearRange.min) {
            currentYear--;
            updateYear();
        }
    } else if (event.key === 'ArrowRight') {
        // Anno successivo
        if (currentYear < yearRange.max) {
            currentYear++;
            updateYear();
        }
    }
}

function updateYear() {
    updateSliderThumb();
    combinationCache = {};
    currentCacheYear = null;
    sortCountriesByCommodities(currentYear);
    
    // Ridimensiona il canvas prima di ridisegnare
    resizeCanvasForCurrentData();
    
    redraw();
}