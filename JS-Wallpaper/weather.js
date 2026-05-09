// ── Helpers ───────────────────────────────────────────────────────────────────

function setField(id, value) {
    const el = document.getElementById(id);
    if (!el) return;
    if (value === null || value === undefined || value === '') {
        el.innerHTML = "<span class='mediumpurple'>null</span>";
    } else {
        const safe = String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;');
        el.innerHTML = "<span class='sandybrown'>\"" + safe + "\"</span>";
    }
}

// ── Weather ───────────────────────────────────────────────────────────────────

let windSpeedKmph = 0;
let windDirDegree = 90;
let sunriseHour   = 6;    // se actualiza con cada fetch
let sunsetHour    = 19;
let moonPhaseNum  = 0.5;  // 0=nueva, 0.5=llena, 1=nueva otra vez

function getWeatherObjectHTML() {
    const comment = showLastUpdated
        ? `  <span class='comment'>// last_updated: <span id='weather-updated'><span class='mediumpurple'>null</span></span></span>`
        : '';
    return `<span class='cornflowerblue'>{</span>
        <span class='greenyellow'>city:</span> <span id='city'><span class='mediumpurple'>null</span></span>,
        <span class='greenyellow'>temp:</span> <span id='temperature'><span class='mediumpurple'>null</span></span>,
        <span class='greenyellow'>condition:</span> <span id='condition'><span class='mediumpurple'>null</span></span>,
        <span class='greenyellow'>wind:</span> <span id='wind'><span class='mediumpurple'>null</span></span>
    <span class='cornflowerblue'>}</span>,${comment}`;
}

function ensureWeatherExpanded() {
    if (!document.getElementById('city')) {
        document.getElementById('weather-value').innerHTML = getWeatherObjectHTML();
    }
}

function collapseWeather() {
    document.getElementById('weather-value').innerHTML = "<span class='mediumpurple'>null</span>,";
    stopAllAnimations();
}

async function getWeather() {
    if (city) {
        await fetchWeather(encodeURIComponent(city));
    } else if (useGeolocation && navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            async (pos) => {
                const lat = pos.coords.latitude.toFixed(4);
                const lon = pos.coords.longitude.toFixed(4);
                await fetchWeather(`${lat},${lon}`);
            },
            async () => { await fetchWeather(''); }
        );
    } else {
        await fetchWeather('');
    }
}

async function fetchWeather(location) {
    try {
        const url = location ? `https://wttr.in/${location}?format=j1` : `https://wttr.in/?format=j1`;
        const response = await fetch(url);
        if (!response.ok) throw new Error(`${response.status}`);
        const data = await response.json();

        const cond      = data.current_condition[0];
        const description = cond.weatherDesc[0].value;
        const temp        = Math.round(cond.temp_C);
        const cityName    = data.nearest_area[0].areaName[0].value;
        windSpeedKmph     = parseInt(cond.windspeedKmph) || 0;
        // wttr.in da la dirección DE DONDE VIENE el viento (conv. meteorológica).
        // Convertimos a "hacia dónde va" para que Math.sin() dé el vector correcto.
        windDirDegree     = ((parseInt(cond.winddirDegree) || 0) + 180) % 360;

        // Amanecer y atardecer reales del día (varían por fecha y ubicación)
        const astro = data.weather[0].astronomy[0];
        function parseTime12(str) {
            const [time, ampm] = str.trim().split(' ');
            let [h, m] = time.split(':').map(Number);
            if (ampm === 'PM' && h !== 12) h += 12;
            if (ampm === 'AM' && h === 12) h  = 0;
            return h + m / 60;
        }
        sunriseHour = parseTime12(astro.sunrise);
        sunsetHour  = parseTime12(astro.sunset);

        const PHASE_MAP = {
            'New Moon': 0, 'Waxing Crescent': 0.125, 'First Quarter': 0.25,
            'Waxing Gibbous': 0.375, 'Full Moon': 0.5, 'Waning Gibbous': 0.625,
            'Last Quarter': 0.75, 'Waning Crescent': 0.875
        };
        moonPhaseNum = PHASE_MAP[astro.moon_phase] ?? 0.5;
        const windDir16   = cond.winddir16Point || '';

        const now = new Date();
        const updated = String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0');

        ensureWeatherExpanded();
        setField('city', cityName);
        setField('temperature', `${temp}°C`);
        setField('condition', description);
        setField('wind', windSpeedKmph > 0 ? `${windSpeedKmph} km/h ${windDir16}`.trim() : null);
        const wuEl = document.getElementById('weather-updated');
        if (wuEl) wuEl.textContent = `"${updated}"`;

        stopAllAnimations();

        if (weatherFunction) {
            const desc = description.toLowerCase();
            if (desc.includes('thunder') || desc.includes('storm')) {
                startStormAnimation();
            } else if (desc.includes('rain') || desc.includes('drizzle')) {
                startRainAnimation();
            } else if (desc.includes('snow') || desc.includes('blizzard') || desc.includes('sleet') || desc.includes('ice pellet')) {
                startSnowAnimation();
            } else if (desc.includes('cloud') || desc.includes('overcast')) {
                startCloudyAnimation();
            }
            // Leaves appear whenever it's windy enough (not in snow)
            if (!desc.includes('snow') && !desc.includes('blizzard')) {
                startLeavesAnimation();
            }
        }
    } catch (error) {
        console.error('Weather error:', error);
        collapseWeather();
    }
}

