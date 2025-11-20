// sketch.js - Waste Visualization (main page)
// Assumptions about CSV structure if you supply one in assets:
// Columns: state,year,commodity,total_produced,wasted_amount
// - total_produced and wasted_amount are numeric
// The loader will try common filenames and fall back to mockData.

let table = null; // loaded p5.Table or null
let data = []; // normalized array of rows {state, year, commodity, total, waste}
let states = [];
let years = [];

let selectedState = null;
let selectedYear = 2020;

// visual parameters
const canvasW = 1100;
const canvasH = 700;
const boxesCols = 10;
const boxesRows = 10; // total boxes = 100 (fixed)
const totalBoxes = boxesCols * boxesRows; // fixed total production representation
let boxSize = 36;
let boxGap = 6;
// bag / modular unit
let boxesPerBag = 5; // modular unit: how many boxes correspond to 1 bag visually

let bagsToDraw = [];
let hoverBag = null;

function preload() {
// try a list of likely filenames; p5's loadTable will fail silently if 404 -> catch not available
const candidates = [

'assets/dataset/cleaned_dataset.csv'

];

// try to load first available file synchronously via promises emulation
// p5 doesn't give a way to test existence, so we'll use loadTable with try/catch using async await pattern is not available here.
// Instead, we'll attempt loadTable on the first candidate and rely on error handling in callback.
// To be robust, we'll just not use preload heavy assumptions and fallback to mock if loadTable doesn't return in setup.
}

function setup() {
let c = createCanvas(canvasW, canvasH);
c.position(0,0);
pixelDensity(1);

// UI elements
const stateSelect = document.getElementById('stateSelect');
const yearSlider = document.getElementById('yearSlider');
const yearLabel = document.getElementById('yearLabel');

// try to load dataset using loadTable with callback
loadAndParseDataset(() => {
populateUI();
updateVisuals();
});
yearSlider.addEventListener('input', (e) => {
selectedYear = Number(e.target.value);
yearLabel.textContent = selectedYear;
updateVisuals();
});

stateSelect.addEventListener('change', (e) => {
selectedState = e.target.value;
updateVisuals();
});

// init label
yearLabel.textContent = selectedYear;
}

function draw() {
background(240);

// draw factory stack (left)
push();
translate(40, 80);
drawFactoryStack();
pop();

// draw waste area (right)
push();
translate(520, 80);
drawWasteArea();
pop();

// draw hover tooltip if any
if (hoverBag) {
drawTooltip(hoverBag);
}
}

function drawFactoryStack() {
// draw label
noStroke();
fill(30);
textSize(18);
text('Produzione (rappresentazione fissa)', 0, -20);

// grid of boxes fixed totalBoxes
let x = 0;
let y = 0;
for (let r = 0; r < boxesRows; r++) {
for (let c = 0; c < boxesCols; c++) {
let px = c * (boxSize + boxGap);
let py = r * (boxSize + boxGap);
stroke(50);
fill(200);
rect(px, py, boxSize, boxSize, 4);
}
}
}
function drawWasteArea() {
text('Zona Rifiuti', 0, -20);

// draw some static bins/cassonetti icons
for (let i = 0; i < 3; i++) {
drawBin(40 + i*140, 20, 100, 140);
}

// draw bags computed
bagsToDraw.forEach((bag) => {
bag.draw();
});
}

function drawBin(x,y,w,h) {
push();
translate(x,y);
stroke(40);
fill(180);
rect(0,0,w,h,8);
// lid
rect(-5, -12, w+10, 12, 4);
pop();
}

function loadAndParseDataset(done) {
// Use loadTable with a guess; if it fails, use mock.
const tryFiles = ['assets/data.csv','assets/dataset.csv','assets/waste_data.csv','assets/waste.csv'];
let tried = 0;

function tryNext() {
if (tried >= tryFiles.length) {
console.warn('Nessun CSV trovato in assets: uso dataset mock.');
useMockData();
done();
return;
}
const f = tryFiles[tried++];
loadTable(f, 'csv', 'header', (tbl) => {
console.log('Caricato', f);
table = tbl;
parseTable(tbl);
done();
}, (err) => {
console.log('Impossibile caricare', f, '- provo il prossimo');
tryNext();
});
}
tryNext();
}

function parseTable(tbl) {
data = [];
states = [];
years = [];
for (let r = 0; r < tbl.getRowCount(); r++) {
let row = tbl.getRow(r);
let state = row.getString('state') || row.getString('State') || row.getString('country') || row.getString('location');
let year = Number(row.getString('year') || row.getString('Year'));
let commodity = row.getString('commodity') || row.getString('Commodity') || row.getString('food');
let total = Number(row.getString('total_produced') || row.getString('total') || row.getString('produced') || '0');
let waste = Number(row.getString('wasted_amount') || row.getString('waste') || row.getString('wasted') || '0');
if (!state || !commodity || isNaN(year)) continue;
data.push({state, year, commodity, total, waste});
if (!states.includes(state)) states.push(state);
if (!years.includes(year)) years.push(year);
}
states.sort();
years = [...new Set(years)].sort((a,b)=>a-b);
if (years.length) {
selectedYear = years[0];
document.getElementById('yearSlider').min = Math.min(...years);
document.getElementById('yearSlider').max = Math.max(...years);
document.getElementById('yearSlider').value = selectedYear;
document.getElementById('yearLabel').textContent = selectedYear;
}
if (states.length) selectedState = states[0];
}

