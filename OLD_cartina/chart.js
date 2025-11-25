// ===== CONFIGURAZIONE =====
const CONFIG = {
    colors: {
        background: '#ffffff00', // Trasparente per far vedere lo sfondo CSS
        chartBackground: '#ffffffcc', // Bianco semitrasparente (80% opaco)
        point: {
            minColor: '#F7BA14',  // Colore chiaro per valori bassi
            maxColor: '#C31A1A',  // Colore scuro per valori alti
            hover: '#331a05',      // Colore hover ancora più scuro
            clicked: '#1a0d02'     // Colore quando cliccato (aggiunto)
        },
        axes: {
            line: '#331a05',
            text: '#331a05'
        },
        tooltip: {
            background: '#ffffffff',
            border: '#EC3434',
            text: '#331a05'
        }
    },
    layout: {
        margin: 60,
        chartPadding: 20, // Aggiunto padding per lo sfondo
        point: {
            minSize: 8,
            maxSize: 35
        }
    },
    typography: {
        axisSize: 12,
        tooltipSize: 11
    }
};

// ===== VARIABILI GLOBALI =====
let dataset = [], commodities = [], countries = [];
let yearSlider, yearValue;
let hoveredPoint = null;
let clickedPoint = null; // Aggiunto per gestire il punto cliccato
let countriesData = [];
let maxWastePercentage = 0;

// ===== INIZIALIZZAZIONE =====
function preload() {
    console.log("Preloading dataset...");
    dataset = loadTable('../assets/dataset/cleaned_dataset.csv', 'csv', 'header', initializeData);
    console.log("Dataset loaded.");
}

function initializeData() {
    console.log("Initializing data...");
    commodities = getUniqueValues('commodity');
    console.log("Unique commodities:", commodities);
    countries = getUniqueValues('country');
    console.log("Unique countries:", countries);
}

function getUniqueValues(columnName) {
    const values = new Set();
    for (let i = 0; i < dataset.getRowCount(); i++) {
        values.add(dataset.getString(i, columnName));
    }
    return Array.from(values);
}

function setup() {
    const headerHeight = 120;
    const canvasHeight = windowHeight - headerHeight;
    createCanvas(windowWidth, canvasHeight);
    
    initializeSlider();
    calculateCountriesData(int(yearSlider.value));
}

// ===== GESTIONE SLIDER =====
function initializeSlider() {
    yearSlider = document.getElementById("yearSlider");
    yearValue = document.getElementById("yearValue");
    const sliderTrack = document.getElementById("sliderTrack");

    if (!yearSlider || !yearValue || !sliderTrack) {
        console.error("Elementi slider non trovati!");
        return;
    }

    setupSlider();
    setupSliderInteractions(sliderTrack);
    updateActiveTick();
}

function setupSlider() {
    const years = getYearRange();
    yearSlider.min = years.min;
    yearSlider.max = years.max;
    yearSlider.value = years.max;
    yearValue.innerHTML = years.max;
}

function getYearRange() {
    const years = [];
    for (let i = 0; i < dataset.getRowCount(); i++) {
        years.push(dataset.getNum(i, 'year'));
    }
    return {
        min: Math.min(...years),
        max: Math.max(...years)
    };
}

function setupSliderInteractions(sliderTrack) {
    sliderTrack.addEventListener("click", (e) => {
        const percent = getClickPercent(e, sliderTrack);
        const newValue = calculateSliderValue(percent);
        
        yearSlider.value = newValue;
        updateYear();
        updateActiveTick();
    });
}

function getClickPercent(event, element) {
    const rect = element.getBoundingClientRect();
    return (event.clientX - rect.left) / rect.width;
}

function calculateSliderValue(percent) {
    const min = parseInt(yearSlider.min);
    const max = parseInt(yearSlider.max);
    return min + Math.round(percent * (max - min));
}

function updateYear() {
    yearValue.innerHTML = yearSlider.value;
    calculateCountriesData(int(yearSlider.value));
    redraw();
}

function updateActiveTick() {
    const slider = document.getElementById("yearSlider");
    const activeTick = document.getElementById("activeTick");
    const track = document.getElementById("sliderTrack");

    if (!slider || !activeTick || !track) return;

    const percent = getSliderPercent(slider);
    activeTick.style.left = (percent * 100) + "%";
}

function getSliderPercent(slider) {
    const min = parseInt(slider.min);
    const max = parseInt(slider.max);
    const value = parseInt(slider.value);
    return (value - min) / (max - min);
}

