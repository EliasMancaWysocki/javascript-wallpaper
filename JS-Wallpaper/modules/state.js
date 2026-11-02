const environment = {
    windSpeedKmph: 0,
    // Hacia dónde sopla (wttr.in informa de dónde viene; se invierte al guardar).
    windDirDegree: 90,
    sunriseHour: 6,
    sunsetHour: 19,
    // 0 = nueva, 0.5 = llena, 1 = nueva otra vez
    moonPhase: 0.5,
    hemisphere: 'south',
    simulatedHour: null,
    seasonOverride: null,
};

const settings = {
    city: '',
    weatherEnabled: true,
    showLastUpdated: true,
    insideWallpaperEngine: false,
};

function getNow() {
    const now = new Date();
    if (environment.simulatedHour !== null) now.setHours(environment.simulatedHour, 0, 0, 0);
    return now;
}