// ── Dibujo de fase lunar (canvas) ─────────────────────────────────────────────
// phase: 0=nueva, 0.25=cuarto creciente, 0.5=llena, 0.75=cuarto menguante
// Geometría: semicírculo del lado iluminado + elipse como terminador

function drawMoonPhase(canvas, phase) {
    const ctx = canvas.getContext('2d');
    const s   = canvas.width;
    const r   = s / 2 - 1;
    const cx  = s / 2, cy = s / 2;

    ctx.clearRect(0, 0, s, s);
    ctx.save();

    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.clip();

    const waxing = phase <= 0.5;
    // p: 0 = luna nueva, 1 = luna llena (independiente de si crece o mengua)
    const p   = waxing ? phase * 2 : (1 - phase) * 2;
    const ex  = r * (1 - 2 * p);
    const acw = ex >= 0;
    const exr = Math.max(Math.abs(ex), 0.5);

    // ── Inclinación fija de −9° en todas las fases ────────────────────────
    const tiltAngle = -9 * Math.PI / 180; // −0.157 rad
    ctx.translate(cx, cy);
    ctx.rotate(tiltAngle);
    ctx.translate(-cx, -cy);

    // ── 1. Base oscura (lado noche) ────────────────────────────────────────
    // Earthshine: más intenso cuanto más lado oscuro es visible (luna nueva → llena)
    const esA = (0.72 - p * 0.26).toFixed(2);
    ctx.fillStyle = `rgba(18, 24, 52, ${esA})`;
    ctx.fillRect(0, 0, s, s);

    // ── 2. Textura del lado oscuro (cráteres tenues bajo earthshine) ───────
    // Se dibujan ANTES del relleno iluminado → quedan tapados donde haya luz
    function shadeCrater(ox, oy, cr, alpha) {
        const ccx = cx + ox * r, ccy = cy + oy * r;
        const g = ctx.createRadialGradient(ccx, ccy, cr * 0.25, ccx, ccy, cr);
        g.addColorStop(0, `rgba(8, 14, 32, ${alpha})`);
        g.addColorStop(1, `rgba(8, 14, 32, 0)`);
        ctx.beginPath();
        ctx.arc(ccx, ccy, cr, 0, Math.PI * 2);
        ctx.fillStyle = g;
        ctx.fill();
        // Rim tenuísimo (luz terrestre)
        ctx.beginPath();
        ctx.arc(ccx + cr * 0.28, ccy - cr * 0.28, cr * 0.35, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(50, 65, 100, ${alpha * 0.50})`;
        ctx.fill();
    }
    // Distribuidos por todo el disco (visibles solo donde no llega la luz solar)
    shadeCrater(-0.15, -0.28, r * 0.12, 0.30);
    shadeCrater(-0.32,  0.14, r * 0.10, 0.24);
    shadeCrater( 0.06,  0.30, r * 0.09, 0.22);
    shadeCrater(-0.24,  0.40, r * 0.08, 0.20);
    shadeCrater( 0.30, -0.22, r * 0.08, 0.20);
    shadeCrater(-0.38, -0.12, r * 0.07, 0.22);
    shadeCrater( 0.22,  0.12, r * 0.09, 0.20);
    shadeCrater( 0.38,  0.28, r * 0.07, 0.18);
    shadeCrater( 0.16, -0.38, r * 0.08, 0.20);

    // ── 3. Área iluminada — gradiente lineal adaptado a la fase ───────────
    // Luna llena (p=1): casi uniforme (solo ~4% de diferencia entre extremos).
    // Creciente (p≈0.25): contraste pronunciado.
    // Fórmula: uni=p² sube rápido cerca de p=1, comprimiendo el rango de color.
    const uni = p * p;
    const litGrad = waxing
        ? ctx.createLinearGradient(cx + r, cy, cx - r, cy)   // ilumina desde la derecha
        : ctx.createLinearGradient(cx - r, cy, cx + r, cy);  // ilumina desde la izquierda
    litGrad.addColorStop(0,    `hsl(225,26%,76%)`);
    litGrad.addColorStop(0.28, `hsl(225,22%,${Math.round(65 + uni * 7)}%)`);
    litGrad.addColorStop(0.58, `hsl(225,19%,${Math.round(57 + uni * 13)}%)`);
    litGrad.addColorStop(0.82, `hsl(225,17%,${Math.round(50 + uni * 20)}%)`);
    litGrad.addColorStop(1,    `hsl(225,15%,${Math.round(44 + uni * 28)}%)`);

    ctx.beginPath();
    if (waxing) {
        ctx.arc(cx, cy, r, -Math.PI / 2, Math.PI / 2, false);
        ctx.ellipse(cx, cy, exr, r, 0, Math.PI / 2, -Math.PI / 2, acw);
    } else {
        ctx.arc(cx, cy, r, Math.PI / 2, -Math.PI / 2, false);
        ctx.ellipse(cx, cy, exr, r, 0, -Math.PI / 2, Math.PI / 2, acw);
    }
    ctx.closePath();
    ctx.fillStyle = litGrad;
    ctx.fill();

    // ── 4. Limb darkening ─────────────────────────────────────────────────
    const limbGrad = ctx.createRadialGradient(cx, cy, r * 0.58, cx, cy, r);
    limbGrad.addColorStop(0, 'rgba(0,0,0,0)');
    limbGrad.addColorStop(1, 'rgba(4,8,20,0.44)');
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = limbGrad;
    ctx.fill();

    // ── 5. Mares (geografía lunar real) ───────────────────────────────────
    function drawMare(ox, oy, rx, ry, rot, alpha) {
        const mcx = cx + ox * r, mcy = cy + oy * r;
        const maxR = Math.max(rx, ry);
        const g = ctx.createRadialGradient(mcx, mcy, 0, mcx, mcy, maxR);
        g.addColorStop(0,    `rgba(28,36,56,${alpha})`);
        g.addColorStop(0.60, `rgba(34,44,64,${alpha * 0.60})`);
        g.addColorStop(0.83, `rgba(34,44,64,${alpha * 0.14})`);
        g.addColorStop(1,    'rgba(34,44,64,0)');
        ctx.beginPath();
        ctx.ellipse(mcx, mcy, rx, ry, rot, 0, Math.PI * 2);
        ctx.fillStyle = g;
        ctx.fill();
    }
    drawMare(-0.26,  0.02, r*0.38, r*0.35,  0.10, 0.48); // Oceanus Procellarum
    drawMare(-0.16, -0.24, r*0.26, r*0.23,  0.18, 0.72); // Mare Imbrium
    drawMare( 0.17, -0.21, r*0.15, r*0.14,  0.00, 0.64); // Mare Serenitatis
    drawMare( 0.17,  0.06, r*0.14, r*0.12, -0.15, 0.58); // Mare Tranquillitatis
    drawMare( 0.23,  0.24, r*0.12, r*0.10, -0.10, 0.44); // Mare Fecunditatis
    drawMare( 0.36, -0.24, r*0.08, r*0.07,  0.30, 0.66); // Mare Crisium
    drawMare(-0.06,  0.30, r*0.13, r*0.10,  0.15, 0.50); // Mare Nubium
    drawMare(-0.26,  0.30, r*0.08, r*0.07,  0.00, 0.52); // Mare Humorum

    // ── 6. Cráteres (cara iluminada) ───────────────────────────────────────
    const lx = waxing ? 1 : -1; // dirección de la luz solar
    function crater(ox, oy, cr, opacity) {
        const ccx = cx + ox * r, ccy = cy + oy * r;
        const bowl = ctx.createRadialGradient(
            ccx - lx * cr * 0.30, ccy + cr * 0.18, 0,
            ccx, ccy, cr
        );
        bowl.addColorStop(0,    `rgba(28,36,56,${opacity})`);
        bowl.addColorStop(0.55, `rgba(44,54,76,${opacity * 0.50})`);
        bowl.addColorStop(1,    `rgba(44,54,76,0)`);
        ctx.beginPath();
        ctx.arc(ccx, ccy, cr, 0, Math.PI * 2);
        ctx.fillStyle = bowl;
        ctx.fill();
        // Rim highlight en el lado iluminado
        ctx.beginPath();
        ctx.arc(ccx + lx * cr * 0.55, ccy - cr * 0.32, cr * 0.28, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${opacity * 0.42})`;
        ctx.fill();
    }
    // Cara central y este (creciente)
    crater( 0.12, -0.31, r*0.10, 0.50); // Copernicus
    crater(-0.04,  0.36, r*0.09, 0.45); // Tycho
    crater( 0.30,  0.03, r*0.06, 0.38); // pequeño este
    crater(-0.16,  0.14, r*0.05, 0.30); // pequeño en Procellarum
    // Tierras altas del borde oeste/izquierdo (visibles en fases menguantes)
    crater(-0.38, -0.32, r*0.07, 0.44); // noroeste
    crater(-0.44,  0.06, r*0.06, 0.40); // borde oeste
    crater(-0.32,  0.44, r*0.07, 0.38); // suroeste
    crater(-0.20, -0.45, r*0.06, 0.36); // borde norte
    crater(-0.28, -0.15, r*0.05, 0.34); // oeste-centro
    // Tierras altas del borde este/derecho (visibles en fases crecientes)
    crater( 0.40, -0.38, r*0.05, 0.32); // noreste borde
    crater( 0.44,  0.20, r*0.05, 0.28); // este borde
    crater( 0.36,  0.42, r*0.05, 0.30); // sureste borde

    // ── 7. Glow suave del terminador ──────────────────────────────────────
    const termX = cx + (waxing ? -ex : ex) * 0.88;
    const termGrad = ctx.createRadialGradient(termX, cy, 0, termX, cy, r * 0.22);
    termGrad.addColorStop(0, 'rgba(200,220,255,0.12)');
    termGrad.addColorStop(1, 'rgba(200,220,255,0)');
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = termGrad;
    ctx.fill();

    ctx.restore();

    // ── 8. Halo CSS dinámico por fase ─────────────────────────────────────
    // Intensidad: llena → brillante, nueva → tenue.
    // Offset X: el halo se desplaza hacia el lado visible.
    //   Creciente/cuarto/gibosa creciente → derecha (+X)
    //   Luna llena                        → centrado (0)
    //   Gibosa/cuarto/menguante           → izquierda (−X)
    // Magnitud del offset: máxima en creciente/menguante, se anula en llena.
    const ha = (0.10 + p * 0.28).toFixed(2);
    const hb = (0.04 + p * 0.12).toFixed(2);
    const hr1 = Math.round(10 + p * 12);
    const hr2 = Math.round(18 + p * 32);
    // sin(p·π): 0 en nueva (p=0), máximo en cuarto (p=0.5), 0 en llena (p=1)
    const glowOffX = Math.round((waxing ? 1 : -1) * Math.sin(p * Math.PI) * 9);
    canvas.style.boxShadow = [
        `${glowOffX}px 0 ${hr1}px ${Math.round(hr1 * 0.4)}px rgba(180,205,255,${ha})`,
        `${glowOffX}px 0 ${hr2}px ${Math.round(hr2 * 0.45)}px rgba(140,175,255,${hb})`
    ].join(', ');
}

// ── Sol & Luna ────────────────────────────────────────────────────────────────

function ensureSunAndMoon() {
    const now     = new Date();
    const hours   = now.getHours() + now.getMinutes() / 60;
    const sunrise = sunriseHour, sunset = sunsetHour;
    const offsetX = -50; // negativo = desplaza el arco a la derecha del centro

    // Sol
    let sun = document.querySelector('.sun');
    if (!sun) {
        sun = document.createElement('div');
        sun.className = 'sun';
        document.body.appendChild(sun);
    }
    const textBox = document.getElementById('container').getBoundingClientRect();

    if (hours >= sunrise && hours <= sunset) {
        const p  = (hours - sunrise) / (sunset - sunrise);
        const cx = window.innerWidth / 2 - offsetX;
        const cy = window.innerHeight * 0.98;
        const r  = window.innerWidth / 2.4;
        sun.style.left    = `${cx + r * Math.cos(Math.PI * (1 - p)) - 50}px`;
        sun.style.top     = `${cy - r * Math.sin(Math.PI * (1 - p)) - 50}px`;
        sun.style.display = 'block';
        requestAnimationFrame(() => {
            const sb = sun.getBoundingClientRect();
            const tb = document.getElementById('container').getBoundingClientRect();
            sun.style.opacity = overlaps(sb, tb, 60) ? '0.12' : '1';
        });
    } else {
        sun.style.display = 'none';
    }

    // Luna (canvas para dibujar la fase real)
    let moon = document.querySelector('.moon');
    if (!moon || moon.tagName !== 'CANVAS') {
        if (moon) moon.remove();
        moon = document.createElement('canvas');
        moon.className = 'moon';
        moon.width  = 80;
        moon.height = 80;
        document.body.appendChild(moon);
    }
    const nightStart  = sunsetHour + 0.01, nightEnd = sunriseHour;
    const nightLength = (24 - nightStart) + nightEnd;
    const mp = hours >= nightStart
        ? (hours - nightStart) / nightLength
        : (hours + (24 - nightStart)) / nightLength;

    if (hours >= nightStart || hours < nightEnd) {
        const cx = window.innerWidth / 2 - offsetX;
        const cy = window.innerHeight * 0.95;
        const r  = window.innerWidth / 2.5;
        moon.style.left    = `${cx + r * Math.cos(Math.PI * (1 - mp)) - 40}px`;
        moon.style.top     = `${cy - r * Math.sin(Math.PI * (1 - mp)) - 40}px`;
        moon.style.display = 'block';
        drawMoonPhase(moon, moonPhaseNum);
        requestAnimationFrame(() => {
            const mb = moon.getBoundingClientRect();
            const tb = document.getElementById('container').getBoundingClientRect();
            moon.style.opacity = overlaps(mb, tb, 50) ? '0.12' : '1';
        });
    } else {
        moon.style.display = 'none';
    }
}

function overlaps(a, b, margin) {
    return a.left < b.right + margin && a.right > b.left - margin &&
           a.top  < b.bottom + margin && a.bottom > b.top - margin;
}

function updateObjectOpacity() {
    const container = document.getElementById('container');
    if (!container) return;
    const tb = container.getBoundingClientRect();
    const sun = document.querySelector('.sun');
    if (sun && sun.style.display !== 'none') {
        sun.style.opacity = overlaps(sun.getBoundingClientRect(), tb, 60) ? '0.12' : '1';
    }
    const moon = document.querySelector('.moon');
    if (moon && moon.style.display !== 'none') {
        moon.style.opacity = overlaps(moon.getBoundingClientRect(), tb, 50) ? '0.12' : '1';
    }
}

// ── Lluvia (Canvas) ───────────────────────────────────────────────────────────

let rainCanvas = null;
let rainRafId  = null;

function startRainAnimation() {
    if (rainCanvas) return;
    rainCanvas = document.createElement('canvas');
    rainCanvas.style.cssText = 'position:fixed;top:0;left:0;pointer-events:none;z-index:10;';
    rainCanvas.width  = window.innerWidth;
    rainCanvas.height = window.innerHeight;
    document.body.appendChild(rainCanvas);

    const ctx   = rainCanvas.getContext('2d');
    const count = Math.min(160 + windSpeedKmph * 1.5, 320);

    // windDirDegree = dirección hacia donde sopla → Math.sin da componente horizontal correcta
    const windRad = windDirDegree * Math.PI / 180;
    const vx = Math.sin(windRad) * Math.min(windSpeedKmph * 0.07, 7);
    const vy = 14;

    const drops = Array.from({ length: count }, () => ({
        x:       Math.random() * (rainCanvas.width + 200) - 100,
        y:       Math.random() * rainCanvas.height,
        len:     Math.random() * 12 + 8,
        speed:   Math.random() * 4 + 10,
        opacity: Math.random() * 0.35 + 0.25,
    }));

    function frame() {
        ctx.clearRect(0, 0, rainCanvas.width, rainCanvas.height);
        ctx.lineCap = 'round';
        drops.forEach(d => {
            ctx.beginPath();
            ctx.moveTo(d.x, d.y);
            ctx.lineTo(d.x + vx * (d.len / vy), d.y + d.len);
            ctx.strokeStyle = `rgba(174, 214, 241, ${d.opacity})`;
            ctx.lineWidth = 1;
            ctx.stroke();

            d.x += vx;
            d.y += d.speed;
            if (d.y > rainCanvas.height + d.len) {
                d.y = -d.len;
                d.x = Math.random() * (rainCanvas.width + 200) - 100;
            }
            if (d.x > rainCanvas.width + 50) d.x = -50;
            if (d.x < -50)                   d.x = rainCanvas.width + 50;
        });
        rainRafId = requestAnimationFrame(frame);
    }
    frame();
}

function stopRainAnimation() {
    if (rainRafId)  { cancelAnimationFrame(rainRafId); rainRafId = null; }
    if (rainCanvas) { rainCanvas.remove(); rainCanvas = null; }
}

// ── Nieve (Canvas) ────────────────────────────────────────────────────────────

let snowCanvas = null;
let snowRafId  = null;

function startSnowAnimation() {
    if (snowCanvas) return;
    snowCanvas = document.createElement('canvas');
    snowCanvas.style.cssText = 'position:fixed;top:0;left:0;pointer-events:none;z-index:10;';
    snowCanvas.width  = window.innerWidth;
    snowCanvas.height = window.innerHeight;
    document.body.appendChild(snowCanvas);

    const ctx       = snowCanvas.getContext('2d');
    const windRad   = windDirDegree * Math.PI / 180;
    const windDrift = Math.sin(windRad) * Math.min(windSpeedKmph * 0.06, 5);

    const flakes = Array.from({ length: 110 }, () => ({
        x:     Math.random() * snowCanvas.width,
        y:     Math.random() * snowCanvas.height,
        r:     Math.random() * 3 + 1.5,
        speed: Math.random() * 1.2 + 0.5,
        drift: (Math.random() - 0.5) * 0.6,
        phase: Math.random() * Math.PI * 2,
    }));

    let t = 0;
    function frame() {
        ctx.clearRect(0, 0, snowCanvas.width, snowCanvas.height);
        t += 0.018;
        flakes.forEach(f => {
            ctx.beginPath();
            ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(255, 255, 255, 0.82)';
            ctx.fill();

            f.y += f.speed;
            f.x += f.drift * Math.sin(t + f.phase) + windDrift;
            if (f.y > snowCanvas.height + f.r)  { f.y = -f.r; f.x = Math.random() * snowCanvas.width; }
            if (f.x > snowCanvas.width  + 10)   f.x = -10;
            if (f.x < -10)                       f.x = snowCanvas.width + 10;
        });
        snowRafId = requestAnimationFrame(frame);
    }
    frame();
}

function stopSnowAnimation() {
    if (snowRafId)  { cancelAnimationFrame(snowRafId); snowRafId = null; }
    if (snowCanvas) { snowCanvas.remove(); snowCanvas = null; }
}

// ── Nubes ─────────────────────────────────────────────────────────────────────
// z-index 1 → van detrás del texto (z-index 2)
// El backdrop-filter del #container las difumina automáticamente al pasar detrás

function startCloudyAnimation() {
    if (window.cloudInterval) return;

    const windRad      = windDirDegree * Math.PI / 180;
    const windH        = Math.sin(windRad); // positivo = se mueve a la derecha
    const moveRight    = windH >= 0;
    const cloudSpeed   = (0.4 + windSpeedKmph * 0.025) * (moveRight ? 1 : -1);
    const spawnInterval = Math.max(1500, 5500 - windSpeedKmph * 65);

    function createCloud() {
        const w   = Math.random() * 140 + 160;
        const h   = w * (Math.random() * 0.18 + 0.42);
        const top = Math.random() * (window.innerHeight * 0.55);
        const op  = (Math.random() * 0.25 + 0.65).toFixed(2);

        const cloud = document.createElement('div');
        cloud.className = 'we-cloud';
        const startX = moveRight ? -w - 20 : window.innerWidth + 20;
        cloud.style.cssText = `
            position: fixed;
            z-index: 1;
            pointer-events: none;
            top: ${top}px;
            left: ${startX}px;
            width: ${w}px;
            height: ${h}px;
            background: rgba(195, 215, 238, ${op});
            border-radius: 50%;
            box-shadow:
                ${(w * 0.28).toFixed()}px ${(-h * 0.28).toFixed()}px 0 ${(h * 0.15).toFixed()}px rgba(210, 225, 245, ${op}),
                ${(w * 0.58).toFixed()}px ${(-h * 0.18).toFixed()}px 0 ${(h * 0.10).toFixed()}px rgba(205, 222, 242, ${(op * 0.92).toFixed(2)}),
                ${(-w * 0.10).toFixed()}px ${(-h * 0.18).toFixed()}px 0 ${(h * 0.08).toFixed()}px rgba(208, 220, 242, ${(op * 0.88).toFixed(2)});
            filter: blur(2px);
            transition: opacity 0.7s ease;
        `;
        document.body.appendChild(cloud);

        let x = startX;
        function move() {
            if (!cloud.parentNode) return;
            x += cloudSpeed;
            cloud.style.left = `${x}px`;
            if (moveRight ? x > window.innerWidth + 20 : x < -w - 20) { cloud.remove(); return; }
            const tb = document.getElementById('container').getBoundingClientRect();
            const cb = cloud.getBoundingClientRect();
            cloud.style.opacity = overlaps(cb, tb, 50) ? '0.1' : '1';
            requestAnimationFrame(move);
        }
        requestAnimationFrame(move);
    }

    // Spawn inicial para que no arranque la pantalla vacía
    for (let i = 0; i < 2; i++) setTimeout(createCloud, i * (spawnInterval / 2));
    window.cloudInterval = setInterval(createCloud, spawnInterval);
}

function stopCloudyAnimation() {
    clearInterval(window.cloudInterval);
    window.cloudInterval = null;
    document.querySelectorAll('.we-cloud').forEach(c => c.remove());
}

// ── Tormenta ──────────────────────────────────────────────────────────────────

let boltCanvas = null;

function drawLightningBolt(ctx, x1, y1, x2, y2, depth) {
    if (depth === 0) {
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
        return;
    }
    const mx = (x1 + x2) / 2 + (Math.random() - 0.5) * (Math.abs(x2 - x1) + Math.abs(y2 - y1)) * 0.38;
    const my = (y1 + y2) / 2 + (Math.random() - 0.5) * 18;
    drawLightningBolt(ctx, x1, y1, mx, my, depth - 1);
    drawLightningBolt(ctx, mx, my, x2, y2, depth - 1);
}

function spawnBolt() {
    if (!boltCanvas) return;
    const ctx = boltCanvas.getContext('2d');
    ctx.clearRect(0, 0, boltCanvas.width, boltCanvas.height);

    const x     = Math.random() * boltCanvas.width * 0.7 + boltCanvas.width * 0.15;
    const yEnd  = boltCanvas.height * (0.55 + Math.random() * 0.35);

    ctx.strokeStyle = `rgba(200, 220, 255, ${(Math.random() * 0.35 + 0.45).toFixed(2)})`;
    ctx.lineWidth   = Math.random() * 1.5 + 0.5;
    ctx.shadowColor = 'rgba(180, 210, 255, 0.8)';
    ctx.shadowBlur  = 12;
    drawLightningBolt(ctx, x, 0, x + (Math.random() - 0.5) * 200, yEnd, 5);

    // Optional branch
    if (Math.random() > 0.4) {
        const bx = x + (Math.random() - 0.5) * 80;
        const by = yEnd * (0.3 + Math.random() * 0.35);
        ctx.strokeStyle = `rgba(190, 215, 255, ${(Math.random() * 0.2 + 0.25).toFixed(2)})`;
        ctx.lineWidth   = Math.random() * 0.8 + 0.3;
        drawLightningBolt(ctx, bx, by, bx + (Math.random() - 0.5) * 120, by + yEnd * 0.3, 4);
    }

    setTimeout(() => {
        if (boltCanvas) boltCanvas.getContext('2d').clearRect(0, 0, boltCanvas.width, boltCanvas.height);
    }, 120);

    window.boltTimeout = setTimeout(spawnBolt, Math.random() * 8000 + 3000);
}

function startBoltAnimation() {
    if (boltCanvas) return;
    boltCanvas = document.createElement('canvas');
    boltCanvas.style.cssText = 'position:fixed;top:0;left:0;pointer-events:none;z-index:1;';
    boltCanvas.width  = window.innerWidth;
    boltCanvas.height = window.innerHeight;
    document.body.appendChild(boltCanvas);
    window.boltTimeout = setTimeout(spawnBolt, Math.random() * 5000 + 2000);
}

function stopBoltAnimation() {
    clearTimeout(window.boltTimeout);
    window.boltTimeout = null;
    if (boltCanvas) { boltCanvas.remove(); boltCanvas = null; }
}

function startStormAnimation() {
    startRainAnimation();
    startBoltAnimation();
    if (window.stormFlashTimeout) return;

    function scheduleFlash() {
        window.stormFlashTimeout = setTimeout(() => {
            if (!window.stormFlashTimeout) return;
            const el = document.createElement('div');
            el.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(255,255,220,0.72);z-index:2000;pointer-events:none;';
            document.body.appendChild(el);
            el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 220, easing: 'ease-out' });
            setTimeout(() => el.remove(), 220);
            scheduleFlash();
        }, Math.random() * 7000 + 3000);
    }
    scheduleFlash();
}

