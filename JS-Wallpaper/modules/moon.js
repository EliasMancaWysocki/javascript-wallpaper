// phase: 0=nueva, 0.25=cuarto creciente, 0.5=llena, 0.75=cuarto menguante
function drawMoonPhase(canvas, phase) {
    const ctx = canvas.getContext('2d');
    const s   = canvas.width;
    const r   = s / 2;
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
    canvas.dataset.phase = String(phase);
}
