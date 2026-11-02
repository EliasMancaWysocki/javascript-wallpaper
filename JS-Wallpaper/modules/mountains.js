const MOUNTAIN_HEIGHT_RATIO = 0.44;

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

    // Capa lejana — bruma atmosférica (opaca para no transparentar sol/luna)
    _mtnFill(ctx, W, H, _mtnPts.far,
        'rgba(82,75,118,1)', 'rgba(58,52,90,1)');

    // Capa media — opaca para bloquear sol/luna
    _mtnFill(ctx, W, H, _mtnPts.mid,
        'rgba(46,42,72,1)', 'rgba(32,28,56,1)');
    _mtnStroke(ctx, W, H, _mtnPts.mid, 'rgba(62,56,92,0.30)', 0.8);

    // Capa frontal — silueta completamente opaca
    _mtnFill(ctx, W, H, _mtnPts.near,
        'rgba(24,20,40,1)', 'rgba(12,10,22,1)');
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
    // z-index 2: delante del sol/luna (z-index 1) para que queden ocultos detrás
    canvas.style.cssText = 'position:fixed;bottom:0;left:0;pointer-events:none;z-index:2;';
    canvas.width  = window.innerWidth;
    canvas.height = Math.round(window.innerHeight * MOUNTAIN_HEIGHT_RATIO);
    document.body.appendChild(canvas);
    drawMountainScene(canvas);
    window.addEventListener('resize', () => {
        canvas.width  = window.innerWidth;
        canvas.height = Math.round(window.innerHeight * MOUNTAIN_HEIGHT_RATIO);
        drawMountainScene(canvas);
    });
}
