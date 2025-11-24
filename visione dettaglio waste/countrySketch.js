// sketch.js - full implementation described

// --- globals
let table;
let data = [];
let countries = [];
let selectedCountry = "";
let selectedYear = 2024;

let items = []; // commodity items to draw (with x,y,size,commodity,loss)
let basketImg = null;
let commodityImgs = {}; // mapping: normalized filename -> p5.Image

// paths (change if you prefer different folders)
const ASSETS_BASE = "assets/";
const BASKET_FILE = ASSETS_BASE + "basket.png";
const BOTTOM_BIN_FILE = ASSETS_BASE + "empty.basket.png";

// normalize function (only used for filename lookup attempts)
function normalizeFilename(name) {
  return name.toLowerCase().trim().replace(/\s+/g, "_").replace(/[àáâä]/g,"a")
    .replace(/[èéêë]/g,"e").replace(/[ìíîï]/g,"i").replace(/[òóôö]/g,"o")
    .replace(/[ùúûü]/g,"u").replace(/[^a-z0-9_\-]/g,"");
}

// --- preload (safe: logs missing images but doesn't block)
function preload() {
  table = loadTable("cleaned_dataset.csv", "csv", "header", () => {
    console.log("CSV loaded, rows:", table.getRowCount());
  }, (err) => {
    console.error("Failed to load cleaned_dataset.csv", err);
  });

  // basket main image
  basketImg = loadImage(BASKET_FILE,
    () => console.log("Loaded basket:", BASKET_FILE),
    () => console.warn("Missing basket image:", BASKET_FILE)
  );

  // We'll build the set of commodity filenames based on dataset values (safer)
  // but also attempt a small predefined list to show common ones quickly.
  const preset = [
    "carne","cereali","frutta","frutta_secca","funghi","latticini",
    "legumi","miele","ortaggi","prodotti_cereali","semi_oleosi",
    "spezie","tuberi","uova","vino","zucchero"
  ];
  // preload preset files (will warn if missing)
  for (let p of preset) {
    let path = ASSETS_BASE + p + ".png";
    commodityImgs[p] = loadImage(path,
      () => console.log("Loaded commodity (preset):", path),
      () => console.warn("Missing commodity (preset):", path)
    );
  }
}

// --- setup
function setup() {
  const cnv = createCanvas(windowWidth, 600);
  cnv.parent("canvasContainer");

  // parse CSV into data[] after a tiny delay to ensure preload processed
  // (loadTable loads before setup normally, but we still parse safely)
  if (!table) {
    console.error("CSV table not available in setup()");
  } else {
    loadData();            // fills data[] and countries[]
    setupCountrySelect();  // builds select DOM
    setupTimeline();       // builds slider and ticks
    // initial selection
    if (countries.length) selectedCountry = countries[0];
    updateVisualization();
  }
  noStroke();
  textFont('Inter, Arial, sans-serif');
}

// --- draw loop
function draw() {
  background(245);

  // draw main basket (lowered a bit to leave spawn area for falling items)
  drawBasketCentered();

  // draw commodity images in the conic sector above basket
  drawItems();

  // draw tooltip DOM
  drawTooltip();
}

// ---------------- DATA LOADING ----------------
function loadData() {
  data = [];
  for (let r = 0; r < table.getRowCount(); r++) {
    const row = table.getRow(r);
    const country = row.getString("country");
    const commodity = row.getString("commodity");
    const year = int(row.getString("year"));
    const lossRaw = row.getString("loss_percentage");
    const loss = parseFloat(String(lossRaw).replace(",", "."));

    if (!country || !commodity || isNaN(year) || isNaN(loss)) continue;

    data.push({ country, commodity, year, loss });
    if (!countries.includes(country)) countries.push(country);
  }
  countries.sort();
  // ensure years slider range covers min/max found (optional)
  const years = [...new Set(data.map(d=>d.year))].sort((a,b)=>a-b);
  if (years.length) {
    const s = document.getElementById("yearSlider");
    if (s) { s.min = Math.min(...years); s.max = Math.max(...years); s.value = s.max; selectedYear = +s.value; document.getElementById('yearLabel').innerText = selectedYear; }
  }
}

