const NULL_LITERAL_HTML = "<span class='mediumpurple'>null</span>";

function setField(id, value) {
    const el = document.getElementById(id);
    if (!el) return;
    if (value === null || value === undefined || value === '') {
        el.innerHTML = NULL_LITERAL_HTML;
        return;
    }
    const safe = String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;');
    el.innerHTML = `<span class='sandybrown'>"${safe}"</span>`;
}

function overlaps(a, b, margin) {
    return a.left < b.right + margin && a.right > b.left - margin &&
           a.top  < b.bottom + margin && a.bottom > b.top - margin;
}

// El rect se cachea: leerlo por frame y por partícula fuerza un layout cada vez.
const TextBounds = (() => {
    let rect = null;
    function refresh() {
        rect = document.getElementById('container').getBoundingClientRect();
    }
    return {
        refresh,
        get() {
            if (!rect) refresh();
            return rect;
        },
    };
})();
