const SYNODIC_MONTH_DAYS = 29.530588853;
const MS_PER_DAY = 24 * 60 * 60 * 1000;
const REFERENCE_NEW_MOON_MS = Date.UTC(2000, 0, 6, 18, 14);

// 0 = nueva, 0.5 = llena. Aproximación por mes sinódico medio (error de unas horas).
function computeMoonPhase(date) {
    const cycles = (date.getTime() - REFERENCE_NEW_MOON_MS) / MS_PER_DAY / SYNODIC_MONTH_DAYS;
    return cycles - Math.floor(cycles);
}
