const SUN_SIZE = 100;
const MOON_SIZE = 80;
const ARC_CENTER_SHIFT_X = 50;
const SUN_TEXT_MARGIN = 60;
const MOON_TEXT_MARGIN = 50;
const DIMMED_OPACITY = '0.12';

function getOrCreateSun() {
    let sun = document.querySelector('.sun');
    if (sun) return sun;
    sun = document.createElement('div');
    sun.className = 'sun';
    document.body.appendChild(sun);
    return sun;
}

function getOrCreateMoon() {
    let moon = document.querySelector('.moon');
    if (moon && moon.tagName === 'CANVAS') return moon;
    if (moon) moon.remove();
    moon = document.createElement('canvas');
    moon.className = 'moon';
    moon.width  = MOON_SIZE;
    moon.height = MOON_SIZE;
    document.body.appendChild(moon);
    return moon;
}

function positionOnArc(element, size, progress, baseline, radius) {
    const cx = window.innerWidth / 2 + ARC_CENTER_SHIFT_X;
    const cy = window.innerHeight * baseline;
    element.style.left = `${cx + radius * Math.cos(Math.PI * (1 - progress)) - size / 2}px`;
    element.style.top  = `${cy - radius * Math.sin(Math.PI * (1 - progress)) - size / 2}px`;
}

function dimIfOverText(element, margin) {
    requestAnimationFrame(() => {
        element.style.opacity = overlaps(element.getBoundingClientRect(), TextBounds.get(), margin)
            ? DIMMED_OPACITY
            : '1';
    });
}

function updateSun(hours) {
    const sun = getOrCreateSun();
    const { sunriseHour, sunsetHour } = environment;

    if (hours < sunriseHour || hours > sunsetHour) {
        sun.style.display = 'none';
        return;
    }
    const progress = (hours - sunriseHour) / (sunsetHour - sunriseHour);
    positionOnArc(sun, SUN_SIZE, progress, 0.98, window.innerWidth / 2.4);
    sun.style.display = 'block';
    dimIfOverText(sun, SUN_TEXT_MARGIN);
}

function updateMoon(hours) {
    const moon = getOrCreateMoon();
    const { sunriseHour, sunsetHour, moonPhase } = environment;
    const nightStart  = sunsetHour + 0.01;
    const nightLength = (24 - nightStart) + sunriseHour;

    if (hours < nightStart && hours >= sunriseHour) {
        moon.style.display = 'none';
        return;
    }
    const progress = hours >= nightStart
        ? (hours - nightStart) / nightLength
        : (hours + (24 - nightStart)) / nightLength;

    positionOnArc(moon, MOON_SIZE, progress, 0.95, window.innerWidth / 2.5);
    moon.style.display = 'block';
    if (moon.dataset.phase !== String(moonPhase)) drawMoonPhase(moon, moonPhase);
    dimIfOverText(moon, MOON_TEXT_MARGIN);
}

function ensureSunAndMoon() {
    const now = getNow();
    const hours = now.getHours() + now.getMinutes() / 60;
    updateSun(hours);
    updateMoon(hours);
}

function updateObjectOpacity() {
    const textBounds = TextBounds.get();
    const sun = document.querySelector('.sun');
    if (sun && sun.style.display !== 'none') {
        sun.style.opacity = overlaps(sun.getBoundingClientRect(), textBounds, SUN_TEXT_MARGIN) ? DIMMED_OPACITY : '1';
    }
    const moon = document.querySelector('.moon');
    if (moon && moon.style.display !== 'none') {
        moon.style.opacity = overlaps(moon.getBoundingClientRect(), textBounds, MOON_TEXT_MARGIN) ? DIMMED_OPACITY : '1';
    }
}