function stopStormAnimation() {
    stopRainAnimation();
    stopBoltAnimation();
    clearTimeout(window.stormFlashTimeout);
    window.stormFlashTimeout = null;
}

// ── Hojas y pétalos (frente al texto, z-index 5) ─────────────────────────────
// Estaciones para Hemisferio Sur: otoño=Mar-May, invierno=Jun-Ago,
// primavera=Sep-Nov, verano=Dic-Feb

let leavesInterval = null;

function getCurrentSeason() {
    const month = new Date().getMonth() + 1; // 1–12
    if (month >= 3 && month <= 5)  return 'autumn';
    if (month >= 6 && month <= 8)  return 'winter';
    if (month >= 9 && month <= 11) return 'spring';
    return 'summer';
}

function getSeasonConfig() {
    const season = getCurrentSeason();
    const configs = {
        // Otoño: hojas marrones/naranjas/rojas, cantidad alta
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
        // Invierno: hojas marrones oscuras, poca cantidad
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
        // Primavera: hojas verdes + muchos pétalos rosas/blancos
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
            // pétalos 2× más frecuentes que hojas
            types: ['leaf', 'petal', 'petal'],
        },
        // Verano: solo hojas verdes, un poco menos que primavera
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
    return { season, ...configs[season] };
}

function startLeavesAnimation() {
    if (windSpeedKmph < 15 || leavesInterval) return;

    const cfg       = getSeasonConfig();
    const baseRate  = Math.max(300, 4200 - windSpeedKmph * 65);
    const spawnRate = Math.max(200, Math.round(baseRate * cfg.spawnFactor));

    const windRad   = windDirDegree * Math.PI / 180;
    const windH     = Math.sin(windRad);
    const moveRight = windH >= 0;

    function createParticle() {
        const type  = cfg.types[Math.floor(Math.random() * cfg.types.length)];
        const color = cfg.colors[Math.floor(Math.random() * cfg.colors.length)];
        const isPetal = type === 'petal';
        const size  = isPetal
            ? Math.random() * 6 + 5
            : Math.random() * 10 + 10;

        const el = document.createElement('div');
        el.className = isPetal ? 'we-petal' : 'we-leaf';

        if (isPetal) {
            el.style.cssText = `
                position: fixed;
                width: ${size}px;
                height: ${(size * 0.6).toFixed()}px;
                background: ${color};
                border-radius: 50%;
                z-index: 5;
                pointer-events: none;
                filter: blur(0.4px);
            `;
        } else {
            el.style.cssText = `
                position: fixed;
                width: ${size}px;
                height: ${(size * 0.6).toFixed()}px;
                background: ${color};
                border-radius: 50% 0 50% 0;
                z-index: 5;
                pointer-events: none;
            `;
        }
        document.body.appendChild(el);

        const vxMag     = 0.8 + windSpeedKmph * 0.055 + Math.random() * 0.5;
        const vx        = moveRight ? vxMag : -vxMag;
        const vy        = isPetal ? 0.35 + Math.random() * 0.45 : 0.9 + Math.random() * 0.6;
        const wobbleAmp = isPetal ? 1.4 : 0.5;
        const spin      = (Math.random() - 0.5) * (isPetal ? 2.5 : 4);

        let x      = moveRight ? -size : window.innerWidth + size;
        let y      = Math.random() * window.innerHeight * 0.75;
        let wobble = Math.random() * Math.PI * 2;
        let rot    = Math.random() * 360;

        function move() {
            if (!el.parentNode) return;
            wobble += 0.04;
            x += vx + Math.sin(wobble) * wobbleAmp;
            y += vy;
            rot += spin;
            el.style.left      = `${x}px`;
            el.style.top       = `${y}px`;
            el.style.transform = `rotate(${rot}deg)`;
            if ((moveRight ? x > window.innerWidth + size : x < -size) || y > window.innerHeight + size) {
                el.remove(); return;
            }
            requestAnimationFrame(move);
        }
        requestAnimationFrame(move);
    }

    leavesInterval = setInterval(createParticle, spawnRate);
}

