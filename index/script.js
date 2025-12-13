// --- DATI E TESTI ---
// Il testo che verrà "digitato" nella seconda schermata
const introTextRaw = "Do we really know what “food waste” means?\n\n" +
   "We tend to think it begins in our kitchens, in the things we throw away. " +
   "But food starts disappearing long before it reaches us.";

// I punti della timeline che appariranno uno alla volta
const timelineData = [
  "It disappears in the <strong>soil</strong> during growing, when plants get ruined by bad weather, insects, or poor conditions;",
  "during the <strong>harvest</strong>, when some fruits and vegetables are left behind;",
  "in the <strong>farm storage</strong>, if food is left there for too long;",
  "along the <strong>transport</strong>, where heat or humidity can damage the products.",
  "It can get lost at the <strong>wholesale level</strong>, where large buyers may reject or fail to sell entire batches;",
  "or during <strong>distribution</strong>, while packing or grading, when food can get thrown away just because it looks “imperfect”;",
  "it can vanish in <strong>sales</strong>, during stocking, or when anything unsold at the end of the day goes to waste;",
  "and even inside <strong>households or restaurants</strong>, before meals are ever made."
];

const STANDARD_HINT = "CLICK ANYWHERE TO CONTINUE";

// --- VARIABILI DI STATO (Flag) ---
// Servono a capire in che punto della storia si trova l'utente
let typeTimer = null;
let timelineStep = 0; // Indice del punto della timeline attuale (0, 1, 2...)

let introStarted = false;   // L'animazione scrittura è iniziata?
let introFinished = false;  // L'animazione scrittura è finita?
let timelineActive = false; // Siamo entrati nella sezione timeline?
let timelineFinished = false; // Abbiamo mostrato tutti i punti?
let outroReached = false;   // Siamo arrivati alla fine?

// --- SELEZIONE ELEMENTI DOM ---
const body = document.body;
const hintEl = document.getElementById('interactionHint');
const skipBtn = document.getElementById('skipBtn');

const introSec = document.getElementById('introSection');
const typeTextEl = document.getElementById('typewriterText');
const timelineSec = document.getElementById('timelineSection');
const outroSec = document.getElementById('outroSection');

const graphicsCol = document.getElementById('graphicsCol');
const textCol = document.getElementById('textCol');
const mainLine = document.getElementById('mainLine');

// --- FUNZIONI UTILITY PER I SUGGERIMENTI ---
function showHint() {
  hintEl.innerText = STANDARD_HINT;
  hintEl.classList.add('visible');
}

function forceHideHint() {
  body.classList.add('force-hide');
}

function unForceHideHint() {
  if (!outroReached) {
    body.classList.remove('force-hide');
    showHint(); 
  }
}

// Mostra il primo suggerimento dopo 2 secondi dall'apertura
setTimeout(() => {
  showHint();
}, 2000);

// --- GESTORE GENERALE DEL CLICK (Il "Motore" della pagina) ---
document.addEventListener('click', (e) => {
  // Se clicco sul tasto Skip o sul bottone finale, non faccio avanzare la storia
  if (e.target.closest('#skipBtn') || e.target.closest('.explore-data-btn')) return;

  // 1. Se l'intro non è iniziata -> Vai all'intro
  if (!introStarted) {
    goToIntro();
    return;
  }

  // 2. Se l'intro è finita ma la timeline non è attiva -> Vai alla timeline
  if (introStarted && introFinished && !timelineActive) {
    goToTimeline();
    return;
  }

  // 3. Se siamo nella timeline -> Aggiungi prossimo punto o vai alla fine
  if (timelineActive) {
    if (!timelineFinished) {
      addNextStep(); // Aggiungi un punto
    } else {
      goToOutro();   // Timeline finita, vai all'outro
    }
  }
});

// --- FUNZIONI DI NAVIGAZIONE ---

function goToIntro() {
  introSec.scrollIntoView({ behavior: 'smooth' });
  // L'observer (sotto) farà partire la macchina da scrivere quando arriva
}

