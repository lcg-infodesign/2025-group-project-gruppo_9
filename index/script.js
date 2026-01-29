// --- DATI E TESTI ---
const introTextRaw =
  "Do we really know what “food waste” means?\n\n" +
  "We tend to think it begins in our kitchens, in the things we throw away. " +
  "But food starts disappearing long before it reaches us.";

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

// --- VARIABILI DI STATO ---
let typeTimer = null;
let timelineStep = 0;
let introStarted = false;
let introFinished = false;
let timelineActive = false;
let timelineFinished = false;
let outroReached = false;
let isMoving = false;
let blinkingSegment = null;

// --- DOM ---
const body = document.body;
const hintEl = document.getElementById("interactionHint");
const skipBtn = document.getElementById("skipBtn");
const introSec = document.getElementById("introSection");
const typeTextEl = document.getElementById("typewriterText");
const timelineSec = document.getElementById("timelineSection");
const outroSec = document.getElementById("outroSection");
const tutorialSec = document.getElementById("tutorialSection");
const tutorialBtn = document.getElementById("tutorialBtn");
const graphicsCol = document.getElementById("graphicsCol");
const textCol = document.getElementById("textCol");
const mainLine = document.getElementById("mainLine");

// --- HINT ---
function showHint() {
  hintEl.innerText = STANDARD_HINT;
  hintEl.classList.add("visible");
}
function forceHideHint() {
  body.classList.add("force-hide");
}
function unForceHideHint() {
  if (!outroReached) {
    body.classList.remove("force-hide");
    showHint();
  }
}

setTimeout(showHint, 2000);

// --- PROGRESS GENERALE ---
function handleProgress() {
  removeBlinkingSegment();
  if (isMoving) return;

  if (!introStarted) goToIntro();
  else if (introFinished && !timelineActive) goToTimeline();
  else if (timelineActive && !timelineFinished) addNextStep();
  else if (timelineFinished && !outroReached) goToOutro();
}

// CLICK GENERALE
document.addEventListener("click", (e) => {
  if (e.target.closest("#skipBtn") || e.target.closest(".explore-data-btn"))
    return;
  handleProgress();
});

// TASTIERA GENERALE
document.addEventListener("keydown", (e) => {
  if (e.key === " " || e.key === "ArrowRight" || e.key === "ArrowDown") {
    e.preventDefault(); 
    handleProgress(); 
  }
});

// --- NAVIGAZIONE SEZIONI ---
function goToIntro() {
  isMoving = true;
  introStarted = true;
  forceHideHint();
  introSec.classList.add("section-visible");
  body.style.overflowY = "auto";
  introSec.scrollIntoView({ behavior: "smooth" });

  setTimeout(() => {
    body.style.overflow = "hidden";
    isMoving = false;
    startTypewriter();
  }, 1000);
}

function goToTimeline() {
  isMoving = true;
  timelineActive = true;

  // nascondo solo durante lo scroll
  forceHideHint();

  timelineSec.classList.add("section-visible");
  body.style.overflowY = "auto";
  timelineSec.scrollIntoView({ behavior: "smooth" });

  setTimeout(() => {
    timelineSec.classList.add('active');
    isMoving = false;

    // MOSTRA HINT DURANTE LA FILIERA
    unForceHideHint();

    addNextStep();
  }, 1000);
}

function goToOutro() {
  isMoving = true;
  outroReached = true;
  forceHideHint();
  outroSec.classList.add("section-visible");
  body.style.overflowY = "auto";
  outroSec.scrollIntoView({ behavior: "smooth" });

  setTimeout(() => {
    outroSec.classList.add("visible");
    isMoving = false;
    if (tutorialBtn) tutorialBtn.style.display = "inline-block";
  }, 1000);
}

// --- TYPEWRITER ---
function startTypewriter() {
  skipBtn.classList.add("visible");
  let i = 0;
  typeTextEl.innerHTML = "";

  function type() {
    if (i < introTextRaw.length) {
      const char = introTextRaw.charAt(i);
      typeTextEl.innerHTML += char === "\n" ? "<br>" : char;
      i++;
      typeTimer = setTimeout(type, 25);
    } else finishIntro();
  }
  type();
}

function finishIntro() {
  introFinished = true;
  skipBtn.classList.remove("visible");
  unForceHideHint();
}

// --- TIMELINE ---
function addNextStep(instant = false) {
  if (timelineStep >= timelineData.length) return;

  const block = document.createElement("div");
  block.className = "text-block";
  block.innerHTML = timelineData[timelineStep];
  textCol.appendChild(block);

  const dot = document.createElement("div");
  dot.className = "dot";
  graphicsCol.appendChild(dot);

  const topPos = block.offsetTop;
  dot.style.top = topPos + 5 + "px";

  if (timelineStep < timelineData.length - 1)
    createBlinkingSegment(topPos);

  setTimeout(() => {
    block.classList.add("show");
    dot.classList.add("show");
    mainLine.style.height = topPos + 5 + "px";
    block.scrollIntoView({ behavior: "smooth", block: "center" });
  }, instant ? 0 : 50);

  timelineStep++;

  if (timelineStep >= timelineData.length) {
    timelineFinished = true;
    skipBtn.classList.remove("visible");
    removeBlinkingSegment();
    unForceHideHint();
  } else skipBtn.classList.add("visible");
}

