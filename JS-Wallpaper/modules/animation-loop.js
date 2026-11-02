// Un único requestAnimationFrame para todos los efectos; se detiene solo cuando no quedan tareas.
const AnimationLoop = (() => {
    const tasks = new Set();
    let rafId = null;

    function frame() {
        tasks.forEach(task => task());
        rafId = tasks.size > 0 ? requestAnimationFrame(frame) : null;
    }

    return {
        add(task) {
            tasks.add(task);
            if (rafId === null) rafId = requestAnimationFrame(frame);
            return () => tasks.delete(task);
        },
    };
})();

function createOverlayCanvas(zIndex) {
    const canvas = document.createElement('canvas');
    canvas.style.cssText = `position:fixed;top:0;left:0;pointer-events:none;z-index:${zIndex};`;
    const fit = () => {
        canvas.width  = window.innerWidth;
        canvas.height = window.innerHeight;
    };
    fit();
    window.addEventListener('resize', fit);
    document.body.appendChild(canvas);
    return {
        canvas,
        ctx: canvas.getContext('2d'),
        destroy() {
            window.removeEventListener('resize', fit);
            canvas.remove();
        },
    };
}

// setup(layer) devuelve { tick?, dispose? }; tick corre en el loop central.
function createCanvasEffect(zIndex, setup) {
    let layer = null;
    let removeTick = null;
    let dispose = null;

    return {
        start() {
            if (layer) return;
            layer = createOverlayCanvas(zIndex);
            const simulation = setup(layer);
            dispose = simulation.dispose || null;
            if (simulation.tick) removeTick = AnimationLoop.add(simulation.tick);
        },
        stop() {
            if (!layer) return;
            if (removeTick) removeTick();
            if (dispose) dispose();
            layer.destroy();
            layer = null;
            removeTick = null;
            dispose = null;
        },
    };
}