function goToTimeline() {
  timelineActive = true;
  timelineSec.classList.add('active'); // Rende la sezione opaca
  timelineSec.scrollIntoView({ behavior: 'smooth' });
  // Aspetta mezzo secondo e aggiunge il primo punto
  setTimeout(() => { addNextStep(); }, 500);
}

function goToOutro() {
  outroReached = true;
  forceHideHint(); // Nascondi suggerimenti per sempre
  outroSec.classList.add('visible');
  outroSec.scrollIntoView({ behavior: 'smooth' });
}

// --- INTERSECTION OBSERVER ---
// Rileva quando l'utente scrolla sulla sezione Intro per far partire la scrittura
const introObserver = new IntersectionObserver((entries) => {
  if (entries[0].isIntersecting && !introStarted) {
    introStarted = true;
    startTypewriter();
  }
}, { threshold: 0.5 });
introObserver.observe(introSec);

// --- EFFETTO MACCHINA DA SCRIVERE ---
function startTypewriter() {
  forceHideHint(); // Nascondi "Click to continue" mentre scrive
  skipBtn.classList.add('visible'); // Mostra il tasto Skip

  let i = 0;
  typeTextEl.innerHTML = "";

  function type() {
    if (i < introTextRaw.length) {
      let char = introTextRaw.charAt(i);
      if (char === '\n') char = '<br>'; // Gestisce a capo
      typeTextEl.innerHTML += char;
      i++;
      // Richiama se stessa con un tempo casuale (effetto umano)
      typeTimer = setTimeout(type, Math.random() * 30 + 30);
    } else {
      // Scrittura Finita
      introFinished = true;
      skipBtn.classList.remove('visible');
      unForceHideHint(); // Riappare il suggerimento per cliccare
    }
  }
  type();
}


// --- AGGIUNTA PUNTI TIMELINE ---
function addNextStep(instant = false) {
  // Se abbiamo finito i dati, segna come finita e ferma
  if (timelineStep >= timelineData.length) {
    timelineFinished = true;
    skipBtn.classList.remove('visible');
    return;
  }

  skipBtn.classList.add('visible');

  // Crea il blocco di testo (Div + HTML)
  const block = document.createElement('div');
  block.classList.add('text-block');
  block.innerHTML = timelineData[timelineStep];
  textCol.appendChild(block);

  // Crea il pallino grafico
  const dot = document.createElement('div');
  dot.classList.add('dot');
  graphicsCol.appendChild(dot);

  // Calcola dove posizionare il pallino (allineato al testo)
  const topPos = block.offsetTop;
  dot.style.top = (topPos + 5) + 'px';

  // Se "instant" è true (Skip premuto), togli le animazioni
  if (instant) {
    block.style.transition = 'none';
    dot.style.transition = 'none';
    mainLine.style.transition = 'none';
    block.classList.add('show');
    dot.classList.add('show');
  } else {
    // Animazione standard
    requestAnimationFrame(() => {
      block.classList.add('show');
      dot.classList.add('show');
    });
  }

  // Allunga la linea verticale fino al nuovo punto
  if (timelineStep > 0 || instant) {
    mainLine.style.height = (topPos + 5) + 'px';
  }

  timelineStep++;

  // Auto-scroll leggero verso il basso se non stiamo skippando
  if (!instant && timelineStep > 3) {
    window.scrollBy({ top: 100, behavior: 'smooth' });
  }

  // Controllo finale se abbiamo finito
  if (timelineStep >= timelineData.length) {
    timelineFinished = true;
    skipBtn.classList.remove('visible');
  }
}

// --- LOGICA TASTO SKIP ---
skipBtn.addEventListener('click', () => {
  if (introStarted && !introFinished) {
    // 1. Skip Intro: Finisce subito di scrivere
    clearTimeout(typeTimer);
    typeTextEl.innerHTML = introTextRaw.replace(/\n/g, '<br>');
    introFinished = true;
    skipBtn.classList.remove('visible');
    unForceHideHint();
  } else if (timelineActive && !timelineFinished) {
    // 2. Skip Timeline: Aggiunge tutti i punti restanti in un colpo solo
    while (timelineStep < timelineData.length) {
      addNextStep(true); // true = modalità istantanea
    }
    timelineFinished = true;
    skipBtn.classList.remove('visible');
  }
});