// ---------------- UI wiring ----------------
function setupCountrySelect() {
  const sel = document.getElementById("countrySelect");
  sel.innerHTML = "";
  for (let c of countries) {
    const opt = document.createElement("option");
    opt.value = c;
    opt.text = c;
    sel.appendChild(opt);
  }
  sel.addEventListener("change", () => {
    selectedCountry = sel.value;
    updateVisualization();
  });
  // set initial if empty
  if (countries.length) {
    selectedCountry = countries[0];
    sel.value = selectedCountry;
  }
}

function setupTimeline() {
  const slider = document.getElementById("yearSlider");
  const marks = document.getElementById("yearMarks");
  marks.innerHTML = "";

  // ensure slider matches data range (if set in loadData)
  // create ticks for each year between min and max
  const minY = parseInt(slider.min);
  const maxY = parseInt(slider.max);
  const total = Math.max(1, maxY - minY + 1);

  // we'll create a tick element for each year, and decade labels under them
  for (let y = minY; y <= maxY; y++) {
    const tick = document.createElement("div");
    tick.className = "yearTick";
    tick.style.display = "inline-block";
    tick.style.width = (100/ (total)) + "%";
    tick.style.verticalAlign = "top";
    tick.style.textAlign = "center";
    // make the tick clickable: set slider and update
    tick.addEventListener("click", ((yy)=>() => {
      slider.value = yy;
      document.getElementById('yearLabel').innerText = yy;
      selectedYear = yy;
      updateVisualization();
    })(y));
    // create small line + label if decade
    const inner = document.createElement("div");
    inner.style.height = "12px";
    inner.style.margin = "0 auto";
    inner.style.width = "2px";
    inner.style.background = "#666";
    tick.appendChild(inner);

    // label only for decades
    if (y % 10 === 0) {
      const lbl = document.createElement("div");
      lbl.className = "yearLabel";
      lbl.innerText = y;
      lbl.style.marginTop = "6px";
      tick.appendChild(lbl);
    }
    marks.appendChild(tick);
  }

  // slider change event
  slider.addEventListener("input", (e) => {
    selectedYear = parseInt(e.target.value);
    document.getElementById('yearLabel').innerText = selectedYear;
    updateVisualization();
  });

  // initial label
  document.getElementById('yearLabel').innerText = slider.value;
  selectedYear = parseInt(slider.value);
}

// ---------------- Visualization update ----------------
function updateVisualization() {
  // update title
  document.getElementById('title').innerText = selectedCountry + " — " + selectedYear;

  // filter data for selection
  const filtered = data.filter(d => d.country === selectedCountry && d.year === selectedYear);

  // compute positions in a conic sector above the basket
  items = [];
  if (filtered.length === 0) {
    createBottomBins([]);
    return;
  }

  // sector angles (radians) — narrow sector above basket
  // pick sector centred at PI/2 (up) with span ~ 110 degrees
  const spanDeg = 150;
  const centerAngle = -PI/2; // up (canvas y increases downward)
  const startAngle = centerAngle - radians(spanDeg/3);
  const endAngle   = centerAngle + radians(spanDeg/3);

  // spawn radius above basket
  const centerX = width/2;
  const basketY = height/2.3; // we draw basket lower than center
  const spawnRadius = Math.min(260, height*0.28);

  for (let i = 0; i < filtered.length; i++) {
    const d = filtered[i];
    // distribute angle evenly across sector
    const ang = map(i, 0, Math.max(1, filtered.length-1), startAngle, endAngle);

    // distance from center slightly randomized so items don't overlap exactly
    const extra = map(i % 3, 0, 2, -24, 24);
    const rx = spawnRadius + extra;

    // size scaled by loss% (tunable)
    const size = map(d.loss, 0, 20, 16, 70);

    const x = centerX + cos(ang) * rx;
    const y = basketY + sin(ang) * rx * 0.55; // lower the spawning so items sit above basket

    // find an image for this commodity:
    const norm = normalizeFilename(d.commodity);
    let img = commodityImgs[norm];
    // fallback attempt: maybe commodity name as-is (lowercase)
    if (!img) img = commodityImgs[d.commodity.toLowerCase()];
    // store item
    items.push({commodity: d.commodity, loss: d.loss, x, y, size, img});
  }

  // create bottom bins (centered)
  createBottomBins(filtered);
}

