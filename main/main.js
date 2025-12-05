// ===== CONFIGURAZIONE COMPLETA =====
const CONFIG = {
    colors: {
        background: '#FBEFD3',
        text: {
            primary: '#283618',
            tooltip: '#FBEFD3'
        },
        tooltip: {
            background: '#415E5A',
            border: '#283618'
        },
        slider: {
            track: '#415E5A',
            thumb: '#FBEFD3',
            text: '#16201f',
            wave: '#415E5A' // Colore per il grafico a onda
        },
        legend: {
            background: '#415E5A', // Colore di sfondo della legenda
            border: '#415E5A',
            circle: '#FBEFD3' // Colore dei pallini (stesso sfondo del sito)
        }
    },
    layout: {
        headerHeight: 0,
        sliderHeight: 100,
        margin: {
            horizontal: 350,
            vertical: 60
        },
        minCellHeight: 50,
        maxCellHeight: 100,
        maxCellWidth: 120,
        basketOffset: 60,
        imageSizing: {
            min: 20,  // Dimensione minima in pixel
            max: 50   // Dimensione massima in pixel
        },
        legend: {
            width: 180, // Leggermente più larga
            height: 140, // Più alta per ospitare l'immagine
            marginRight: 50, // Più vicina al centro
            padding: 15
        }
    },
    typography: {
        titleSize: 48,
        columnSize: 11,
        rowSize: 10,
        tooltipSize: 12,
        sliderValueSize: 18,
        maxCountryChars: 18,
        fontFamily: 'Roboto',
        titleFont: 'Roboto',
        legendSize: 11
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
let commodityOutlineImages = []; // Immagini contorno per commodity senza dati
let basketImage = null;
let legendImage = null;

// Variabili per il ridimensionamento immagini
let wastePercentages = { min: Infinity, max: -Infinity }; // Min e max delle percentuali
let imageSizeRange = { min: 20, max: 50 }; // Range dimensioni immagini

// Variabili per l'effetto slider tipo YouTube
let yearDataCounts = {}; // Conterrà il numero di righe per ogni anno
let isHoveringSlider = false; // Per sapere se siamo sopra lo slider
let hoveredYear = null; // L'anno su cui siamo con il mouse

// ===== CACHE =====
let combinationCache = {};
let currentCacheYear = null;

// ===== INIZIALIZZAZIONE =====
function preload() {
    dataset = loadTable('../assets/dataset/cleaned_dataset.csv', 'csv', 'header', initializeData);
    basketImage = loadImage('../assets/img/basket.svg');
    legendImage = loadImage('../assets/img/legenda.png');
}

function initializeData() {
    commodities = getUniqueValues('commodity');
    countries = getUniqueValues('country');
    calculateYearRange();
    calculateYearDataCounts(); // CALCOLA I DATI PER ANNO
    calculateWastePercentageRange(currentYear); // Calcola il range delle percentuali
    sortCountriesByCommodities(yearRange.max);
}

// Calcola il numero di righe (dati) per ogni anno
function calculateYearDataCounts() {
    yearDataCounts = {};
    
    for (let i = 0; i < dataset.getRowCount(); i++) {
        const year = dataset.getNum(i, 'year');
        if (!yearDataCounts[year]) {
            yearDataCounts[year] = 0;
        }
        yearDataCounts[year]++;
    }
    
    // Normalizza i valori tra 0 e 1 per l'altezza
    const maxCount = Math.max(...Object.values(yearDataCounts));
    for (let year in yearDataCounts) {
        yearDataCounts[year] = yearDataCounts[year] / maxCount;
    }
    
    console.log("Year data counts calculated:", yearDataCounts);
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

function calculateWastePercentageRange(year) {
    wastePercentages.min = Infinity;
    wastePercentages.max = -Infinity;
    
    // Trova la percentuale minima e massima per l'anno corrente
    for (let i = 0; i < dataset.getRowCount(); i++) {
        if (dataset.getNum(i, 'year') === year) {
            const percentage = dataset.getNum(i, 'loss_percentage');
            if (percentage > 0) { // Considera solo valori positivi
                wastePercentages.min = min(wastePercentages.min, percentage);
                wastePercentages.max = max(wastePercentages.max, percentage);
            }
        }
    }
    
    // Se non ci sono dati validi, usa valori di default
    if (wastePercentages.min === Infinity) wastePercentages.min = 0;
    if (wastePercentages.max === -Infinity) wastePercentages.max = 100;
    
    console.log(`Anno ${year}: Min percentage=${wastePercentages.min}, Max=${wastePercentages.max}`);
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

function calculateImageSize(percentage) {
    // Mappa la percentuale al range delle dimensioni
    if (percentage <= 0 || wastePercentages.max <= wastePercentages.min) {
        return imageSizeRange.min; // Dimensione minima per dati nulli o negativi
    }
    
    // Normalizza la percentuale tra 0 e 1
    const normalized = (percentage - wastePercentages.min) / (wastePercentages.max - wastePercentages.min);
    
    // Calcola la dimensione usando il range
    const size = imageSizeRange.min + normalized * (imageSizeRange.max - imageSizeRange.min);
    
    return constrain(size, imageSizeRange.min, imageSizeRange.max);
}

function setup() {
    // Carica tutte le immagini delle commodity
    let commodityName;
    for(let i = 0; i < commodities.length; i++){
        commodityName = normalizeFilename(commodities[i]);
        commodityImages.push(loadImage('../assets/img/cibi/' + commodityName + '.svg'));
        commodityOutlineImages.push(loadImage('../assets/img/outline/' + commodityName + '.svg'));
    }
    
    // Inizializza il range delle dimensioni immagini dal CONFIG
    imageSizeRange.min = CONFIG.layout.imageSizing.min;
    imageSizeRange.max = CONFIG.layout.imageSizing.max;
    
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
    const basketSpace = 40;
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
    
    if (commodities.length === 0 || sortedCountries.length === 0) {
        drawLoadingMessage();
        return;
    }

    drawRowLabels();
    drawMatrix(currentYear);
    
    // Disegna la legenda delle dimensioni
    drawSizeLegend();
    
    if (isValidCell(hoveredRow, hoveredCol)) {
        drawTooltip();
    }
}

// Funzione helper per ottenere l'anno da una coordinata X
function getYearFromX(x) {
    const percent = constrain((x - slider.x) / slider.width, 0, 1);
    return yearRange.min + round(percent * (yearRange.max - yearRange.min));
}

function drawSlider() {
    // Disegna prima il grafico sotto la track (se siamo in hover)
    if (isHoveringSlider && hoveredYear) {
        drawSliderWaveGraph();
    }
    
    // Slider track
    fill(CONFIG.colors.slider.track);
    noStroke();
    rect(slider.x, slider.y, slider.width, 20, 5);
    
    // Disegna i punti del grafico sulla track
    drawSliderDataPoints();
    
    // Slider thumb
    stroke(CONFIG.colors.slider.track);
    strokeWeight(2);
    fill(CONFIG.colors.slider.thumb);
    ellipse(slider.thumb.x, slider.y + 10, slider.thumb.width);
    noStroke();
    
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

// Disegna i punti dati sulla slider track
function drawSliderDataPoints() {
    const years = Object.keys(yearDataCounts).map(Number).sort((a, b) => a - b);
    const trackHeight = 20;
    
    for (let year of years) {
        const x = map(year, yearRange.min, yearRange.max, slider.x, slider.x + slider.width);
        const dataRatio = yearDataCounts[year];
        
        // Altezza del punto in base alla quantità di dati
        const pointHeight = 3 + (dataRatio * 7); // Da 3px a 10px
        
        // Colore basato sulla quantità di dati
        const colorValue = map(dataRatio, 0, 1, 150, 255);
        fill(colorValue, colorValue * 0.8, colorValue * 0.6);
        
        // Disegna un punto per ogni anno con dati
        ellipse(x, slider.y + trackHeight/2, pointHeight);
    }
}

// Disegna il grafico a onda quando in hover (simile a YouTube)
function drawSliderWaveGraph() {
    const years = Object.keys(yearDataCounts).map(Number).sort((a, b) => a - b);
    const graphHeight = 30;
    const graphY = slider.y - graphHeight;
    
    push();
    noFill();
    
    // Disegna il grafico a linea
    beginShape();
    stroke(CONFIG.colors.slider.wave);
    strokeWeight(2);
    fill(CONFIG.colors.slider.wave + '30'); // Trasparenza 30%

    vertex(slider.x + slider.width, graphY + graphHeight + slider.height/2); // basso a destra
    vertex(slider.x, graphY + graphHeight + slider.height/2 ); // basso a sinistra   
    for (let i = 0; i < years.length; i++) {
        const year = years[i];
        const x = map(year, yearRange.min, yearRange.max, slider.x, slider.x + slider.width);
        const dataRatio = yearDataCounts[year];
        const y = graphY + graphHeight - (dataRatio * graphHeight);

        vertex(x, y);
    }
    endShape(CLOSE);
    
    // Punti sul grafico
    for (let year of years) {
        const x = map(year, yearRange.min, yearRange.max, slider.x, slider.x + slider.width);
        const dataRatio = yearDataCounts[year];
        const y = graphY + graphHeight - (dataRatio * graphHeight);
        
        fill(CONFIG.colors.slider.wave);
        noStroke();
        ellipse(x, y, 6);
    }
    
    pop();
}

function updateSliderThumb() {
    const percent = (currentYear - yearRange.min) / (yearRange.max - yearRange.min);
    slider.thumb.x = slider.x + percent * slider.width;
}

function mouseMoved() {
    // Controlla se siamo sopra lo slider
    isHoveringSlider = (
        mouseX >= slider.x - 20 && 
        mouseX <= slider.x + slider.width + 20 &&
        mouseY >= slider.y - 60 && 
        mouseY <= slider.y + 40
    );
    
    if (isHoveringSlider) {
        hoveredYear = getYearFromX(mouseX);
        // Cambia il cursore a "pointer" quando siamo sopra lo slider
        document.body.style.cursor = 'pointer';
    } else {
        hoveredYear = null;
        document.body.style.cursor = 'default';
    }
    
    // Mantieni anche l'update della cella hovered per la matrice
    updateHoveredCell();
    
    return false;
}

function mousePressed() {
    // Check slider thumb
    if (dist(mouseX, mouseY, slider.thumb.x, slider.y + 5) < slider.thumb.width / 2) {
        slider.thumb.dragging = true;
        document.body.style.cursor = 'grabbing';
        return;
    }
    
    // Check slider track o area hover
    if (mouseX >= slider.x && mouseX <= slider.x + slider.width &&
        mouseY >= slider.y - 10 && mouseY <= slider.y + 20) {
        updateYearFromSlider(mouseX);
        slider.thumb.dragging = true;
        document.body.style.cursor = 'grabbing';
        return;
    }
    
    // Se clicchi nell'area del grafico hover
    if (isHoveringSlider) {
        updateYearFromSlider(mouseX);
        slider.thumb.dragging = true;
        document.body.style.cursor = 'grabbing';
        return;
    }
    
    return true;
}

function mouseDragged() {
    if (slider.thumb.dragging) {
        updateYearFromSlider(mouseX);
        document.body.style.cursor = 'grabbing';
    }
    return false;
}

function mouseReleased() {
    slider.thumb.dragging = false;
    if (isHoveringSlider) {
        document.body.style.cursor = 'pointer';
    } else {
        document.body.style.cursor = 'default';
    }
    return false;
}

function updateYearFromSlider(x) {
    const percent = constrain((x - slider.x) / slider.width, 0, 1);
    currentYear = yearRange.min + round(percent * (yearRange.max - yearRange.min));
    updateSliderThumb();
    
    // Calcola il range delle percentuali per il nuovo anno
    calculateWastePercentageRange(currentYear);
    
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
            const x = CONFIG.layout.margin.horizontal + 10; // Posizione a destra delle label
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
    const basketSpace = 40;
    const x = CONFIG.layout.margin.horizontal + basketSpace + col * cellWidth;
    const y = matrixY + row * cellHeight;
    
    const country = sortedCountries[row];
    const exists = checkCombinationCached(country, commodities[col], year);
    const isHovered = (row === hoveredRow || col === hoveredCol);
    const isClicked = (row === clickedRow && col === clickedCol);

    // Rimuovi completamente lo sfondo della cella - solo immagini!
    drawCellDot(row, col, x, y, exists, country, year);
}

function checkCombinationCached(country, commodity, year) {
    const cacheKey = `${country}-${commodity}-${year}`;
    
    if (combinationCache[cacheKey] === undefined) {
        combinationCache[cacheKey] = checkCombination(country, commodity, year);
    }
    
    return combinationCache[cacheKey];
}

function drawCellDot(row, col, x, y, exists, country, year) {
    let img = null;

    if (exists) {
        img = commodityImages[col];
    } else {
        img = commodityOutlineImages[col]; 
    }
    
    if (img && img.width > 0) {
        push();
        imageMode(CENTER);
        noSmooth(); // Disabilita interpolazione per immagini nitide
        
        const naturalWidth = img.width;
        const naturalHeight = img.height;
        
        // Calcola la dimensione target in base alla percentuale
        let targetSize;
        if (exists) {
            const percentage = getWastePercentage(country, commodities[col], year);
            targetSize = calculateImageSize(percentage);
        } else {
            // Per le immagini outline usa la dimensione originale del tuo codice precedente
            // Non ridimensionare le outline - mantieni come erano
            const targetMax = min(cellWidth * 0.9, cellHeight * 0.9);
            
            // Calcola scala che mantenga proporzioni
            let scale = 1;
            if (naturalWidth > targetMax || naturalHeight > targetMax) {
                // Riduci
                const widthScale = targetMax / naturalWidth;
                const heightScale = targetMax / naturalHeight;
                scale = min(widthScale, heightScale);
            }
            
            // Arrotonda a 2 decimali per evitare scaling frazionario
            scale = Math.round(scale * 100) / 100;
            
            const w = naturalWidth * scale;
            const h = naturalHeight * scale;
            
            // Disegna l'immagine outline con la vecchia logica
            image(img, x + cellWidth/2, y + cellHeight/2, w, h);
            pop();
            smooth();
            return; // Esci dalla funzione dopo aver disegnato l'outline
        }
        
        // Solo per immagini normali (esistono): calcola scala in base alla percentuale
        let scale;
        if (naturalWidth > naturalHeight) {
            // Immagine più larga che alta
            scale = targetSize / naturalWidth;
        } else {
            // Immagine più alta che larga
            scale = targetSize / naturalHeight;
        }
        
        // Arrotonda per evitare scaling frazionario
        scale = Math.round(scale * 100) / 100;
        
        const w = naturalWidth * scale;
        const h = naturalHeight * scale;
        
        // Disegna l'immagine
        image(img, x + cellWidth/2, y + cellHeight/2, w, h);
        pop();
        smooth(); // Riabilita smooth per il resto
        
    } else {
        // Fallback (solo per debug)
        if (exists) {
            fill(100, 200, 100);
            noStroke();
            ellipse(x + cellWidth/2, y + cellHeight/2, min(cellWidth, cellHeight) * 0.4);
        } else {
            stroke(150);
            strokeWeight(1);
            noFill();
            ellipse(x + cellWidth/2, y + cellHeight/2, min(cellWidth, cellHeight) * 0.4);
        }
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
    
    // Testo del tooltip
    noStroke();
    fill(CONFIG.colors.text.tooltip);
    textAlign(LEFT, TOP);
    
    for (let i = 0; i < lines.length; i++) {
        const yPos = tooltipY + padding + i * lineHeight;
        text(lines[i], tooltipX + padding, yPos);
    }
    pop();
}

function drawSizeLegend() {
    const legendX = width - CONFIG.layout.margin.horizontal + 50;
    const legendY = matrixY + 20;
    const legendWidth = CONFIG.layout.legend.width;
    const legendHeight = CONFIG.layout.legend.height;
    const padding = CONFIG.layout.legend.padding;
    
    push();
    
    // Sfondo della legenda
    fill(CONFIG.colors.legend.background);
    noStroke();
    rect(legendX, legendY, legendWidth, legendHeight, 8);
    
    // Pallini sovrapposti per min e max
    const circleY = legendY + 35;
    const smallCircleX = legendX + 20;
    const bigCircleX = legendX + legendWidth - 30;
    
    // Disegna i pallini senza contorno, con trasparenza e che si intersecano
    fill(CONFIG.colors.legend.circle + 'CC');
    noStroke();
    
    // Calcola l'intersezione - posiziona i cerchi in modo che si sovrappongano
    const overlap = 15;
    const smallSize = imageSizeRange.min * 1.5;
    const bigSize = imageSizeRange.max * 1.2;
    
    // Calcola la distanza tra i due cerchi principali
    const distance = bigCircleX - smallCircleX;
    
    // Numero di cerchi intermedi desiderati
    const intermediateCircles = 3;
    
    // Disegna il cerchio grande (max)
    ellipse(bigCircleX - overlap/2, circleY, bigSize);
    
    // Disegna cerchi intermedi
    for (let i = 1; i <= intermediateCircles; i++) {
        // Calcola la posizione proporzionale tra i due cerchi
        const t = i / (intermediateCircles + 1);
        const x = smallCircleX + (distance * t);
        
        // Calcola la dimensione proporzionale
        const size = smallSize + (bigSize - smallSize) * t;
        
        ellipse(x, circleY, size);
    }
    
    // Disegna il cerchio piccolo (min) che si sovrappone
    ellipse(smallCircleX + overlap/2, circleY, smallSize);
    
    // Testo per min e max
    fill(CONFIG.colors.legend.background);
    noStroke();
    textSize(CONFIG.typography.legendSize);
    textAlign(CENTER, CENTER);
    
    // Testo per min
    text(`${wastePercentages.min.toFixed(1)}%`, smallCircleX + overlap/2, circleY);
    
    // Testo per max
    text(`${wastePercentages.max.toFixed(1)}%`, bigCircleX - overlap/2, circleY);
    
    // Linea separatrice
    stroke(CONFIG.colors.background + '99');
    strokeWeight(1);
    line(legendX + padding, legendY + 80, legendX + legendWidth - padding, legendY + 80);
    
    // Immagine outline e testo "dato non presente"
    const outlineImageY = legendY + 110;
    
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
            
            image(outlineImg, legendX + 40, outlineImageY, w, h);
            pop();
            smooth();
        }
    }
    
    // Testo "dato non presente"
    fill(CONFIG.colors.background);
    noStroke();
    textSize(CONFIG.typography.legendSize);
    textAlign(LEFT, CENTER);
    text("dato non presente", legendX + 60, outlineImageY);
    
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
    calculateWastePercentageRange(currentYear); // Aggiorna il range delle percentuali
    sortCountriesByCommodities(currentYear);
    
    // Ridimensiona il canvas prima di ridisegnare
    resizeCanvasForCurrentData();
    
    redraw();
}