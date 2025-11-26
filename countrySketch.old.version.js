// countrySketch.js (versione aggiornata: sfondo su body, canvas trasparente, decadi timeline, keyboard, mask fills)

// --- globals
let table;
let data = [];
let countries = [];
let selectedCountry = "";
let selectedYear = 2024;

let items = []; // commodity items to draw (with x,y,size,commodity,loss)
let basketImg = null;
let commodityImgs = {}; // mapping normalized -> p5.Image
let emptyBinImg = null; // empty.basket.png used for mask

// paths (first try assets, then fallback to uploaded local path)
const ASSETS_BASE = "assets/";
const BASKET_FILE_ASSET = ASSETS_BASE + "basket.png";
const BOTTOM_BIN_FILE_ASSET = ASSETS_BASE + "empty.basket.png";
// fallback paths (uploaded to session)
const BASKET_FILE_FALLBACK = "/mnt/data/basket.png";            // if you used different name, asset path used first
const BOTTOM_BIN_FILE_FALLBACK = "/mnt/data/empty.basket.png";
const BACKGROUND_FILE = "assets/sfondo.png";
const BACKGROUND_FILE_FALLBACK = "/mnt/data/sfondo.png";

// normalize function for filenames
function normalizeFilename(name) {
  return name.toLowerCase().trim().replace(/\s+/g, "_").replace(/[àáâä]/g,"a")
    .replace(/[èéêë]/g,"e").replace(/[ìíîï]/g,"i").replace(/[òóôö]/g,"o")
    .replace(/[ùúûü]/g,"u").replace(/[^a-z0-9_\-]/g,"");
}

// --- preload (safe: logs missing images but doesn't block)
function preload() {
  table = loadTable("cleaned_dataset.csv", "csv", "header",
    () => console.log("CSV loaded, rows:", table.getRowCount()),
    (err) => console.error("Failed to load cleaned_dataset.csv", err)
  );

  // load basket: prefer asset path then fallback
  loadImageSafe(BASKET_FILE_ASSET, BASKET_FILE_FALLBACK, (img) => { basketImg = img; });

  // load empty bin img (for masking bottom fills)
  loadImageSafe(BOTTOM_BIN_FILE_ASSET, BOTTOM_BIN_FILE_FALLBACK, (img) => { emptyBinImg = img; });

  // attempt to preload a set of common commodity images (non-blocking)
  const preset = [
    "carne","cereali","frutta","frutta_secca","funghi","latticini",
    "legumi","miele","ortaggi","prodotti_cereali","semi_oleosi",
    "spezie","tuberi","uova","vino","zucchero"
  ];
  for (let p of preset) {
    // try asset path, non-blocking
    loadImageSafe(ASSETS_BASE + p + ".png", null, (img) => { if (img) commodityImgs[p] = img; });
  }
}

// helper: try to load primary path, on error try fallbackPath, then callback(img or null)
function loadImageSafe(primary, fallback, cb) {
  if (!primary) { if (fallback) loadImageSafe(fallback, null, cb); else cb && cb(null); return; }
  loadImage(primary,
    (img) => { console.log("Loaded image:", primary); cb && cb(img); },
    (err) => {
      if (fallback) {
        loadImage(fallback,
          (img2) => { console.log("Loaded fallback image:", fallback); cb && cb(img2); },
          () => { console.warn("Missing image both:", primary, fallback); cb && cb(null); }
        );
      } else {
        console.warn("Missing image:", primary);
        cb && cb(null);
      }
    }
  );
}

// --- setup
function setup() {
  // create canvas transparent
  const cnv = createCanvas(windowWidth, 600);
  cnv.parent("canvasContainer");
  // ensure canvas is transparent (also CSS has canvas background transparent)
  clear();

  if (!table) {
    console.error("CSV table not available in setup()");
  } else {
    loadData();
    setupCountrySelect();
    setupTimeline();
    if (countries.length) selectedCountry = countries[0];
    updateVisualization();
  }

  noStroke();
  textFont('Inter, Arial, sans-serif');
}

// --- draw loop
function draw() {
  // do not use background() to maintain page background image; just clear alpha
  clear();

  // draw main basket (lowered a bit to leave spawn area for falling items)
  drawBasketCentered();

  // draw commodity images in the conic sector above basket
  drawItems();

  // tooltip DOM handled separately
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
  // set slider range based on found years (if slider exists)
  const years = [...new Set(data.map(d => d.year))].sort((a,b)=>a-b);
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
  if (countries.length) {
    selectedCountry = countries[0];
    sel.value = selectedCountry;
  }
}

