// --- DATI E TESTI ---
const introTextRaw = "Do we really know what “food waste” means?\n\n" +
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

// --- SELEZIONE ELEMENTI DOM ---
const body = document.body;
const hintEl = document.getElementById('interactionHint');
const skipBtn = document.getElementById('skipBtn');
const introSec = document.getElementById('introSection');
const typeTextEl = document.getElementById('typewriterText');
const timelineSec = document.getElementById('timelineSection');
const outroSec = document.getElementById('outroSection');
const tutorialSec = document.getElementById('tutorialSection');
const tutorialBtn = document.getElementById('tutorialBtn');
const graphicsCol = document.getElementById('graphicsCol');
const textCol = document.getElementById('textCol');
const mainLine = document.getElementById('mainLine');

// --- FUNZIONI UTILITY SUGGERIMENTI ---
function showHint() {
  hintEl.innerText = STANDARD_HINT;
  hintEl.classList.add('visible');
}
function forceHideHint() { body.classList.add('force-hide'); }
function unForceHideHint() { if (!outroReached) { body.classList.remove('force-hide'); showHint(); } }

// Suggerimento iniziale dopo 2 secondi
setTimeout(() => { showHint(); }, 2000);

// --- GESTORE DEGLI INPUT (Mouse + Tastiera) ---
function handleProgress() {
  if (isMoving) return;

  if (!introStarted) {
    goToIntro();
  } else if (introFinished && !timelineActive) {
    goToTimeline();
  } else if (timelineActive && !timelineFinished) {
    addNextStep(); 
  } else if (timelineFinished && !outroReached) {
    goToOutro();
  }
}

// Click Mouse
document.addEventListener('click', (e) => {
  if (e.target.closest('#skipBtn') || e.target.closest('.explore-data-btn')) return;
  handleProgress();
});

// Tastiera (Barra Spaziatrice e Freccia Destra)
document.addEventListener('keydown', (e) => {
  if (e.key === ' ' || e.key === 'ArrowRight') {
    e.preventDefault(); 
    handleProgress();
  }
});

// --- NAVIGAZIONE SEZIONI ---
function goToIntro() {
  isMoving = true;
  introStarted = true;
  forceHideHint();
  introSec.classList.add('section-visible');
  body.style.overflowY = 'auto';
  introSec.scrollIntoView({ behavior: 'smooth' });

  setTimeout(() => {
    body.style.overflow = 'hidden';
    isMoving = false;
    startTypewriter();
  }, 1000);
}

function goToTimeline() {
  isMoving = true;
  timelineActive = true;
  forceHideHint();
  timelineSec.classList.add('section-visible');
  body.style.overflowY = 'auto';
  timelineSec.scrollIntoView({ behavior: 'smooth' });

  setTimeout(() => {
    timelineSec.classList.add('active');
    isMoving = false;
    addNextStep();
  }, 1000);
}

function goToOutro() {
  isMoving = true;
  outroReached = true;
  forceHideHint();

  outroSec.classList.add('section-visible');
  body.style.overflowY = 'auto';
  outroSec.scrollIntoView({ behavior: 'smooth' });

  setTimeout(() => {
    outroSec.classList.add('visible');
    isMoving = false;

    // MOSTRA SEMPRE IL BOTTONE TUTORIAL
    if (tutorialBtn) {
      tutorialBtn.style.display = 'inline-block';
    }
  }, 1000);
}

// --- LOGICA SCRITTURA (TYPEWRITER) ---
function startTypewriter() {
  skipBtn.classList.add('visible');
  let i = 0;
  typeTextEl.innerHTML = "";

  function type() {
    if (i < introTextRaw.length) {
      let char = introTextRaw.charAt(i);
      typeTextEl.innerHTML += (char === '\n' ? '<br>' : char);
      i++;
      typeTimer = setTimeout(type, 25);
    } else {
      finishIntro();
    }
  }
  type();
}

function finishIntro() {
  introFinished = true;
  skipBtn.classList.remove('visible');
  unForceHideHint();
}

