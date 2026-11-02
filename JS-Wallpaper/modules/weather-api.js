const WEATHER_REFRESH_MS = 30 * 60 * 1000;
const WEATHER_RETRY_MS   = 2 * 60 * 1000;

const WEATHER_PROVIDERS = {
    [OpenMeteoProvider.id]: OpenMeteoProvider,
};

let refreshTimer = null;
let retryTimer = null;
let latestRequestId = 0;

function getActiveProvider() {
    return WEATHER_PROVIDERS[settings.weatherProvider] || OpenMeteoProvider;
}

function formatClockTime(date) {
    return String(date.getHours()).padStart(2, '0') + ':' + String(date.getMinutes()).padStart(2, '0');
}

// Los proveedores informan de dónde viene el viento; las animaciones necesitan hacia dónde va.
function windTravelDegree(windFromDegree) {
    return (windFromDegree + 180) % 360;
}

function applyWeather(weather) {
    environment.windSpeedKmph = weather.windSpeedKmph;
    environment.windDirDegree = windTravelDegree(weather.windFromDegree);
    environment.sunriseHour   = weather.sunriseHour;
    environment.sunsetHour    = weather.sunsetHour;
    environment.moonPhase     = weather.moonPhase;
    environment.hemisphere    = weather.latitude < 0 ? 'south' : 'north';

    renderWeather({
        city:        weather.cityName,
        temperature: `${weather.temperature}°C`,
        condition:   weather.description,
        wind:        weather.windSpeedKmph > 0 ? `${weather.windSpeedKmph} km/h ${compassLabel(weather.windFromDegree)}` : null,
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
        const location = await resolveLocation(settings.city);
        const weather  = await getActiveProvider().fetchWeather(location);
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