function stopLeavesAnimation() {
    clearInterval(leavesInterval);
    leavesInterval = null;
    document.querySelectorAll('.we-leaf, .we-petal').forEach(l => l.remove());
}

// ── Control ───────────────────────────────────────────────────────────────────

function stopAllAnimations() {
    stopRainAnimation();
    stopCloudyAnimation();
    stopStormAnimation();
    stopBoltAnimation();
    stopSnowAnimation();
    stopLeavesAnimation();
}

// ── Montañas ──────────────────────────────────────────────────────────────────
// Tres capas (lejos, medio, cerca) generadas con midpoint-displacement.
// Los puntos se generan una sola vez; drawMountainScene los reescala en resize.

let _mtnPts = null;

function _mtnRidge(seeds, roughness, passes) {
    let pts = seeds.map(p => ({ ...p }));
    let r = roughness;
    for (let i = 0; i < passes; i++, r *= 0.56) {
        const next = [pts[0]];
        for (let j = 0; j < pts.length - 1; j++) {
            next.push(
                { x: (pts[j].x + pts[j+1].x) / 2,
                  y: (pts[j].y + pts[j+1].y) / 2 + (Math.random() - 0.5) * r },
                pts[j+1]
            );
        }
        pts = next;
    }
    return pts;
}

function _initMtnPts() {
    // y normalizado: 0 = tope del canvas, 1 = base del canvas
    _mtnPts = {
        far: _mtnRidge([
            {x:0,y:.82},{x:.09,y:.52},{x:.20,y:.62},{x:.33,y:.42},
            {x:.46,y:.58},{x:.58,y:.44},{x:.70,y:.56},{x:.82,y:.38},
            {x:.93,y:.60},{x:1,y:.78}
        ], 0.05, 5),
        mid: _mtnRidge([
            {x:0,y:.87},{x:.07,y:.62},{x:.16,y:.75},{x:.28,y:.48},
            {x:.40,y:.67},{x:.53,y:.43},{x:.65,y:.62},{x:.76,y:.52},
            {x:.88,y:.66},{x:1,y:.85}
        ], 0.08, 5),
        near: _mtnRidge([
            {x:0,y:.90},{x:.10,y:.66},{x:.22,y:.81},{x:.36,y:.54},
            {x:.50,y:.73},{x:.63,y:.48},{x:.76,y:.68},{x:.88,y:.58},
            {x:1,y:.87}
        ], 0.11, 5),
    };
}

