function updateClock() {
    const now = new Date();
    const pad = value => String(value).padStart(2, '0');

    const timeEl = document.getElementById('time');
    if (timeEl) timeEl.textContent = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;

    const dateEl = document.getElementById('date');
    if (dateEl) dateEl.textContent = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}
