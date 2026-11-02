const RainEffect = createCanvasEffect(10, ({ canvas, ctx }) => {
    const { windSpeedKmph, windDirDegree } = environment;
    const count = Math.min(160 + windSpeedKmph * 1.5, 320);
    const vx = Math.sin(windDirDegree * Math.PI / 180) * Math.min(windSpeedKmph * 0.07, 7);
    const vy = 14;

    const randomX = () => Math.random() * (canvas.width + 200) - 100;
    const drops = Array.from({ length: count }, () => ({
        x:       randomX(),
        y:       Math.random() * canvas.height,
        len:     Math.random() * 12 + 8,
        speed:   Math.random() * 4 + 10,
        opacity: Math.random() * 0.35 + 0.25,
    }));

    ctx.lineCap = 'round';
    ctx.lineWidth = 1;

    return {
        tick() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            drops.forEach(d => {
                ctx.beginPath();
                ctx.moveTo(d.x, d.y);
                ctx.lineTo(d.x + vx * (d.len / vy), d.y + d.len);
                ctx.strokeStyle = `rgba(174, 214, 241, ${d.opacity})`;
                ctx.stroke();

                d.x += vx;
                d.y += d.speed;
                if (d.y > canvas.height + d.len) {
                    d.y = -d.len;
                    d.x = randomX();
                }
                if (d.x > canvas.width + 50) d.x = -50;
                if (d.x < -50)               d.x = canvas.width + 50;
            });
        },
    };
});

const SnowEffect = createCanvasEffect(10, ({ canvas, ctx }) => {
    const { windSpeedKmph, windDirDegree } = environment;
    const windDrift = Math.sin(windDirDegree * Math.PI / 180) * Math.min(windSpeedKmph * 0.06, 5);

    const flakes = Array.from({ length: 110 }, () => ({
        x:     Math.random() * canvas.width,
        y:     Math.random() * canvas.height,
        r:     Math.random() * 3 + 1.5,
        speed: Math.random() * 1.2 + 0.5,
        drift: (Math.random() - 0.5) * 0.6,
        phase: Math.random() * Math.PI * 2,
    }));

    let t = 0;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.82)';

    return {
        tick() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            t += 0.018;
            flakes.forEach(f => {
                ctx.beginPath();
                ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
                ctx.fill();

                f.y += f.speed;
                f.x += f.drift * Math.sin(t + f.phase) + windDrift;
                if (f.y > canvas.height + f.r) {
                    f.y = -f.r;
                    f.x = Math.random() * canvas.width;
                }
                if (f.x > canvas.width + 10) f.x = -10;
                if (f.x < -10)               f.x = canvas.width + 10;
            });
        },
    };
});
