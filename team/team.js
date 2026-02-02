const footer = document.querySelector('.footer');

function checkFooter() {
    const scrollBottom = window.scrollY + window.innerHeight;
    const docHeight = document.body.offsetHeight;

    if(scrollBottom < docHeight - 50) {
        // quando NON siamo in fondo
        footer.classList.remove('show-footer');
    } else {
        // quando scroll vicino al fondo
        footer.classList.add('show-footer');
    }
}

window.addEventListener('scroll', checkFooter);
window.addEventListener('resize', checkFooter);
checkFooter(); // controllo iniziale