function _mtnFill(ctx, W, H, pts, colorTop, colorBase) {
    ctx.beginPath();
    ctx.moveTo(0, H);
    pts.forEach(p => ctx.lineTo(p.x * W, p.y * H));
    ctx.lineTo(W, H);
    ctx.closePath();
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, colorTop);
    g.addColorStop(1, colorBase);
    ctx.fillStyle = g;
    ctx.fill();
}

function _mtnStroke(ctx, W, H, pts, color, lw) {
    ctx.beginPath();
    pts.forEach((p, i) => i === 0 ? ctx.moveTo(p.x*W, p.y*H) : ctx.lineTo(p.x*W, p.y*H));
    ctx.strokeStyle = color;
    ctx.lineWidth = lw;
    ctx.lineJoin = 'round';
    ctx.stroke();
}

function drawMountainScene(canvas) {
    if (!_mtnPts) _initMtnPts();
    const ctx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    // Capa lejana — bruma atmosférica (más clara que el fondo)
    _mtnFill(ctx, W, H, _mtnPts.far,
        'rgba(82,75,118,0.38)', 'rgba(58,52,90,0.46)');

    // Capa media — profundidad intermedia
    _mtnFill(ctx, W, H, _mtnPts.mid,
        'rgba(46,42,72,0.64)', 'rgba(32,28,56,0.72)');
    _mtnStroke(ctx, W, H, _mtnPts.mid, 'rgba(62,56,92,0.20)', 0.8);

    // Capa frontal — silueta oscura con textura de roca
    _mtnFill(ctx, W, H, _mtnPts.near,
        'rgba(24,20,40,0.92)', 'rgba(12,10,22,0.97)');
    _mtnStroke(ctx, W, H, _mtnPts.near, 'rgba(55,48,80,0.52)', 1.3);

    // Grietas / textura de roca en la cresta frontal
    ctx.save();
    ctx.lineWidth = 0.7;
    _mtnPts.near.forEach((p, i) => {
        if (i % 4 !== 0) return;
        const px = p.x * W, py = p.y * H;
        if (py > H * 0.82) return;
        ctx.strokeStyle = 'rgba(8,6,16,0.40)';
        ctx.beginPath(); ctx.moveTo(px,     py + 2); ctx.lineTo(px + 5, py + 9);  ctx.stroke();
        ctx.beginPath(); ctx.moveTo(px - 3, py + 5); ctx.lineTo(px + 2, py + 14); ctx.stroke();
    });
    ctx.restore();
}

function createMountains() {
    if (document.getElementById('mtn-canvas')) return;
    const canvas = document.createElement('canvas');
    canvas.id = 'mtn-canvas';
    canvas.style.cssText = 'position:fixed;bottom:0;left:0;pointer-events:none;z-index:0;';
    canvas.width  = window.innerWidth;
    canvas.height = Math.round(window.innerHeight * 0.44);
    document.body.appendChild(canvas);
    drawMountainScene(canvas);
    window.addEventListener('resize', () => {
        canvas.width  = window.innerWidth;
        canvas.height = Math.round(window.innerHeight * 0.44);
        drawMountainScene(canvas);
    });
}
