

let mediaDuration = 0;
let mediaPosition = 0;
let mediaActive = false;
let mediaTickInterval = null;

function startMediaTick() {
    if (mediaTickInterval) return;
    mediaTickInterval = setInterval(function() {
        if (!mediaActive || !mediaDuration) return;
        mediaPosition = Math.min(mediaPosition + 1, mediaDuration);
        setField('progress', buildProgressBar(mediaPosition, mediaDuration));
    }, 1000);
}

function stopMediaTick() {
    clearInterval(mediaTickInterval);
    mediaTickInterval = null;
}

function buildProgressBar(position, duration) {
    if (!duration || duration <= 0) return null;
    const width = 10;
    const ratio = Math.min(position / duration, 1);
    const filled = Math.floor(ratio * width);
    const hasArrow = filled < width;
    const bar = '='.repeat(filled) + (hasArrow ? '>' : '') + ' '.repeat(Math.max(0, width - filled - (hasArrow ? 1 : 0)));
    const pos = formatMediaTime(position);
    const dur = formatMediaTime(duration);
    return `[${bar}] ${pos} / ${dur}`;
}

function formatMediaTime(seconds) {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${String(s).padStart(2, '0')}`;
}

const MEDIA_OBJECT_HTML = `<span class='cornflowerblue'>{</span>
        <span class='greenyellow'>track:</span> <span id='track'><span class='mediumpurple'>null</span></span>,
        <span class='greenyellow'>artist:</span> <span id='artist'><span class='mediumpurple'>null</span></span>,
        <span class='greenyellow'>album:</span> <span id='album'><span class='mediumpurple'>null</span></span>,
        <span class='greenyellow'>progress:</span> <span id='progress'><span class='mediumpurple'>null</span></span>
    <span class='cornflowerblue'>}</span>`;

function ensureMediaExpanded() {
    if (!document.getElementById('track')) {
        document.getElementById('media-value').innerHTML = MEDIA_OBJECT_HTML;
    }
}

function clearMedia() {
    stopMediaTick();
    document.getElementById('media-value').innerHTML = "<span class='mediumpurple'>null</span>";
    mediaActive = false;
    mediaDuration = 0;
    mediaPosition = 0;
}

if (window.wallpaperRegisterMediaStatusListener) {
    window.wallpaperRegisterMediaStatusListener(function(e) {
        if (!e.enabled) clearMedia();
    });
}

if (window.wallpaperRegisterMediaPropertiesListener) {
    window.wallpaperRegisterMediaPropertiesListener(function(props) {
        if (!props.title && !props.artist) { clearMedia(); return; }
        mediaActive = true;
        ensureMediaExpanded();
        setField('track', props.title || null);
        setField('artist', props.artist || null);
        setField('album', props.albumTitle || null);
    });
}

if (window.wallpaperRegisterMediaTimelineListener) {
    window.wallpaperRegisterMediaTimelineListener(function(e) {
        mediaPosition = e.position || 0;
        mediaDuration = e.duration || 0;
        if (!mediaActive || !mediaDuration) return;
        ensureMediaExpanded();
        setField('progress', buildProgressBar(mediaPosition, mediaDuration));
        startMediaTick();
    });
}

if (window.wallpaperRegisterMediaPlaybackListener) {
    window.wallpaperRegisterMediaPlaybackListener(function(e) {
        if (e.state === 0) {
            clearMedia();
        } else if (e.state === 2) {
            stopMediaTick();
        } else {
            startMediaTick();
        }
    });
}
