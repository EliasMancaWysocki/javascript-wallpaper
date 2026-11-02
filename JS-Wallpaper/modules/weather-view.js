function getWeatherObjectHTML() {
    const comment = settings.showLastUpdated
        ? `  <span class='comment'>// last_updated: <span id='weather-updated'>${NULL_LITERAL_HTML}</span></span>`
        : '';
    return `<span class='cornflowerblue'>{</span>
        <span class='greenyellow'>city:</span> <span id='city'>${NULL_LITERAL_HTML}</span>,
        <span class='greenyellow'>temp:</span> <span id='temperature'>${NULL_LITERAL_HTML}</span>,
        <span class='greenyellow'>condition:</span> <span id='condition'>${NULL_LITERAL_HTML}</span>,
        <span class='greenyellow'>wind:</span> <span id='wind'>${NULL_LITERAL_HTML}</span>
    <span class='cornflowerblue'>}</span>,${comment}`;
}

function ensureWeatherExpanded() {
    const hasObject = document.getElementById('city') !== null;
    const hasUpdatedComment = document.getElementById('weather-updated') !== null;
    if (hasObject && hasUpdatedComment === settings.showLastUpdated) return;
    document.getElementById('weather-value').innerHTML = getWeatherObjectHTML();
}

function collapseWeather() {
    document.getElementById('weather-value').innerHTML = `${NULL_LITERAL_HTML},`;
    stopAllAnimations();
}

function renderWeather({ city, temperature, condition, wind, updated }) {
    ensureWeatherExpanded();
    setField('city', city);
    setField('temperature', temperature);
    setField('condition', condition);
    setField('wind', wind);
    const updatedEl = document.getElementById('weather-updated');
    if (updatedEl) updatedEl.textContent = `"${updated}"`;
}
