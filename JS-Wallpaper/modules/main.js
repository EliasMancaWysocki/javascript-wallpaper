updateClock();
setInterval(updateClock, 500);

ensureSunAndMoon();
// El layout todavía no está pintado en la primera llamada; se repite para calcular bien la opacidad.
setTimeout(ensureSunAndMoon, 300);
setInterval(ensureSunAndMoon, 60000);

createMountains();

function refreshTextBoundsAndSky() {
    TextBounds.refresh();
    updateObjectOpacity();
}

new ResizeObserver(() => requestAnimationFrame(refreshTextBoundsAndSky))
    .observe(document.getElementById('container'));
window.addEventListener('resize', () => requestAnimationFrame(refreshTextBoundsAndSky));
