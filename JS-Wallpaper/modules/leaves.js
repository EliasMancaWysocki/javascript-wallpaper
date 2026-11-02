const MIN_WIND_FOR_LEAVES_KMPH = 15;

// Índice = mes (0–11) en hemisferio norte; en el sur se desplaza medio año.
const SEASON_BY_NORTH_MONTH = [
    'winter', 'winter', 'spring', 'spring', 'spring', 'summer',
    'summer', 'summer', 'autumn', 'autumn', 'autumn', 'winter',
];

// spawnFactor mayor = menos partículas.
const SEASON_CONFIGS = {
    autumn: {
        spawnFactor: 0.65,
        colors: [
            'hsla(25,72%,38%,0.92)',
            'hsla(14,78%,32%,0.90)',
            'hsla(38,84%,44%,0.92)',
            'hsla(8,68%,28%,0.88)',
            'hsla(44,90%,50%,0.90)',
            'hsla(18,60%,22%,0.85)',
        ],
        types: ['leaf'],
    },
    winter: {
        spawnFactor: 2.2,
        colors: [
            'hsla(20,36%,24%,0.80)',
            'hsla(28,30%,26%,0.75)',
            'hsla(15,26%,20%,0.78)',
            'hsla(32,28%,22%,0.72)',
        ],
        types: ['leaf'],
    },
    spring: {
        spawnFactor: 0.42,
        colors: [
            'hsla(118,62%,36%,0.88)',
            'hsla(100,58%,40%,0.85)',
            'hsla(135,55%,42%,0.86)',
            'hsla(338,72%,76%,0.85)',
            'hsla(350,64%,80%,0.80)',
            'hsla(325,68%,78%,0.82)',
            'hsla(355,55%,84%,0.75)',
            'hsla(0,0%,94%,0.70)',
        ],
        types: ['leaf', 'petal', 'petal'],
    },
    summer: {
        spawnFactor: 1.05,
        colors: [
            'hsla(122,66%,32%,0.88)',
            'hsla(108,60%,36%,0.85)',
            'hsla(132,58%,38%,0.85)',
            'hsla(115,52%,30%,0.82)',
        ],
        types: ['leaf'],
    },
};

function getCurrentSeason() {
    if (environment.seasonOverride) return environment.seasonOverride;
    const month = new Date().getMonth();
    const northMonth = environment.hemisphere === 'south' ? (month + 6) % 12 : month;
    return SEASON_BY_NORTH_MONTH[northMonth];
}

function pickRandom(list) {
    return list[Math.floor(Math.random() * list.length)];
}

function buildParticle(config, canvasWidth, canvasHeight, wind) {
    const isPetal = pickRandom(config.types) === 'petal';
    const size    = isPetal ? Math.random() * 6 + 5 : Math.random() * 10 + 10;
    const vxMag   = 0.8 + environment.windSpeedKmph * 0.055 + Math.random() * 0.5;

    return {
        isPetal,
        width:     size,
        height:    size * 0.6,
        color:     pickRandom(config.colors),
        vx:        wind.moveRight ? vxMag : -vxMag,
        vy:        isPetal ? 0.35 + Math.random() * 0.45 : 0.9 + Math.random() * 0.6,
        wobbleAmp: isPetal ? 1.4 : 0.5,
        spin:      (Math.random() - 0.5) * (isPetal ? 2.5 : 4),
        x:         wind.moveRight ? -size : canvasWidth + size,
        y:         Math.random() * canvasHeight * 0.75,
        wobble:    Math.random() * Math.PI * 2,
        rotation:  Math.random() * 360,
    };
}

function advanceParticle(p) {
    p.wobble   += 0.04;
    p.x        += p.vx + Math.sin(p.wobble) * p.wobbleAmp;
    p.y        += p.vy;
    p.rotation += p.spin;
}

function isParticleGone(p, canvas, moveRight) {
    const exitedSide = moveRight ? p.x > canvas.width + p.width : p.x < -p.width;
    return exitedSide || p.y > canvas.height + p.width;
}

function paintParticle(ctx, p) {
    ctx.save();
    ctx.translate(p.x + p.width / 2, p.y + p.height / 2);
    ctx.rotate(p.rotation * Math.PI / 180);
    ctx.fillStyle = p.color;
    ctx.beginPath();
    const rx = p.width / 2;
    const ry = p.height / 2;
    if (p.isPetal) {
        ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
    } else {
        // Hoja: esquinas superior-izquierda e inferior-derecha redondeadas.
        ctx.moveTo(0, -ry);
        ctx.lineTo(rx, -ry);
        ctx.lineTo(rx, 0);
        ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI / 2);
        ctx.lineTo(-rx, ry);
        ctx.lineTo(-rx, 0);
        ctx.ellipse(0, 0, rx, ry, 0, Math.PI, Math.PI * 1.5);
        ctx.closePath();
    }
    ctx.fill();
    ctx.restore();
}

const LEAVES_Z_INDEX = 5;

const leavesCanvasEffect = createCanvasEffect(LEAVES_Z_INDEX, ({ canvas, ctx }) => {
    const config    = { ...SEASON_CONFIGS[getCurrentSeason()] };
    const baseRate  = Math.max(300, 4200 - environment.windSpeedKmph * 65);
    const spawnRate = Math.max(200, Math.round(baseRate * config.spawnFactor));
    const wind      = { moveRight: Math.sin(environment.windDirDegree * Math.PI / 180) >= 0 };

    let particles = [];
    const spawnTimer = setInterval(() => {
        particles.push(buildParticle(config, canvas.width, canvas.height, wind));
    }, spawnRate);

    return {
        tick() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            particles = particles.filter(p => !isParticleGone(p, canvas, wind.moveRight));
            particles.forEach(p => {
                advanceParticle(p);
                paintParticle(ctx, p);
            });
        },
        dispose() {
            clearInterval(spawnTimer);
        },
    };
});

const LeavesEffect = {
    start() {
        if (environment.windSpeedKmph < MIN_WIND_FOR_LEAVES_KMPH) return;
        leavesCanvasEffect.start();
    },
    stop: leavesCanvasEffect.stop,
};
