const WEATHER_REFRESH_MS = 30 * 60 * 1000;
const WEATHER_RETRY_MS   = 2 * 60 * 1000;
const WEATHER_TIMEOUT_MS = 15 * 1000;

const MOON_PHASE_BY_NAME = {
    'New Moon': 0, 'Waxing Crescent': 0.125, 'First Quarter': 0.25,
    'Waxing Gibbous': 0.375, 'Full Moon': 0.5, 'Waning Gibbous': 0.625,
    'Last Quarter': 0.75, 'Waning Crescent': 0.875,
};

let refreshTimer = null;
let retryTimer = null;
let latestRequestId = 0;

function parseTime12(text) {
    const [time, meridiem] = text.trim().split(' ');
    let [hours, minutes] = time.split(':').map(Number);
    if (meridiem === 'PM' && hours !== 12) hours += 12;
    if (meridiem === 'AM' && hours === 12) hours = 0;
    return hours + minutes / 60;
}

function formatClockTime(date) {
    return String(date.getHours()).padStart(2, '0') + ':' + String(date.getMinutes()).padStart(2, '0');
}

async function requestWeatherJson(city) {
    const url = city
        ? `https://wttr.in/${encodeURIComponent(city)}?format=j1`
        : 'https://wttr.in/?format=j1';

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), WEATHER_TIMEOUT_MS);
    try {
        const response = await fetch(url, { signal: controller.signal });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return await response.json();
    } finally {
        clearTimeout(timeout);
    }
}

function parseWeather(data) {
    const current = data.current_condition[0];
    const area    = data.nearest_area[0];
    const astro   = data.weather[0].astronomy[0];

    return {
        description:    current.weatherDesc[0].value,
        temperature:    Math.round(current.temp_C),
        cityName:       area.areaName[0].value,
        latitude:       parseFloat(area.latitude),
        windSpeedKmph:  parseInt(current.windspeedKmph) || 0,
        windDir16:      current.winddir16Point || '',
        // wttr.in informa de dónde viene el viento; las animaciones necesitan hacia dónde va.
        windDirDegree:  ((parseInt(current.winddirDegree) || 0) + 180) % 360,
        sunriseHour:    parseTime12(astro.sunrise),
        sunsetHour:     parseTime12(astro.sunset),
        moonPhase:      MOON_PHASE_BY_NAME[astro.moon_phase] ?? 0.5,
    };
}

function applyWeather(weather) {
    environment.windSpeedKmph = weather.windSpeedKmph;
    environment.windDirDegree = weather.windDirDegree;
    environment.sunriseHour   = weather.sunriseHour;
    environment.sunsetHour    = weather.sunsetHour;
    environment.moonPhase     = weather.moonPhase;
    if (!Number.isNaN(weather.latitude)) environment.hemisphere = weather.latitude < 0 ? 'south' : 'north';

    renderWeather({
        city:        weather.cityName,
        temperature: `${weather.temperature}°C`,
        condition:   weather.description,
        wind:        weather.windSpeedKmph > 0 ? `${weather.windSpeedKmph} km/h ${weather.windDir16}`.trim() : null,
        updated:     formatClockTime(new Date()),
    });

    stopAllAnimations();
    if (settings.weatherEnabled) applyWeatherEffects(weather.description);
    ensureSunAndMoon();
}

async function getWeather() {
    clearTimeout(retryTimer);
    const requestId = ++latestRequestId;
    try {
        const weather = parseWeather(await requestWeatherJson(settings.city));
        if (requestId !== latestRequestId) return;
        applyWeather(weather);
    } catch (error) {
        if (requestId !== latestRequestId) return;
        console.error('Weather error:', error);
        collapseWeather();
        retryTimer = setTimeout(getWeather, WEATHER_RETRY_MS);
    }
}

function restartWeatherRefresh() {
    clearInterval(refreshTimer);
    getWeather();
    refreshTimer = setInterval(getWeather, WEATHER_REFRESH_MS);
}
