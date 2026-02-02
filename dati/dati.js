document.addEventListener('DOMContentLoaded', () => {
    const banana = document.querySelector('.scroll-img.banana');
    const lisca = document.querySelector('.scroll-img.lisca');
    const sacco = document.querySelector('.scroll-img.sacco');

    function moveImages() {
        const scrollY = window.scrollY;

        // Movimento massimo verticale in pixel
        const maxMove = 300;

        // Calcola spostamento progressivo
        const move = Math.min(scrollY * 0.2, maxMove);

       if (banana) {
            // Muove la banana verso il basso con rotazione verso destra
            const rotation = Math.sin(scrollY * 0.01) * 5; // oscillazione ±5°
            banana.style.transform = `translateX(-50%) translateY(${move}px) rotate(${rotation}deg)`;
        }

        if (lisca) {
            const rotation = Math.sin(scrollY * 0.01 + Math.PI) * 5; // opposta
            lisca.style.transform = `translateX(-50%) translateY(${move}px) rotate(${rotation}deg)`;
        }

       if (sacco) {
            // Muove il sacco verso l’alto con rotazione verso sinistra
            const rotation = Math.sin(scrollY * 0.01) * 5; // oscillazione ±5°
            sacco.style.transform = `translateX(-50%) translateY(${move}px) rotate(${rotation}deg)`;
        }
    }

    window.addEventListener('scroll', moveImages);
});


const scene = document.querySelector('.trash-scene');
const apple = document.querySelector('.scroll-apple');

window.addEventListener('scroll', () => {
    const rect = scene.getBoundingClientRect();
    const viewportHeight = window.innerHeight;

    // progress globale della sezione
    let sectionProgress =
        1 - (rect.bottom / (viewportHeight + rect.height));
    sectionProgress = Math.min(Math.max(sectionProgress, 0), 1);

   
    let fallProgress = 0;

    if (sectionProgress > 0.3) {
        fallProgress = (sectionProgress - 0.3) / 0.7;
    }

    fallProgress = Math.min(Math.max(fallProgress, 0), 1);

    apple.style.setProperty('--fall', fallProgress.toFixed(3));
});