// ===== CALCOLO DATI PER LA CHART =====
function calculateCountriesData(currentYear) {
    countriesData = [];
    maxWastePercentage = 0;
    
    for (let country of countries) {
        const countryData = {
            name: country,
            wastePercentage: 0,
            commoditiesCount: 0,
            totalWaste: 0,
            dataPoints: 0
        };
        
        for (let commodity of commodities) {
            const row = findDatasetRow(country, commodity, currentYear);
            if (row) {
                const wastePct = parseFloat(row.getString('loss_percentage'));
                if (!isNaN(wastePct)) {
                    countryData.totalWaste += wastePct;
                    countryData.dataPoints++;
                    countryData.commoditiesCount++;
                }
            }
        }
        
        if (countryData.dataPoints > 0) {
            countryData.wastePercentage = countryData.totalWaste / countryData.dataPoints;
            if (countryData.wastePercentage > maxWastePercentage) {
                maxWastePercentage = countryData.wastePercentage;
            }
        }
        
        if (countryData.commoditiesCount > 0) {
            countriesData.push(countryData);
        }
    }
    
    countriesData.sort((a, b) => a.name.localeCompare(b.name));
    maxWastePercentage = maxWastePercentage * 1.1;
    
    return countriesData;
}

function findDatasetRow(country, commodity, year) {
    for (let i = 0; i < dataset.getRowCount(); i++) {
        if (dataset.getString(i, 'country') === country &&
            dataset.getString(i, 'commodity') === commodity &&
            dataset.getNum(i, 'year') === year) {
            return dataset.getRow(i);
        }
    }
    return null;
}

// ===== RENDER CHART MODIFICATO =====
function draw() {
    // Sfondo trasparente per far vedere l'immagine CSS
    background(CONFIG.colors.background);
    
    if (!yearSlider || countriesData.length === 0) return;

    // Disegna lo sfondo semitrasparente per l'area del grafico
    drawChartBackground();
    
    updateHoveredPoint();
    drawAxes();
    drawDataPoints();
    drawAxisLabels();
    
    if (hoveredPoint !== null) {
        drawTooltip();
    }
}

// AGGIUNTA: Funzione per lo sfondo semitrasparente
function drawChartBackground() {
    fill(CONFIG.colors.chartBackground);
    noStroke();
    rect(
        CONFIG.layout.margin - CONFIG.layout.chartPadding, 
        CONFIG.layout.margin - CONFIG.layout.chartPadding, 
        width - (CONFIG.layout.margin - CONFIG.layout.chartPadding) * 2, 
        height - (CONFIG.layout.margin - CONFIG.layout.chartPadding) * 2,
        10 // Border radius
    );
}

function drawAxes() {
    stroke(CONFIG.colors.axes.line);
    strokeWeight(1.5);
    
    // Asse Y (verticale - percentuale)
    line(CONFIG.layout.margin, CONFIG.layout.margin, 
         CONFIG.layout.margin, height - CONFIG.layout.margin);
    
    // Asse X (orizzontale - paesi)
    line(CONFIG.layout.margin, height - CONFIG.layout.margin, 
         width - CONFIG.layout.margin, height - CONFIG.layout.margin);
}

function drawAxisLabels() {
    push();
    textAlign(RIGHT, CENTER);
    textSize(CONFIG.typography.axisSize);
    fill(CONFIG.colors.axes.text);
    textFont('Inter');
    
    const tickStep = maxWastePercentage <= 20 ? 5 : 
                    maxWastePercentage <= 50 ? 10 : 20;
    
    for (let pct = 0; pct <= maxWastePercentage; pct += tickStep) {
        const y = map(pct, 0, maxWastePercentage, height - CONFIG.layout.margin, CONFIG.layout.margin);
        text(pct.toFixed(0) + '%', CONFIG.layout.margin - 10, y);
        
        stroke(200);
        strokeWeight(0.3);
        line(CONFIG.layout.margin, y, width - CONFIG.layout.margin, y);
    }
    pop();
    
    // Titoli con margini ridotti
    push();
    textAlign(CENTER, CENTER);
    textSize(CONFIG.typography.axisSize - 1);
    fill(CONFIG.colors.axes.text);
    textFont('Inter');
    translate(20, height / 2);
    rotate(-HALF_PI);
    text('Waste %', 0, 0);
    pop();
    
    push();
    textAlign(CENTER, CENTER);
    textSize(CONFIG.typography.axisSize - 1);
    fill(CONFIG.colors.axes.text);
    textFont('Inter');
    text('Countries', width / 2, height - 15);
    pop();
}

function drawDataPoints() {
    const maxCommodities = Math.max(...countriesData.map(d => d.commoditiesCount));
    
    for (let i = 0; i < countriesData.length; i++) {
        const data = countriesData[i];
        const isHovered = (hoveredPoint === i);
        const isClicked = (clickedPoint === i);
        
        drawDataPoint(data, i, countriesData.length, maxCommodities, isHovered, isClicked);
    }
}