// --- LINEA LAMPEGGIANTE ---
function removeBlinkingSegment() {
  if (blinkingSegment) {
    blinkingSegment.remove();
    blinkingSegment = null;
  }
}

function createBlinkingSegment(topPos) {
  removeBlinkingSegment();
  const seg = document.createElement("div");
  seg.className = "line-segment blinking";
  seg.style.top = topPos + 25 + "px";
  graphicsCol.appendChild(seg);
  blinkingSegment = seg;
}

// --- SKIP ---
skipBtn.addEventListener("click", (e) => {
  e.stopPropagation();

  if (introStarted && !introFinished) {
    clearTimeout(typeTimer);
    typeTextEl.innerHTML = introTextRaw.replace(/\n/g, "<br>");
    finishIntro();
  } else if (timelineActive && !timelineFinished) {
    while (timelineStep < timelineData.length) addNextStep(true);
    timelineFinished = true;
    skipBtn.classList.remove("visible");
    unForceHideHint();
  }
});

// --- TUTORIAL ---
const tutorialSteps = document.querySelectorAll(".tutorial-steps li");
const finishTutorialBtn = document.getElementById("finishTutorialBtn");
let currentStep = 0;

function showStep(index) {
  const total = tutorialSteps.length;
  
  const currentStepEl = document.getElementById('currentStep');
  const totalStepsEl = document.getElementById('totalSteps');
  const fill = document.querySelector('.tutorial-progress-fill');
  
  // 1. Selezioniamo la scritta "Click anywhere..."
  const hint = document.querySelector('.tutorial-hint');

  // Aggiorna numeri
  if(currentStepEl) currentStepEl.textContent = index + 1;
  if(totalStepsEl) totalStepsEl.textContent = total;

  // Mostra/Nascondi slide
  tutorialSteps.forEach((step, i) => {
    if (i === index) {
      step.style.display = "block";
      step.classList.add("active-step");
    } else {
      step.style.display = "none";
      step.classList.remove("active-step");
    }

    prevBtn.disabled = index === 0;
    nextBtn.disabled = index === tutorialSteps.length - 1;
  });

  // Aggiorna barra
  if (fill) {
    fill.style.width = ((index + 1) / total) * 100 + '%';
  }

  // --- CONTROLLO FINALE (Bottone vs Hint) ---
  if (index === total - 1) {
    // SIAMO ALLA FINE: Mostra bottone, NASCONDI scritta
    finishTutorialBtn.style.display = 'inline-block';
    if(hint) hint.style.display = 'none'; 
  } else {
    // NON SIAMO ALLA FINE: Nascondi bottone, MOSTRA scritta
    finishTutorialBtn.style.display = 'none';
    if(hint) hint.style.display = 'block'; 
  }
}

// NAVIGAZIONE AVANTI
function goTutorialNext() {
  if (currentStep < tutorialSteps.length - 1) {
    currentStep++;
    showStep(currentStep);
  }
}

// NAVIGAZIONE INDIETRO
function goTutorialPrev() {
  if (currentStep > 0) {
    currentStep--;
    showStep(currentStep);
  }
}

const nextBtn = document.querySelector('.nav-btn.next');
const prevBtn = document.querySelector('.nav-btn.prev');

nextBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  goTutorialNext();
});

prevBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  goTutorialPrev();
});

// RESET (Quando apri il tutorial)
function resetTutorial() {
  currentStep = 0;
  showStep(currentStep);
}

// CLICK SUL TUTORIAL (Per avanzare cliccando ovunque tranne sul bottone finale)
//tutorialSec.addEventListener("click", (e) => {
 // if (e.target.closest("#finishTutorialBtn")) return;
  //goTutorialNext();
//});

// TASTIERA SOLO PER IL TUTORIAL
document.addEventListener("keydown", (e) => {
  // Se il tutorial non è visibile, non fare nulla
  if (!tutorialSec.classList.contains("visible")) return;

  const nextKeys = [" ", "ArrowRight", "ArrowDown"];
  const prevKeys = ["ArrowLeft", "ArrowUp"];

  if (nextKeys.includes(e.key)) {
    e.preventDefault();
    goTutorialNext();
  }
  if (prevKeys.includes(e.key)) {
    e.preventDefault();
    goTutorialPrev();
  }
});

// APERTURA TUTORIAL DAL BOTTONE "?"
tutorialBtn?.addEventListener("click", (e) => {
  e.stopPropagation();
  tutorialSec.classList.add("section-visible");
  tutorialSec.scrollIntoView({ behavior: "smooth" });
  setTimeout(() => {
    tutorialSec.classList.add("visible");
    resetTutorial(); // Usa la funzione reset semplificata
  }, 300);
});