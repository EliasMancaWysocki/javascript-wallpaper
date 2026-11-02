const CLOUD_FADE_SPEED = 0.08;
const CLOUD_DIMMED_ALPHA = 0.1;
const CLOUD_TEXT_MARGIN = 50;

function buildCloud(canvasWidth, canvasHeight, moveRight) {
    const w  = Math.random() * 140 + 160;
    const h  = w * (Math.random() * 0.18 + 0.42);
    const op = Math.random() * 0.25 + 0.65;
    return {
        x: moveRight ? -w - 20 : canvasWidth + 20,
        y: Math.random() * canvasHeight * 0.55,
        w,
        h,
        fade: 1,
        body: `rgba(195, 215, 238, ${op})`,
        // Se pintan de atrás hacia adelante, igual que las sombras CSS que reemplazan.
        lobes: [
            { dx: -w * 0.10, dy: -h * 0.18, spread: h * 0.08, color: `rgba(208, 220, 242, ${op * 0.88})` },
            { dx:  w * 0.58, dy: -h * 0.18, spread: h * 0.10, color: `rgba(205, 222, 242, ${op * 0.92})` },
            { dx:  w * 0.28, dy: -h * 0.28, spread: h * 0.15, color: `rgba(210, 225, 245, ${op})` },
        ],
    };
}

function paintCloud(ctx, cloud) {
    const centerX = cloud.x + cloud.w / 2;
    const centerY = cloud.y + cloud.h / 2;
    const paintBlob = (dx, dy, spread, color) => {
        ctx.beginPath();
        ctx.ellipse(centerX + dx, centerY + dy, cloud.w / 2 + spread, cloud.h / 2 + spread, 0, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
    };
    ctx.globalAlpha = cloud.fade;
    cloud.lobes.forEach(lobe => paintBlob(lobe.dx, lobe.dy, lobe.spread, lobe.color));
    paintBlob(0, 0, 0, cloud.body);
}

const CloudEffect = createCanvasEffect(1, layer => {
    const { canvas, ctx } = layer;
    const { windSpeedKmph, windDirDegree } = environment;
    const moveRight     = Math.sin(windDirDegree * Math.PI / 180) >= 0;
    const speed         = (0.4 + windSpeedKmph * 0.025) * (moveRight ? 1 : -1);
    const spawnInterval = Math.max(1500, 5500 - windSpeedKmph * 65);

    canvas.style.filter = 'blur(2px)';

    let clouds = [];
    const spawn = () => clouds.push(buildCloud(canvas.width, canvas.height, moveRight));

    // Spawn inicial para que no arranque la pantalla vacía.
    const initialTimers = [0, 1].map(i => setTimeout(spawn, i * (spawnInterval / 2)));
    const spawnTimer = setInterval(spawn, spawnInterval);

    return {
        tick() {
            const textBounds = TextBounds.get();
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            clouds = clouds.filter(cloud => moveRight
                ? cloud.x <= canvas.width + 20
                : cloud.x >= -cloud.w - 20);

            clouds.forEach(cloud => {
                cloud.x += speed;
                const box = { left: cloud.x, right: cloud.x + cloud.w, top: cloud.y, bottom: cloud.y + cloud.h };
                const target = overlaps(box, textBounds, CLOUD_TEXT_MARGIN) ? CLOUD_DIMMED_ALPHA : 1;
                cloud.fade += (target - cloud.fade) * CLOUD_FADE_SPEED;
                paintCloud(ctx, cloud);
            });
            ctx.globalAlpha = 1;
        },
        dispose() {
            initialTimers.forEach(clearTimeout);
            clearInterval(spawnTimer);
        },
    };
});
