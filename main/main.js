// ===== CONFIGURAZIONE COMPLETA =====
const CONFIG = {
    colors: {
        background: '#F5F3EE',
        text: {
            primary: '#283618',
            tooltip: '#F5F3EE',
            hover: '#F5F3EE' // Bianco per testo in hover
        },
        tooltip: {
            background: '#415E5A',
            border: '#283618'
        },
        slider: {
            track: '#415E5A',
            thumb: '#F5F3EE',
            text: '#16201f',
            wave: '#415E5A' // Colore per il grafico a onda
        },
        legend: {
            background: '#415E5A', // Colore di sfondo della legenda
            border: '#415E5A',
            circle: '#F5F3EE' // Colore dei pallini (stesso sfondo del sito)
        },
        row: {
            hover: '#415E5A', // Verde per l'hover della riga
            circle: '#ffffffff' // Bianco per i cerchi in hover
        }
    },
    layout: {
        headerHeight: 0,
        sliderHeight: 100,
        margin: {
            horizontal: 300,
            vertical: 110
        },
        minCellHeight: 70,
        maxCellHeight: 100,
        maxCellWidth: 120,
        basketOffset: 60,
        imageSizing: {
            min: 20,  // Dimensione minima in pixel
            max: 50   // Dimensione massima in pixel
        },
        legend: {
            width: 180, // Leggermente più larga
            height: 260, // Più alta per ospitare l'immagine
            marginRight: 50, // Più vicina al centro
            padding: 15
        }
    },
    typography: {
        titleSize: 48,
        columnSize: 11,
        rowSize: 14,
        tooltipSize: 12,
        sliderValueSize: 20,
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
let commodityOutlineImagesHover = []; // Immagini contorno bianco per commodity senza dati in hover
let basketImage = null;
let legendImage = null;

// Variabili per il ridimensionamento immagini
let wastePercentages = { min: Infinity, max: -Infinity }; // Min e max delle percentuali
let imageSizeRange = { min: 20, max: 50 }; // Range dimensioni immagini

// Variabili per l'effetto slider tipo YouTube
let yearDataCounts = {}; // Conterrà il numero di righe per ogni anno
let isHoveringSlider = false; // Per sapere se siamo sopra lo slider
let hoveredYear = null; // L'anno su cui siamo con il mouse

// Variabili per hover sulla riga
let hoveredRowData = null; // Dati della riga in hover
let isHoveringBasket = false; // Se siamo sopra un cestino
let isHoveringCountry = false; // Se siamo sopra il nome di un paese

// ===== CACHE =====
let combinationCache = {};
let currentCacheYear = null;

// ===== INIZIALIZZAZIONE =====
function preload() {
    dataset = loadTable('../assets/dataset/cleaned_dataset_inglese.csv', 'csv', 'header', initializeData);
    basketImage = loadImage('../assets/img/basket.svg');
    legendImage = loadImage('../assets/img/legenda.svg');
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
        commodityOutlineImagesHover.push(loadImage('../assets/img/outlineBianchi/' + commodityName + '.svg'));
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

    // Prima disegna il rettangolo di hover se necessario
    if (hoveredRowData) {
        drawRowHoverBackground();
    }

    // Disegna prima la matrice
    drawMatrix(currentYear);
    
    // Poi le label (così sono sopra il rettangolo di hover)
    drawRowLabels();
    
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
    
    // Punti del grafico sulla track
    drawSliderDataPoints();
    
    // Slider thumb
    stroke(CONFIG.colors.slider.track);
    strokeWeight(2);
    fill(CONFIG.colors.slider.thumb);
    ellipse(slider.thumb.x, slider.y + 10, slider.thumb.width);
    noStroke();
    
    // --- Year Box in Center ---
    const boxW = 120;
    const boxH = 50;
    const boxX = slider.x + slider.width / 2 - boxW / 2;
    const boxY = slider.y +80; // sopra lo slider
    
    // Rettangolo con bordo
    stroke('#415E5A');
    strokeWeight(2);
    noFill();
    rect(boxX, boxY, boxW, boxH, 10);
    
    // Scritta sopra il numero
    noStroke();
    fill('#415E5A');
    textSize(14);
    textAlign(CENTER, TOP);
    textFont(CONFIG.typography.fontFamily);
    text("Selected Year", boxX + boxW / 2, boxY -20);
    
    // Numero anno centrato
    textSize(CONFIG.typography.sliderValueSize);
    textAlign(CENTER, CENTER);
    text(currentYear, boxX + boxW / 2, boxY + boxH / 2);
    
    // Etichette min e max
    textSize(12);
    textAlign(LEFT);
    text(yearRange.min, slider.x, slider.y + 45);
    textAlign(RIGHT);
    text(yearRange.max, slider.x + slider.width, slider.y + 45);
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
        document.body.style.cursor = 'pointer';
    } else {
        hoveredYear = null;
    }
    
    // Aggiorna hover sulla riga, cestino e paese
    updateRowHover();
    
    // Mantieni anche l'update della cella hovered per la matrice
    updateHoveredCell();
    
    return false;
}

// Aggiorna hover sulla riga, cestino e paese
function updateRowHover() {
    const matrixY = CONFIG.layout.headerHeight + CONFIG.layout.sliderHeight + CONFIG.layout.margin.vertical;
    
    // Controlla se siamo sopra una riga
    hoveredRowData = null;
    isHoveringBasket = false;
    isHoveringCountry = false;
    
    for (let i = 0; i < sortedCountries.length; i++) {
        const rowY = matrixY + i * cellHeight;
        
        // Area del cestino
        const basketX = CONFIG.layout.margin.horizontal + 10;
        const basketY = rowY + cellHeight / 2;
        const basketSize = 40;
        
        if (dist(mouseX, mouseY, basketX, basketY) < basketSize / 2) {
            isHoveringBasket = true;
            hoveredRowData = {
                row: i,
                country: sortedCountries[i],
                y: rowY,
                height: cellHeight
            };
            document.body.style.cursor = 'pointer';
            return;
        }
        
        // Area del nome del paese
        const countryX = CONFIG.layout.margin.horizontal - 140;
        const countryY = rowY + cellHeight / 2;
        const countryWidth = 130;
        const countryHeight = cellHeight;
        
        if (mouseX >= countryX && mouseX <= countryX + countryWidth &&
            mouseY >= rowY && mouseY <= rowY + cellHeight) {
            isHoveringCountry = true;
            hoveredRowData = {
                row: i,
                country: sortedCountries[i],
                y: rowY,
                height: cellHeight
            };
            document.body.style.cursor = 'pointer';
            return;
        }
        
        // Area della riga (tutta la larghezza della matrice)
        const rowStartX = CONFIG.layout.margin.horizontal + 40; // Dopo il cestino
        const rowEndX = CONFIG.layout.margin.horizontal + 40 + (commodities.length * cellWidth);
        
        if (mouseX >= rowStartX && mouseX <= rowEndX &&
            mouseY >= rowY && mouseY <= rowY + cellHeight) {
            hoveredRowData = {
                row: i,
                country: sortedCountries[i],
                y: rowY,
                height: cellHeight
            };
            document.body.style.cursor = 'pointer';
            return;
        }
    }
    
    // Se non siamo su niente di speciale, reset cursor
    if (!isHoveringSlider && !isHoveringBasket && !isHoveringCountry && !hoveredRowData) {
        document.body.style.cursor = 'default';
    }
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
    
    // Se clicchi sul cestino o sul nome del paese
    if (isHoveringBasket || isHoveringCountry) {
        clickedRow = hoveredRowData.row;
        const countryName = hoveredRowData.country;
        
        // Reindirizza alla pagina del paese
        window.location.href = `../visione%20dettaglio%20waste/country.html?country=${encodeURIComponent(countryName)}&year=${currentYear}`;
        
        return false;
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
    if (isHoveringSlider || isHoveringBasket || isHoveringCountry || hoveredRowData) {
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
    textFont(CONFIG.typography.fontFamily);
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
    

    
    // Poi disegna i nomi dei paesi (sopra il rettangolo)
    for (let i = 0; i < sortedCountries.length; i++) {
        const x = CONFIG.layout.margin.horizontal - 80;
        const y = matrixY + i * cellHeight + cellHeight / 2;
        let labelText = sortedCountries[i];
        
        // Tronca il testo se troppo lungo
        if (labelText.length > CONFIG.typography.maxCountryChars) {
            labelText = labelText.slice(0, CONFIG.typography.maxCountryChars) + '…';
        }
        
        push();
        textAlign(LEFT, CENTER);
        textSize(CONFIG.typography.rowSize);
        textFont(CONFIG.typography.fontFamily);
        
        // Se questa riga è in hover, usa testo bianco
        if (hoveredRowData && hoveredRowData.row === i) {
            fill(CONFIG.colors.text.hover);
        } else {
            fill(CONFIG.colors.text.primary);
        }
        
        text(labelText, x, y);
        pop();
    }
    
    // Disegna i cestini
    if (basketImage && basketImage.width > 0) {
        for (let i = 0; i < sortedCountries.length; i++) {
            const x = CONFIG.layout.margin.horizontal - 115; // Posizione a destra delle label
            const y = matrixY + i * cellHeight + cellHeight / 2;
            const targetWidth = 50; // Larghezza target
            const targetHeight = 50; // Altezza target
            
            push();
            imageMode(CENTER);
            
            // Calcola le proporzioni corrette mantenendo l'aspect ratio originale
            const imgRatio = basketImage.width / basketImage.height;
            const targetRatio = targetWidth / targetHeight;
            
            let displayWidth, displayHeight;
            
            if (imgRatio > targetRatio) {
                // L'immagine è più larga che alta rispetto al target
                displayWidth = targetWidth;
                displayHeight = targetWidth / imgRatio;
            } else {
                // L'immagine è più alta che larga rispetto al target
                displayHeight = targetHeight;
                displayWidth = targetHeight * imgRatio;
            }
            
            // Se questa riga è in hover, applica un filtro bianco al cestino
            if (hoveredRowData && hoveredRowData.row === i) {
                tint(CONFIG.colors.text.hover);
            }
            
            image(basketImage, x, y, displayWidth, displayHeight);
            noTint(); // Rimuovi il tint per le prossime immagini
            pop();
        }
    }

}

// Disegna il rettangolo di hover per la riga
function drawRowHoverBackground() {
    const rowY = hoveredRowData.y;
    const rowHeight = hoveredRowData.height;
    
    push();
    
    // Rettangolo con punte arrotondate
    fill(CONFIG.colors.row.hover ); // 80 = 50% trasparenza
    noStroke();
    
    // Calcola le coordinate
    const startX = CONFIG.layout.margin.horizontal - 150; // Inizia dal testo del paese
    const endX = CONFIG.layout.margin.horizontal + 40 + (commodities.length * cellWidth); // Finisce dopo tutte le commodity
    const width = endX - startX;
    
    // Disegna rettangolo con angoli arrotondati
    rect(startX, rowY, width, rowHeight, 15);
    
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
        if(hoveredRowData && hoveredRowData.row === row) {
            img = commodityOutlineImagesHover[col]; 
        } else {
            img = commodityOutlineImages[col]; 
        }
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
            targetSize = calculateImageSize(percentage)* 1.2; // Scala leggermente più grande per immagini piene
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
            
            let w = naturalWidth * scale;
            let h = naturalHeight * scale;

            // Se la riga è in hover, usa cerchio bianco
            if (hoveredRowData && hoveredRowData.row === row) {
                fill(CONFIG.colors.row.circle); // Bianco con trasparenza
            } else {
                fill(CONFIG.colors.legend.background+'cc'); // Colore normale
            }
            
            circle(x + cellWidth/2, y + cellHeight/2, max(w, h)); // Cerchio di sfondo
            w = w * 0.7; // Riduci leggermente per adattarsi al cerchio
            h = h * 0.7;
            image(img, x + cellWidth/2, y + cellHeight/2, w, h);
            return;
        } 
        

        // Per le immagini outline usa la dimensione originale del tuo codice precedente
        const targetMax = min(cellWidth * 0.7, cellHeight * 0.7);
        
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
  "The diameter of each circle\nrepresent the percentage\nof waste for that commodity.",
  textX,
  textY
);

// 2) Testo secondario più piccolo
textSize(CONFIG.typography.legendSize - 2);
textLeading(13);

const secondY = textY + 48; // distanza sotto al primo blocco
text(
  "Move along the timeline to observe\nfood waste over the years",
  textX,
  secondY
);

    
    // Pallini sovrapposti per min e max
    const circleY = legendY + 130;
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
        // Calcola la posizione proporzionale entre i due cerchi
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
    textFont(CONFIG.typography.fontFamily);
    textAlign(CENTER, CENTER);
    
    // Testo per min
    text(`${wastePercentages.min.toFixed(1)}%`, smallCircleX + overlap/2, circleY);
    
    // Testo per max
    text(`${wastePercentages.max.toFixed(1)}%`, bigCircleX - overlap/2, circleY);
    
    // Linea separatrice
    stroke(CONFIG.colors.background + '99');
    strokeWeight(1);
    line(legendX + padding, legendY + 180, legendX + legendWidth - padding, legendY + 180);
    
    // Immagine outline e testo "dato non presente"
    const outlineImageY = legendY + 215;
    
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
            
            image(outlineImg, legendX + 50, outlineImageY, w, h);
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
    text("Data not found", legendX + 70, outlineImageY+3);
    
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