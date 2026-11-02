const OPEN_METEO_FORECAST_URL = 'https://api.open-meteo.com/v1/forecast';

const WMO_DESCRIPTIONS = {
    0: 'Clear', 1: 'Mainly clear', 2: 'Partly cloudy', 3: 'Overcast',
    45: 'Fog', 48: 'Rime fog',
    51: 'Light drizzle', 53: 'Drizzle', 55: 'Dense drizzle',
    56: 'Freezing drizzle', 57: 'Dense freezing drizzle',
    61: 'Light rain', 63: 'Rain', 65: 'Heavy rain',
    66: 'Freezing rain', 67: 'Heavy freezing rain',
    71: 'Light snow', 73: 'Snow', 75: 'Heavy snow', 77: 'Snow grains',
    80: 'Light rain showers', 81: 'Rain showers', 82: 'Violent rain showers',
    85: 'Light snow showers', 86: 'Heavy snow showers',
    95: 'Thunderstorm', 96: 'Thunderstorm with hail', 99: 'Thunderstorm with heavy hail',
};

// Con timezone=auto la hora viene en horario local de la ubicación, p. ej. "2026-11-02T06:19".
function localIsoToHour(isoLocal) {
    const [hours, minutes] = isoLocal.split('T')[1].split(':').map(Number);
    return hours + minutes / 60;
}

function normalizeOpenMeteo(data, location) {
    const current = data.current;
    const daily   = data.daily;
    if (!current || !daily || !daily.sunrise || !daily.sunset) throw new Error('Unexpected Open-Meteo response');

    return {
        description:   WMO_DESCRIPTIONS[current.weather_code] || 'Unknown',
        temperature:   Math.round(current.temperature_2m),
        cityName:      location.name,
        latitude:      location.latitude,
        windSpeedKmph: Math.round(current.wind_speed_10m),
        windFromDegree: current.wind_direction_10m,
        sunriseHour:   localIsoToHour(daily.sunrise[0]),
        sunsetHour:    localIsoToHour(daily.sunset[0]),
        moonPhase:     computeMoonPhase(new Date()),
    };
}

const OpenMeteoProvider = {
    id: 'open-meteo',
    async fetchWeather(location) {
        const params = new URLSearchParams({
            latitude:      location.latitude,
            longitude:     location.longitude,
            current:       'temperature_2m,weather_code,wind_speed_10m,wind_direction_10m',
            daily:         'sunrise,sunset',
            timezone:      'auto',
            forecast_days: '1',
        });
        return normalizeOpenMeteo(await fetchJson(`${OPEN_METEO_FORECAST_URL}?${params}`), location);
    },
};