function useMockData() {
// small mock dataset
data = [
{state:'Italy', year:2018, commodity:'Fruit', total:10000, waste:1200},
{state:'Italy', year:2018, commodity:'Vegetables', total:10000, waste:800},
{state:'Italy', year:2019, commodity:'Fruit', total:11000, waste:1500},
{state:'Italy', year:2019, commodity:'Vegetables', total:11000, waste:900},
{state:'France', year:2019, commodity:'Fruit', total:9000, waste:1000},
{state:'France', year:2019, commodity:'Dairy', total:9000, waste:700}
];
states = [...new Set(data.map(d=>d.state))].sort();
years = [...new Set(data.map(d=>d.year))].sort((a,b)=>a-b);
if (years.length) {
selectedYear = years[0];
document.getElementById('yearSlider').min = Math.min(...years);
document.getElementById('yearSlider').max = Math.max(...years);
document.getElementById('yearSlider').value = selectedYear;
document.getElementById('yearLabel').textContent = selectedYear;
}
if (states.length) selectedState = states[0];
}

function populateUI() {
const stateSelect = document.getElementById('stateSelect');
stateSelect.innerHTML = '';
states.forEach(s => {
const opt = document.createElement('option');
opt.value = s;
opt.textContent = s;
stateSelect.appendChild(opt);
});
if (selectedState) stateSelect.value = selectedState;
}

function updateVisuals() {
// compute bagsToDraw for selected state & year
bagsToDraw = [];
hoverBag = null;
if (!selectedState) return;

// subset for state & year
const subset = data.filter(d => d.state === selectedState && d.year === selectedYear);
if (!subset.length) return;

// compute aggregate totalProduced for state/year
// note: visual total boxes are fixed; we compute percentages from data
let totalProduced = 0;
subset.forEach(s => totalProduced += (s.total || 0));
if (totalProduced === 0) totalProduced = 1; // avoid div0

// for each commodity compute waste proportion
let x = 0;
let y = 220;
const bagW = 48;
const bagH = 64;
const gap = 14;
let col = 0;
subset.forEach((s, idx) => {
const percentWaste = s.waste / totalProduced; // fraction
// total visual units (boxes) that represent the fraction
const visualUnits = percentWaste * totalBoxes;
const numBags = Math.round(visualUnits / boxesPerBag);
// create that many bags (capped)
for (let i = 0; i < numBags; i++) {
const bx = (col % 3) * (bagW + gap) + (Math.floor(col/3) * 2);
const by = Math.floor(col/3) * (bagH + gap) + (idx % 2) * 4; // slight jitter
const bag = new Bag( bx, by, bagW, bagH, s.commodity, percentWaste, s );
bagsToDraw.push(bag);
col++;
}
// if numBags was zero but percentWaste > 0, draw a tiny bag
if (numBags === 0 && percentWaste > 0) {
const bx = (col % 3) * (bagW + gap);

const by = Math.floor(col/3) * (bagH + gap) + (idx % 2) * 4; // slight jitter
const bag = new Bag( bx, by, bagW, bagH, s.commodity, percentWaste, s );
bagsToDraw.push(bag);
col++;
}
// if numBags was zero but percentWaste > 0, draw a tiny bag
if (numBags === 0 && percentWaste > 0) {
const bx = (col % 3) * (bagW + gap);
const by = Math.floor(col/3) * (bagH + gap);
const bag = new Bag( bx, by, bagW, bagH, s.commodity, percentWaste, s, true );
bagsToDraw.push(bag);
col++;
}
});
}

class Bag {
constructor(x,y,w,h,commodity,percent,raw,small=false) {
this.x = x; this.y = y; this.w = w; this.h = h;
this.commodity = commodity;
this.percent = percent;
this.raw = raw;
this.small = small;

this.screenX = 520 + this.x;
this.screenY = 80 + this.y;
}

draw() {
push();
translate(this.x, this.y);
stroke(30);
fill(255, 230, 230);
if (this.small) scale(0.6);
rect(0, 0, this.w, this.h, 8);

// stringa del sacchetto
stroke(20);
line(this.w*0.4, 6, this.w*0.6, 6);

noStroke();
fill(40);
textSize(10);
textAlign(CENTER, CENTER);
text(this.commodity, this.w/2, this.h + 8);
pop();

// coordinate assolute per hover
this.absX = 520 + this.x;
this.absY = 80 + this.y;
this.absW = this.w * (this.small?0.6:1);
this.absH = this.h * (this.small?0.6:1);
}

isMouseOver(mx,my) {
return (
mx >= this.absX &&
mx <= this.absX + this.absW &&
my >= this.absY &&
my <= this.absY + this.absH
);
}
}

// ---- INTERAZIONE ----

function mouseMoved() {
hoverBag = null;
for (let b of bagsToDraw) {
if (b.isMouseOver(mouseX, mouseY)) {
hoverBag = b;
break;
}
}
}

function mouseClicked() {
if (hoverBag) {
const s = encodeURIComponent(hoverBag.raw.state);
const y = encodeURIComponent(hoverBag.raw.year);
const c = encodeURIComponent(hoverBag.raw.commodity);
window.open(`detail.html?state=${s}&year=${y}&commodity=${c}`, '_blank');
}
}

function drawTooltip(bag) {
const padding = 6;
const txt = `${bag.commodity} — ${(bag.percent*100).toFixed(1)}%`;
textSize(12);
const tw = textWidth(txt) + padding*2;
const th = 22;

let tx = mouseX + 12;
let ty = mouseY - 10;

if (tx + tw > width) tx = mouseX - tw - 12;
if (ty - th < 0) ty = mouseY + 12;

push();
fill(255);
stroke(60);
rect(tx, ty - th, tw, th, 6);

noStroke();
fill(0);
textAlign(LEFT, TOP);
text(txt, tx + padding, ty - th + 4);
pop();
}