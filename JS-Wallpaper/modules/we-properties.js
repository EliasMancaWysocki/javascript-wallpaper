// Wallpaper Engine envía solo las propiedades que cambiaron, salvo en la primera llamada.
window.wallpaperPropertyListener = {
    applyUserProperties(properties) {
        settings.insideWallpaperEngine = true;
        hideDevTools();

        if (properties.schemecolor) {
            const [r, g, b] = properties.schemecolor.value.split(' ').map(v => Math.round(parseFloat(v) * 255));
            document.body.style.backgroundColor = `rgb(${r}, ${g}, ${b})`;
        }

        const weatherPropertyChanged = ['city', 'weather', 'showlastupdated'].some(key => properties[key] !== undefined);
        if (properties.weather !== undefined)         settings.weatherEnabled = properties.weather.value;
        if (properties.showlastupdated !== undefined) settings.showLastUpdated = properties.showlastupdated.value;
        if (properties.city !== undefined)            settings.city = properties.city.value.trim();

        if (weatherPropertyChanged) restartWeatherRefresh();
    },
};
