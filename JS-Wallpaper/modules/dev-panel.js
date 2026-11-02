const DEV_PANEL_REVEAL_DELAY_MS = 1200;
const MOON_LABELS = [
    '🌑 Nueva', '🌒 Creciente', '🌓 Cuarto C', '🌔 Gibosa C',
    '🌕 Llena',  '🌖 Gibosa M', '🌗 Cuarto M', '🌘 Menguante',
];
const MOON_PHASES = [0, 0.125, 0.25, 0.375, 0.5, 0.625, 0.75, 0.875];

const devPanel = document.getElementById('dev-panel');
let devPanelVisible = false;

function showDevPanel(show) {
    devPanelVisible = show;
    devPanel.style.display = show ? 'flex' : 'none';
}

function hourIcon(hour) {
    if (hour >= 6 && hour < 17) return '☀';
    if (hour >= 17 && hour < 20) return '🌅';
    return '🌙';
}

function formatHourLabel(hour) {
    return `${String(hour).padStart(2, '0')}:00 ${hourIcon(hour)}`;
}

function markActive(row, button) {
    row.querySelectorAll('button').forEach(b => b.classList.remove('active'));
    if (button) button.classList.add('active');
}

function onButtonClick(rowId, handler) {
    const row = document.getElementById(rowId);
    row.addEventListener('click', event => {
        const button = event.target.closest('button');
        if (!button) return;
        markActive(row, button);
        handler(button.dataset);
    });
}

function applyDevCondition(condition) {
    stopAllAnimations();
    if (condition === 'clear') {
        collapseWeather();
        return;
    }
    const { windSpeedKmph, windDirDegree } = environment;
    renderWeather({
        city:        'La Calera',
        temperature: '15°C',
        condition,
        wind:        windSpeedKmph > 0 ? `${windSpeedKmph} km/h ${compassLabel(windDirDegree)}` : null,
        updated:     formatClockTime(new Date()),
    });
    applyWeatherEffects(condition);
}

setTimeout(() => {
    document.getElementById('dev-toggle').style.display = 'block';
    if (!settings.insideWallpaperEngine) showDevPanel(true);
}, DEV_PANEL_REVEAL_DELAY_MS);

document.getElementById('dev-toggle').addEventListener('click', () => showDevPanel(!devPanelVisible));
document.addEventListener('keydown', event => {
    if (event.key === 'd' || event.key === 'D') showDevPanel(!devPanelVisible);
});

document.getElementById('dev-wind-speed').addEventListener('input', function () {
    environment.windSpeedKmph = parseInt(this.value);
    document.getElementById('dev-wind-val').textContent = environment.windSpeedKmph;
});

document.getElementById('dev-wind-dir').addEventListener('input', function () {
    environment.windDirDegree = parseInt(this.value);
    document.getElementById('dev-dir-val').textContent =
        `${environment.windDirDegree}° ${compassLabel(environment.windDirDegree)}`;
});

onButtonClick('dev-condition-row', ({ condition }) => applyDevCondition(condition));

onButtonClick('dev-season-row', ({ season }) => {
    environment.seasonOverride = season === 'auto' ? null : season;
    LeavesEffect.stop();
    LeavesEffect.start();
});

document.getElementById('dev-hour').addEventListener('input', function () {
    const hour = parseInt(this.value);
    environment.simulatedHour = hour;
    document.getElementById('dev-hour-val').textContent = formatHourLabel(hour);
    ensureSunAndMoon();
});

document.getElementById('dev-hour-auto').addEventListener('click', () => {
    environment.simulatedHour = null;
    const hour = new Date().getHours();
    document.getElementById('dev-hour').value = hour;
    document.getElementById('dev-hour-val').textContent = formatHourLabel(hour);
    ensureSunAndMoon();
});

document.getElementById('dev-moon').addEventListener('input', function () {
    const index = parseInt(this.value);
    environment.moonPhase = MOON_PHASES[index];
    document.getElementById('dev-moon-val').textContent = MOON_LABELS[index];
    ensureSunAndMoon();
});