// --- LOGICA TIMELINE ---
function addNextStep(instant = false) {
  if (timelineStep >= timelineData.length) return;

  const block = document.createElement('div');
  block.classList.add('text-block');
  block.innerHTML = timelineData[timelineStep];
  textCol.appendChild(block);

  const dot = document.createElement('div');
  dot.classList.add('dot');
  graphicsCol.appendChild(dot);

  const topPos = block.offsetTop;
  dot.style.top = (topPos + 5) + 'px';

  if (instant) {
    block.style.transition = 'none';
    dot.style.transition = 'none';
    block.classList.add('show');
    dot.classList.add('show');
    mainLine.style.height = (topPos + 5) + 'px';
  } else {
    setTimeout(() => {
      block.classList.add('show');
      dot.classList.add('show');
      mainLine.style.height = (topPos + 5) + 'px';
      block.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 50);
  }

  timelineStep++;

  if (timelineStep < timelineData.length) {
    skipBtn.classList.add('visible');
  } else {
    timelineFinished = true;
    skipBtn.classList.remove('visible');
    unForceHideHint();
  }
}

// --- TASTO SKIP ---
skipBtn.addEventListener('click', (e) => {
  e.stopPropagation();

  if (introStarted && !introFinished) {
    clearTimeout(typeTimer);
    typeTextEl.innerHTML = introTextRaw.replace(/\n/g, '<br>');
    finishIntro();
  } 
  else if (timelineActive && !timelineFinished) {
    while (timelineStep < timelineData.length) {
      addNextStep(true);
    }

    body.style.overflowY = 'auto';
    const lastBlock = textCol.lastElementChild;
    if (lastBlock) {
      setTimeout(() => {
        lastBlock.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 50);
    }

    timelineFinished = true;
    skipBtn.classList.remove('visible');
    unForceHideHint();
  }
});

// --- BOTTONE TUTORIAL ---
if (tutorialBtn && tutorialSec) {
  tutorialBtn.addEventListener('click', (e) => {
    e.stopPropagation();

    tutorialSec.classList.add('section-visible');
    tutorialSec.scrollIntoView({ behavior: 'smooth' });

    setTimeout(() => {
      tutorialSec.classList.add('visible');
      showStep(0); // mostra subito il primo step
    }, 300);
  });
}

// --- TUTORIAL STEP-BY-STEP ---
const tutorialSteps = document.querySelectorAll('.tutorial-steps li');
const nextStepBtn = document.getElementById('nextStepBtn');
const finishTutorialBtn = document.getElementById('finishTutorialBtn');
let currentStep = 0;

function showStep(index) {
  const header = document.querySelector('.tutorial-header');
  const progressFill = document.querySelector('.tutorial-progress-fill');
  const currentStepEl = document.getElementById('currentStep');
  const totalStepsEl = document.getElementById('totalSteps');

  // sicurezza: se la progress bar non esiste, non crasha
  if (totalStepsEl && currentStepEl) {
    totalStepsEl.textContent = tutorialSteps.length;
    currentStepEl.textContent = index + 1;
  }

  if (index === 0 && header) {
    header.classList.add('hidden');
  }

  tutorialSteps.forEach((step, i) => {
    step.classList.toggle('active-step', i === index);
  });

  if (progressFill) {
    const progressPercent = ((index + 1) / tutorialSteps.length) * 100;
    progressFill.style.width = progressPercent + '%';
  }

  if (index === tutorialSteps.length - 1) {
  finishTutorialBtn.style.display = 'inline-block';
} else {
  finishTutorialBtn.style.display = 'none';
}


// Avanza cliccando ovunque nel tutorial
tutorialSec.addEventListener('click', (e) => {
  // Se clicco il bottone finale → lascia fare il link
  if (e.target.closest('#finishTutorialBtn')) return;

  // Se sono all’ultimo step → NON avanzare
  if (currentStep >= tutorialSteps.length - 1) return;

  currentStep++;
  showStep(currentStep);
});
}
