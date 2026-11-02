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

function strikeBolt(canvas, ctx) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const x    = Math.random() * canvas.width * 0.7 + canvas.width * 0.15;
    const yEnd = canvas.height * (0.55 + Math.random() * 0.35);

    ctx.strokeStyle = `rgba(200, 220, 255, ${(Math.random() * 0.35 + 0.45).toFixed(2)})`;
    ctx.lineWidth   = Math.random() * 1.5 + 0.5;
    ctx.shadowColor = 'rgba(180, 210, 255, 0.8)';
    ctx.shadowBlur  = 12;
    drawLightningBolt(ctx, x, 0, x + (Math.random() - 0.5) * 200, yEnd, 5);

    if (Math.random() > 0.4) {
        const bx = x + (Math.random() - 0.5) * 80;
        const by = yEnd * (0.3 + Math.random() * 0.35);
        ctx.strokeStyle = `rgba(190, 215, 255, ${(Math.random() * 0.2 + 0.25).toFixed(2)})`;
        ctx.lineWidth   = Math.random() * 0.8 + 0.3;
        drawLightningBolt(ctx, bx, by, bx + (Math.random() - 0.5) * 120, by + yEnd * 0.3, 4);
    }
}

const BoltEffect = createCanvasEffect(1, ({ canvas, ctx }) => {
    const timers = new Set();
    let stopped = false;

    function later(callback, delay) {
        const id = setTimeout(() => {
            timers.delete(id);
            callback();
        }, delay);
        timers.add(id);
    }

    function scheduleStrike(delay) {
        later(() => {
            if (stopped) return;
            strikeBolt(canvas, ctx);
            later(() => ctx.clearRect(0, 0, canvas.width, canvas.height), 120);
            scheduleStrike(Math.random() * 8000 + 3000);
        }, delay);
    }

    scheduleStrike(Math.random() * 5000 + 2000);

    return {
        dispose() {
            stopped = true;
            timers.forEach(clearTimeout);
            timers.clear();
        },
    };
});

const StormFlash = (() => {
    let timer = null;

    function flashOnce() {
        const el = document.createElement('div');
        el.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(255,255,220,0.72);z-index:2000;pointer-events:none;';
        document.body.appendChild(el);
        const animation = el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 220, easing: 'ease-out' });
        animation.onfinish = () => el.remove();
    }

    function schedule() {
        timer = setTimeout(() => {
            flashOnce();
            schedule();
        }, Math.random() * 7000 + 3000);
    }

    return {
        start() {
            if (timer !== null) return;
            schedule();
        },
        stop() {
            clearTimeout(timer);
            timer = null;
        },
    };
})();

const StormEffect = {
    start() {
        RainEffect.start();
        BoltEffect.start();
        StormFlash.start();
    },
    stop() {
        RainEffect.stop();
        BoltEffect.stop();
        StormFlash.stop();
    },
};