function setupTimeline() {
  const slider = document.getElementById("yearSlider");
  const marks = document.getElementById("yearMarks");
  marks.innerHTML = "";

  // compute min/max
  const minY = parseInt(slider.min);
  const maxY = parseInt(slider.max);

  // only show decade labels (very close to slider)
  const firstDecade = Math.ceil(minY/10)*10;
  const lastDecade = Math.floor(maxY/10)*10;
  const decades = [];
  for (let y = firstDecade; y <= lastDecade; y += 10) decades.push(y);

  // create labels positioned evenly in the marks container
  // we fill marks with flexible spans to keep them aligned
  const totalSlots = decades.length;
  for (let i=0;i<totalSlots;i++){
    const lbl = document.createElement("div");
    lbl.className = "decadeLabel";
    lbl.innerText = decades[i];
    // click to set year to decade
    lbl.addEventListener("click", (() => {
      const yy = decades[i];
      return () => { slider.value = yy; document.getElementById('yearLabel').innerText = yy; selectedYear = yy; updateVisualization(); };
    })());
    marks.appendChild(lbl);
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

// keyboard control for timeline
function keyPressed() {
  // left/right arrows adjust year by 1
  const slider = document.getElementById("yearSlider");
  if (!slider) return;
  const minY = parseInt(slider.min);
  const maxY = parseInt(slider.max);

  if (keyCode === LEFT_ARROW) {
    selectedYear = Math.max(minY, selectedYear - 1);
    slider.value = selectedYear;
    document.getElementById('yearLabel').innerText = selectedYear;
    updateVisualization();
  } else if (keyCode === RIGHT_ARROW) {
    selectedYear = Math.min(maxY, selectedYear + 1);
    slider.value = selectedYear;
    document.getElementById('yearLabel').innerText = selectedYear;
    updateVisualization();
  }
}

// ---------------- Visualization update ----------------
function updateVisualization() {
  document.getElementById('title').innerText = selectedCountry + "  " + selectedYear;

  const filtered = data.filter(d => d.country === selectedCountry && d.year === selectedYear);

  items = [];
  if (filtered.length === 0) {
    createBottomBins([]);
    return;
  }

  // conic sector above basket
  const spanDeg = 110;
  const centerAngle = -PI/2;
  const startAngle = centerAngle - radians(spanDeg/2);
  const endAngle = centerAngle + radians(spanDeg/2);

  const centerX = width/2;
  const basketY = height/2.5 ; // basket drawn lower, spawn above
  const spawnRadius = Math.min(260, height*0.26);

  for (let i = 0; i < filtered.length; i++) {
    const d = filtered[i];
    const ang = map(i, 0, Math.max(1, filtered.length-1), startAngle, endAngle);
    const extra = map(i % 3, 0, 2, -18, 18);
    const rx = spawnRadius + extra;
    const size = map(d.loss, 0, 20, 18, 70);
    const x = centerX + cos(ang) * rx;
    const y = basketY + sin(ang) * rx * 0.5;
    const norm = normalizeFilename(d.commodity);
    let img = commodityImgs[norm];
    if (!img) img = commodityImgs[d.commodity.toLowerCase()];
    items.push({commodity: d.commodity, loss: d.loss, x, y, size, img});
  }

  createBottomBins(filtered);
}

// ---------------- draw basket ----------------
function drawBasketCentered() {
  // faint shadow
  push();
  noStroke();
  fill(0,20);
  ellipse(width/2, height/2 +255, 320, 46);
  pop();

  if (basketImg && basketImg.width) {
    push();
    imageMode(CENTER);
    const w = min(260, width*0.22);
    const h = w * (basketImg.height / basketImg.width);
    image(basketImg, width/2, height/2 + 120, w, h);
    pop();
  } else {
    push();
    fill(200);
    noStroke();
    ellipse(width/2, height/2 + 120, 220, 180);
    pop();
  }
}

// ---------------- draw items (images or fallback circles) ----------------
function drawItems() {
  for (let it of items) {
    push();
    imageMode(CENTER);
    if (it.img && it.img.width) {
      const scale = it.size / it.img.width;
      image(it.img, it.x, it.y, it.img.width * scale, it.img.height * scale);
    } else {
      colorMode(RGB);
      const seed = (it.commodity.length * 37) % 255;
      fill((seed*1.1)%255, (seed*0.6)%255, (seed*0.3)%255, 220);
      noStroke();
      ellipse(it.x, it.y, it.size);
    }
    pop();
  }
}

// ---------------- bottom bins: centered, with background image and masked fill ----------------
async function createBottomBins(list) {
  const container = document.getElementById("bottomScroll");
  container.innerHTML = "";

  // early exit if no empty bin image: fallback simple boxes
  const hasEmptyBinImg = !!emptyBinImg && emptyBinImg.width > 0;

  for (let item of list) {
    const wrap = document.createElement("div");
    wrap.className = "bottomBinWrapper";

    const box = document.createElement("div");
    box.className = "bottomBin";
    // set background image (prefer asset path then fallback)
    let bgPath = BOTTOM_BIN_FILE_ASSET;
    // no guarantee asset exists — we still set it (browser will ignore missing)
    box.style.backgroundImage = `url('${bgPath}')`;

    // create fill element (we'll set background via dataURL if we can mask)
    const fillDiv = document.createElement("div");
    fillDiv.className = "bottomFill";
    // initial zero height
    fillDiv.style.height = "0px";

    const label = document.createElement("div");
    label.className = "bottomLabel";
    label.textContent = `${item.commodity} (${nf(item.loss,0,1)}%)`;

    box.appendChild(fillDiv);
    wrap.appendChild(box);
    wrap.appendChild(label);
    container.appendChild(wrap);

    // Now compute internal area based on box computed size and emptyBinImg natural size
    // Wait a frame to ensure CSS applied; use setTimeout 0
    await new Promise(r => setTimeout(r, 0));
    const br = box.getBoundingClientRect();
    const boxW = Math.max(10, Math.round(br.width));
    const boxH = Math.max(10, Math.round(br.height));

    if (hasEmptyBinImg) {
      // scale the emptyBinImg to fit the box size while preserving aspect for mask creation
      const scale = Math.min(boxW / emptyBinImg.width, boxH / emptyBinImg.height);
      const imgW = Math.round(emptyBinImg.width * scale);
      const imgH = Math.round(emptyBinImg.height * scale);

      // compute inner area (the visible empty area inside the PNG) approximation:
      // We'll use the whole image as mask but the visible fill region will be the transparent interior.
      // create a graphics 'fillCanvas' and mask it using inverted alpha of emptyBinImg
      const fillCanvas = createGraphics(imgW, imgH);
      fillCanvas.pixelDensity(1);
      fillCanvas.clear();
      // compute fill height in pixels proportional to item.loss
      

      // draw solid color rectangle (from bottom)
      fillCanvas.noStroke();
      // color choice: gradient-ish via simple solid for now
      const c = color(220, 60, 90, 220);
      fillCanvas.fill(red(c), green(c), blue(c), alpha(c));
      fillCanvas.rect(0, imgH - fillPx, imgW, fillPx);

      // create mask image by copying emptyBinImg and inverting its alpha channel
      // copy emptyBinImg into a temporary image scaled to imgW x imgH
      const maskImg = createImage(imgW, imgH);
      maskImg.copy(emptyBinImg, 0, 0, emptyBinImg.width, emptyBinImg.height, 0, 0, imgW, imgH);
      maskImg.loadPixels();
      for (let i = 0; i < maskImg.pixels.length; i += 4) {
        const a = maskImg.pixels[i+3];        // alpha
        // invert alpha: transparent interior (a=0) -> becomes 255, outer parts (a>0) -> lower
        const inv = 255 - a;
        // write luminance into mask alpha channel (p5 mask uses the brightness/alpha of mask)
        // we'll set all channels to inv and alpha to inv
        maskImg.pixels[i] = inv;
        maskImg.pixels[i+1] = inv;
        maskImg.pixels[i+2] = inv;
        maskImg.pixels[i+3] = inv;
      }
      maskImg.updatePixels();

      // get the 'fillCanvas' image to mask
      const fillImg = fillCanvas.get();
      // apply mask (this modifies fillImg)
      fillImg.mask(maskImg);

      // convert masked result to data URL
      // get underlying canvas of fillCanvas (p5 Graphics)
      const dataURL = fillCanvas.elt.toDataURL("image/png");
      // set as background of fillDiv and size/position to match
      fillDiv.style.backgroundImage = `url(${dataURL})`;
      fillDiv.style.backgroundSize = `${imgW}px ${imgH}px`;
      fillDiv.style.backgroundRepeat = "no-repeat";
      fillDiv.style.backgroundPosition = "center bottom";
      // set height in px equal to imgH*fillPct — because masked image will show only that portion
      // but since we use background positioned bottom we set fillDiv height to fillPx and align bottom

      // position fillDiv absolutely relative to box

      // misure interne dichiarate (lo spazio vuoto dentro il cestino)
const innerW = 76;  
const innerH = 98;

// percentuale del riempimento
const fillPct = Math.max(0, Math.min(1, item.loss / 100));
const fillPx = Math.round(innerH * fillPct);

// centratura perfetta dentro il cestino
fillDiv.style.position = "absolute";
fillDiv.style.width = innerW + "px";
fillDiv.style.height = fillPx + "px";

// centratura orizzontale
fillDiv.style.left = Math.round((box.clientWidth - innerW) / 2) + "px";







      
      fillDiv.style.pointerEvents = "none";
    } else {
      // fallback: no mask possible - simple colored fill anchored bottom with percentage of box height
      const pct = Math.min(100, Math.max(0, item.loss));
      const fillPx = Math.round((boxH) * (pct/100));
      fillDiv.style.height = fillPx + "px";
      fillDiv.style.position = "absolute";
      fillDiv.style.left = "0";
      fillDiv.style.right = "0";
      fillDiv.style.bottom = "12px";
      fillDiv.style.background = "linear-gradient(180deg, rgba(220,65,90,0.95), rgba(200,40,80,0.95))";
      fillDiv.style.borderRadius = "4px";
      fillDiv.style.pointerEvents = "none";
    }
  }
}

// ---------------- tooltip DOM ----------------
let hoveredItem = null;
function drawTooltip() {
  hoveredItem = null;
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