function drawDataPoint(countryData, index, totalCountries, maxCommodities, isHovered, isClicked) {
    const x = map(index, 0, totalCountries - 1, 
                 CONFIG.layout.margin + 30, width - CONFIG.layout.margin - 30);
    
    const y = map(countryData.wastePercentage, 0, maxWastePercentage, 
                 height - CONFIG.layout.margin, CONFIG.layout.margin);
    
    const size = map(countryData.commoditiesCount, 0, maxCommodities, 
                    CONFIG.layout.point.minSize, CONFIG.layout.point.maxSize);
    
    let pointColor;
    if (isClicked) {
        pointColor = CONFIG.colors.point.clicked;
    } else if (isHovered) {
        pointColor = CONFIG.colors.point.hover;
    } else {
        const colorIntensity = map(countryData.wastePercentage, 0, maxWastePercentage, 0, 1);
        pointColor = lerpColor(
            color(CONFIG.colors.point.minColor),
            color(CONFIG.colors.point.maxColor),
            colorIntensity
        );
    }
    
    fill(pointColor);
    noStroke();
    ellipse(x, y, size);
    
    if (isHovered || isClicked) {
        noFill();
        stroke(isClicked ? CONFIG.colors.point.clicked : CONFIG.colors.point.hover);
        strokeWeight(2);
        ellipse(x, y, size + 8);
    }
}

function updateHoveredPoint() {
    hoveredPoint = null;
    
    for (let i = 0; i < countriesData.length; i++) {
        const data = countriesData[i];
        const x = map(i, 0, countriesData.length - 1, 
                     CONFIG.layout.margin + 30, width - CONFIG.layout.margin - 30);
        
        const y = map(data.wastePercentage, 0, maxWastePercentage, 
                     height - CONFIG.layout.margin, CONFIG.layout.margin);
        
        const size = map(data.commoditiesCount, 0, Math.max(...countriesData.map(d => d.commoditiesCount)), 
                        CONFIG.layout.point.minSize, CONFIG.layout.point.maxSize);
        
        const distance = dist(mouseX, mouseY, x, y);
        
        if (distance < size / 2 + 5) {
            hoveredPoint = i;
            break;
        }
    }
}

// AGGIUNTA: Funzione per gestire il click del mouse
function mouseClicked() {
    if (hoveredPoint !== null) {
        clickedPoint = hoveredPoint;
        const countryName = countriesData[hoveredPoint].name;
        
        // Naviga alla pagina di dettaglio con il parametro country
        window.location.href = `../visione%20dettaglio%20waste/country.html?country=${encodeURIComponent(countryName)}`;
        
        return false; // Previene altri eventi
    }
    return true;
}

function drawTooltip() {
    if (hoveredPoint === null) return;
    
    const data = countriesData[hoveredPoint];
    const x = map(hoveredPoint, 0, countriesData.length - 1, 
                 CONFIG.layout.margin + 30, width - CONFIG.layout.margin - 30);
    
    const y = map(data.wastePercentage, 0, maxWastePercentage, 
                 height - CONFIG.layout.margin, CONFIG.layout.margin);
    
    const tooltipText = [
        data.name,
        `Waste: ${data.wastePercentage.toFixed(1)}%`,
        `Commodities: ${data.commoditiesCount}/${commodities.length}`,
    ];
    
    push();
    textSize(CONFIG.typography.tooltipSize);
    textFont('Inter');
    
    const padding = 12;
    const lineHeight = 18;
    const maxWidth = Math.max(...tooltipText.map(line => textWidth(line))) + padding * 2;
    const tooltipHeight = tooltipText.length * lineHeight + padding;
    
    let tooltipX = mouseX + 20;
    let tooltipY = mouseY - tooltipHeight / 2;
    
    if (tooltipX + maxWidth > width - 10) {
        tooltipX = mouseX - maxWidth - 20;
    }
    if (tooltipY < 10) {
        tooltipY = 10;
    }
    if (tooltipY + tooltipHeight > height - 10) {
        tooltipY = height - tooltipHeight - 10;
    }
    
    fill(CONFIG.colors.tooltip.background);
    stroke(CONFIG.colors.tooltip.border);
    strokeWeight(1);
    rect(tooltipX, tooltipY, maxWidth, tooltipHeight, 5);
    
    noStroke();
    fill(CONFIG.colors.tooltip.text);
    textAlign(LEFT, TOP);
    
    for (let i = 0; i < tooltipText.length; i++) {
        const lineY = tooltipY + padding + i * lineHeight;
        
        // Ultima riga in grassetto (indicazione click)
        if (i === tooltipText.length - 1) {
            push();
            textStyle(BOLD);
            text(tooltipText[i], tooltipX + padding, lineY);
            pop();
        } else {
            text(tooltipText[i], tooltipX + padding, lineY);
        }
    }
    
    pop();
}

function windowResized() {
    const headerHeight = 120;
    const canvasHeight = windowHeight - headerHeight;
    resizeCanvas(windowWidth, canvasHeight);
}