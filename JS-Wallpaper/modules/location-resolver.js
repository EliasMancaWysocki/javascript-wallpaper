const GEOCODING_URL      = 'https://geocoding-api.open-meteo.com/v1/search';
const IP_GEOLOCATION_URL = 'https://get.geojs.io/v1/ip/geo.json';

const geocodingCache = new Map();

async function searchPlace(name) {
    const url = `${GEOCODING_URL}?name=${encodeURIComponent(name)}&count=1&language=en&format=json`;
    const data = await fetchJson(url);
    return (data.results && data.results[0]) || null;
}

async function geocodeCity(city) {
    const [firstSegment] = city.split(',');
    // "Ciudad, Provincia, País" suele resolverse completo; si no, se reintenta solo con la ciudad.
    const place = (await searchPlace(city)) || (firstSegment.trim() !== city ? await searchPlace(firstSegment.trim()) : null);
    if (!place) throw new Error(`City not found: ${city}`);
    return { name: place.name, latitude: place.latitude, longitude: place.longitude };
}

async function locateByIp() {
    const data = await fetchJson(IP_GEOLOCATION_URL);
    const latitude  = parseFloat(data.latitude);
    const longitude = parseFloat(data.longitude);
    if (Number.isNaN(latitude) || Number.isNaN(longitude)) throw new Error('IP geolocation returned no coordinates');
    return { name: data.city || data.region || data.country || 'Unknown', latitude, longitude };
}

// La IP puede cambiar entre refrescos (VPN, viajes); una ciudad escrita no.
function resolveLocation(city) {
    if (!city) return locateByIp();

    const key = city.toLowerCase();
    if (!geocodingCache.has(key)) {
        const lookup = geocodeCity(city).catch(error => {
            geocodingCache.delete(key);
            throw error;
        });
        geocodingCache.set(key, lookup);
    }
    return geocodingCache.get(key);
}
