// El primer patrón que coincide gana; el orden importa (tormenta antes que lluvia).
const WEATHER_RULES = [
    { pattern: /thunder|storm/,                   effect: StormEffect },
    { pattern: /rain|drizzle/,                    effect: RainEffect },
    { pattern: /snow|blizzard|sleet|ice pellet/,  effect: SnowEffect },
    { pattern: /cloud|overcast/,                  effect: CloudEffect },
];

const ALL_EFFECTS = [StormEffect, RainEffect, SnowEffect, CloudEffect, LeavesEffect];

function stopAllAnimations() {
    ALL_EFFECTS.forEach(effect => effect.stop());
}

function applyWeatherEffects(description) {
    const normalized = description.toLowerCase();
    const rule = WEATHER_RULES.find(candidate => candidate.pattern.test(normalized));
    if (rule) rule.effect.start();
    if (!/snow|blizzard/.test(normalized)) LeavesEffect.start();
}