// ---------------- draw basket ----------------
function drawBasketCentered() {
  // draw a faint shadow under basket
  push();
  noStroke();
  fill(0,20);
  ellipse(width/2, height/1.5 + 140, 360, 46);
  pop();

  if (basketImg && basketImg.width) {
    push();
    imageMode(CENTER);
    
    const w = min(260, width*0.22);   
    const h = w * (basketImg.height / basketImg.width);
    image(basketImg, width/2, height/2.5 + 160, w, h);
    pop();
  } else {
    // fallback simple shape
    push();
    fill(200);
    noStroke();
    ellipse(width/2, height/2 + 120, 280, 220);
    pop();
  }
}

// ---------------- draw items (images or fallback circles) ----------------
function drawItems() {
  for (let it of items) {
    push();
    imageMode(CENTER);
    if (it.img && it.img.width) {
      // maintain proportions: scale factor based on desired "size" relative to img width
      const scale = it.size / it.img.width;
      image(it.img, it.x, it.y, it.img.width * scale, it.img.height * scale);
    } else {
      // fallback: colored circle (color derived from commodity)
      colorMode(RGB);
      const seed = (it.commodity.length * 37) % 255;
      fill((seed*1.1)%255, (seed*0.6)%255, (seed*0.3)%255, 220);
      noStroke();
      ellipse(it.x, it.y, it.size);
    }
    pop();
  }
}

// ---------------- bottom bins: centered, with background image and fill ----------------
function createBottomBins(list) {
  const container = document.getElementById("bottomScroll");
  container.innerHTML = "";
  // central alignment: we use flexbox centering (CSS) so append elements will be centered automatically
  for (let item of list) {
    const wrap = document.createElement("div");
    wrap.className = "bottomBinWrapper";

    const box = document.createElement("div");
    box.className = "bottomBin";
    // set background image to the bottom bin PNG
    box.style.backgroundImage = `url('${BOTTOM_BIN_FILE}')`;

    // create fill div that grows upward; compute height percentage
    const fill = document.createElement("div");
    fill.className = "bottomFill";
    // map loss to percent of bin height (tweak factor if desired)
    const pct = Math.min(100, Math.max(0, item.loss * 2));
    fill.style.height = pct + "%";

    const label = document.createElement("div");
    label.className = "bottomLabel";
    label.textContent = `${item.commodity} (${nf(item.loss,0,1)}%)`;

    box.appendChild(fill);
    wrap.appendChild(box);
    wrap.appendChild(label);
    container.appendChild(wrap);
  }
}

// ---------------- tooltip DOM ----------------
let hoveredItem = null;
function drawTooltip() {
  hoveredItem = null;
  // point-in-rect using circle radius (size) for simplicity; could do pixel-perfect later
  for (let it of items) {
    if (dist(mouseX, mouseY, it.x, it.y) < it.size*0.5) {
      hoveredItem = it;
      break;
    }
  }
  const tip = document.getElementById("tooltip");
  if (hoveredItem) {
    tip.style.display = "block";
    tip.style.left = Math.min(window.innerWidth - 200, mouseX + 12) + "px";
    tip.style.top = Math.max(8, mouseY + 12) + "px";
    tip.innerHTML = `<strong>${hoveredItem.commodity}</strong><br>${nf(hoveredItem.loss,0,1)}%`;
  } else {
    tip.style.display = "none";
  }
}

// ---------------- window resize ----------------
function windowResized() {
  resizeCanvas(windowWidth, 600);
  updateVisualization();
}
