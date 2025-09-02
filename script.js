const canvas = document.getElementById('crt');
const ctx = canvas.getContext('2d');

const modeEl = document.getElementById('mode');
const vxEl = document.getElementById('vx');
const vyEl = document.getElementById('vy');
const vxVal = document.getElementById('vxVal');
const vyVal = document.getElementById('vyVal');
const vaccEl = document.getElementById('vacc');
const vaccVal = document.getElementById('vaccVal');
const latEl = document.getElementById('lat');
const latVal = document.getElementById('latVal');
const sineControls = document.getElementById('sineControls');
const manualControls = document.getElementById('manualControls');
const fxEl = document.getElementById('fx');
const fyEl = document.getElementById('fy');
const fxVal = document.getElementById('fxVal');
const fyVal = document.getElementById('fyVal');
const phaseEl = document.getElementById('phase');
const phaseVal = document.getElementById('phaseVal');
const vmEl = document.getElementById('vm');
const vmVal = document.getElementById('vmVal');
const ratioPresets = document.getElementById('ratioPresets');
const phasePresets = document.getElementById('phasePresets');
const crtWrap = document.getElementById('crt-wrap');

function setCanvasFixedSize() {
    const ratio = window.devicePixelRatio || 1;
    const rect = crtWrap.getBoundingClientRect();
    const size = Math.max(64, Math.min(rect.width, rect.height));
    canvas.style.width = size + 'px';
    canvas.style.height = size + 'px';
    canvas.width = Math.round(size * ratio);
    canvas.height = Math.round(size * ratio);
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
}

setCanvasFixedSize();

let ratio = window.devicePixelRatio || 1;
let W = canvas.width / ratio;
let H = canvas.height / ratio;
let VM = Number(vmEl.value);

function computeScale() {
    const screenPixels = Math.min(W, H);
    const maxDispPixels = 0.95 * (screenPixels / 2);
    return maxDispPixels / VM;
}

let pixelsPerVolt = computeScale();

let startTime = performance.now();
let lastTime = startTime;

function overlayAlphaFromLatency(lat) {
    return Math.max(0.01, 1 - lat);
}

function hexToRgb(hex) {
    hex = (hex || '').trim().replace('#', '');
    if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
    const val = parseInt(hex || '33FF33', 16);
    return {r: (val >> 16) & 255, g: (val >> 8) & 255, b: val & 255};
}

const accentHex = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#33FF33';
const accentRgb = hexToRgb(accentHex);

function drawFrame(t) {
    const now = t;
    lastTime = now;
    const elapsed = (now - startTime) / 1000;

    const lat = Number(latEl.value || 0);
    const overlayAlpha = overlayAlphaFromLatency(lat);
    ctx.fillStyle = `rgba(0,0,0,${overlayAlpha})`;
    ctx.fillRect(0, 0, W, H);

    const mode = modeEl.value;
    let Vx = Number(vxEl.value);
    let Vy = Number(vyEl.value);

    if (mode === 'sine') {
        const fx = Number(fxEl.value);
        const fy = Number(fyEl.value);
        const phase = Number(phaseEl.value);
        Vx = VM * Math.sin(2 * Math.PI * fx * elapsed);
        Vy = VM * Math.sin(2 * Math.PI * fy * elapsed + phase);
    }

    const cx = W / 2;
    const cy = H / 2;
    const x = cx + Vx * pixelsPerVolt;
    const y = cy - Vy * pixelsPerVolt;

    const vacc = Number(vaccEl.value);
    const vaccMin = Number(vaccEl.min || 1000);
    const vaccMax = Number(vaccEl.max || 20000);
    const vnorm = (vacc - vaccMin) / (vaccMax - vaccMin);
    const brightness = 0.2 + 0.8 * vnorm;
    const radius = Math.max(1, 2 + 6 * vnorm);

    const outerAlpha = 0.45 * brightness;
    const midAlpha = 0.25 * brightness;
    const coreAlpha = 0.9 * brightness;
    const grd = ctx.createRadialGradient(x, y, 0, x, y, radius * 6);
    grd.addColorStop(0, `rgba(${accentRgb.r},${accentRgb.g},${accentRgb.b},${outerAlpha.toFixed(3)})`);
    grd.addColorStop(0.3, `rgba(${accentRgb.r},${accentRgb.g},${accentRgb.b},${midAlpha.toFixed(3)})`);
    grd.addColorStop(1, `rgba(0, 0, 0, 0)`);
    ctx.beginPath();
    ctx.fillStyle = grd;
    ctx.arc(x, y, radius * 6, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.fillStyle = `rgba(${accentRgb.r},${accentRgb.g},${accentRgb.b},${coreAlpha.toFixed(3)})`;
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();

    requestAnimationFrame(drawFrame);
}

modeEl.addEventListener('change', () => {
    const m = modeEl.value;
    if (m === 'sine') {
        sineControls.style.display = '';
        manualControls.style.display = 'none';
        startTime = performance.now();
    } else {
        sineControls.style.display = 'none';
        manualControls.style.display = '';
    }
});

vxEl.addEventListener('input', () => {
    vxVal.textContent = vxEl.value;
});
vyEl.addEventListener('input', () => {
    vyVal.textContent = vyEl.value;
});
vaccEl.addEventListener('input', () => {
    vaccVal.textContent = vaccEl.value;
});
latEl.addEventListener('input', () => {
    latVal.textContent = latEl.value;
});
fxEl.addEventListener('input', () => {
    fxVal.textContent = Number(fxEl.value).toFixed(2);
});
fyEl.addEventListener('input', () => {
    fyVal.textContent = Number(fyEl.value).toFixed(2);
});
phaseEl.addEventListener('input', () => {
    phaseVal.textContent = Number(phaseEl.value).toFixed(2);
});
vmEl.addEventListener('input', () => {
    VM = Number(vmEl.value);
    vmVal.textContent = vmEl.value;
    pixelsPerVolt = computeScale();
});

ratioPresets.addEventListener('click', (ev) => {
    const btn = ev.target.closest('.preset-btn');
    if (!btn) return;
    ratioPresets.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const r = Number(btn.dataset.r);
    const s = Number(btn.dataset.s);
    const fx = Number(fxEl.value);
    const newFy = fx * (s / r);
    const fyMin = Number(fyEl.min);
    const fyMax = Number(fyEl.max);
    fyEl.value = Math.min(fyMax, Math.max(fyMin, Number(newFy.toFixed(2))));
    fyVal.textContent = Number(fyEl.value).toFixed(2);
});

phasePresets.addEventListener('click', (ev) => {
    const btn = ev.target.closest('.preset-btn');
    if (!btn) return;
    phasePresets.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    phaseEl.value = Number(btn.dataset.p);
    phaseVal.textContent = Number(phaseEl.value).toFixed(2);
});

function refreshSizes() {
    setCanvasFixedSize();
    ratio = window.devicePixelRatio || 1;
    W = canvas.width / ratio;
    H = canvas.height / ratio;
    pixelsPerVolt = computeScale();
}

window.addEventListener('resize', refreshSizes);
window.matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`).addEventListener?.('change', refreshSizes);

vxVal.textContent = vxEl.value;
vyVal.textContent = vyEl.value;
vaccVal.textContent = vaccEl.value;
latVal.textContent = latEl.value;
fxVal.textContent = Number(fxEl.value || 0).toFixed(2);
fyVal.textContent = Number(fyEl.value || 0).toFixed(2);
phaseVal.textContent = Number(phaseEl.value || 0).toFixed(2);
vmVal.textContent = vmEl.value;

ctx.fillStyle = 'black';
ctx.fillRect(0, 0, W, H);
requestAnimationFrame(drawFrame);

(function () {
    const vImg = document.getElementById('vistas');
    const vOverlay = document.getElementById('vistas-overlay');
    const vctx = vOverlay.getContext('2d');

    const lateralAngleBaseDeg = 0;
    const lateralAngleRangeDeg = 40;
    const topAngleBaseDeg = 0;
    const topAngleRangeDeg = 4;

    const lateralFrac = {x: 0.24, y: 0.12, w: 0.10, h: 0.31};
    const topFrac = {x: 0.24, y: 0.575, w: 0.10, h: 0.31};

    function degToRad(d) {
        return d * Math.PI / 180;
    }

    function setVistasOverlaySize() {
        const rect = vImg.getBoundingClientRect();
        const ratio = window.devicePixelRatio || 1;

        vOverlay.style.left = rect.left + 'px';
        vOverlay.style.top = rect.top + 'px';
        vOverlay.style.width = rect.width + 'px';
        vOverlay.style.height = rect.height + 'px';
        vOverlay.style.border = 'none';

        vOverlay.width = Math.max(1, Math.round(rect.width * ratio));
        vOverlay.height = Math.max(1, Math.round(rect.height * ratio));
        vctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    }

    function fracToRect(f, W, H) {
        return {x: f.x * W, y: f.y * H, w: f.w * W, h: f.h * H};
    }


    function drawBeamLine(ctx, rect, posOffsetPx, angleRad) {
        ctx.save();


        const pad = Math.max(8, rect.w * 0.04);
        const sx = rect.x + pad;
        const sy = rect.y + rect.h / 2;


        const len = Math.max(rect.w, rect.h) * 0.9;
        const dx = Math.cos(angleRad) * len;
        const dy = Math.sin(angleRad) * len;


        const px = -Math.sin(angleRad);
        const py = Math.cos(angleRad);


        const ex = sx + dx + px * posOffsetPx;
        const ey = sy + dy + py * posOffsetPx;


        ctx.beginPath();
        ctx.lineWidth = Math.max(2, Math.min(6, Math.min(rect.w, rect.h) * 0.02));
        ctx.strokeStyle = `rgba(${accentRgb.r},${accentRgb.g},${accentRgb.b},0.95)`;
        ctx.lineCap = 'round';
        ctx.moveTo(sx, sy);
        ctx.lineTo(ex, ey);
        ctx.stroke();


        ctx.globalCompositeOperation = 'lighter';
        const grad = ctx.createLinearGradient(sx, sy, ex, ey);
        grad.addColorStop(0, 'rgba(0,0,0,0)');
        grad.addColorStop(0.45, `rgba(${accentRgb.r},${accentRgb.g},${accentRgb.b},0.14)`);
        grad.addColorStop(0.5, `rgba(${accentRgb.r},${accentRgb.g},${accentRgb.b},0.22)`);
        grad.addColorStop(0.55, `rgba(${accentRgb.r},${accentRgb.g},${accentRgb.b},0.14)`);
        grad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = grad;

        const glowHalf = Math.max(0, ctx.lineWidth);
        ctx.beginPath();
        ctx.moveTo(sx - px * glowHalf, sy - py * glowHalf);
        ctx.lineTo(ex - px * glowHalf, ey - py * glowHalf);
        ctx.lineTo(ex + px * glowHalf, ey + py * glowHalf);
        ctx.lineTo(sx + px * glowHalf, sy + py * glowHalf);
        ctx.closePath();
        ctx.fill();

        ctx.restore();
    }

    function mapVoltageToAngle(voltage, baseDeg, rangeDeg) {
        if (VM <= 0) return baseDeg;
        return baseDeg + (voltage / VM) * rangeDeg;
    }

    function drawVistas(now) {
        const Wv = vOverlay.width / (window.devicePixelRatio || 1);
        const Hv = vOverlay.height / (window.devicePixelRatio || 1);

        vctx.clearRect(0, 0, Wv, Hv);

        const latRect = fracToRect(lateralFrac, Wv, Hv);
        const topRect = fracToRect(topFrac, Wv, Hv);

        let Vx = Number(vxEl.value);
        let Vy = Number(vyEl.value);

        if (modeEl.value === 'sine') {
            const elapsed = (now - startTime) / 1000;
            const fx = Number(fxEl.value);
            const fy = Number(fyEl.value);
            const phase = Number(phaseEl.value);
            Vx = VM * Math.sin(2 * Math.PI * fx * elapsed);
            Vy = VM * Math.sin(2 * Math.PI * fy * elapsed + phase);
        }

        const pxPerVoltLat = 0.95 * (Math.min(latRect.w, latRect.h) / 2) / Math.max(1, VM);
        const pxPerVoltTop = 0.95 * (Math.min(topRect.w, topRect.h) / 2) / Math.max(1, VM);

        const latOffset = -Vy * pxPerVoltLat;
        const topOffset = Vx * pxPerVoltTop;

        const latAngleDeg = mapVoltageToAngle(Vy, lateralAngleBaseDeg, lateralAngleRangeDeg);
        const topAngleDeg = mapVoltageToAngle(Vx, topAngleBaseDeg, topAngleRangeDeg);

        vctx.save();
        vctx.strokeStyle = 'rgba(255,255,255,0.04)';
        vctx.lineWidth = 1;
        vctx.strokeRect(latRect.x, latRect.y, latRect.w, latRect.h);
        vctx.strokeRect(topRect.x, topRect.y, topRect.w, topRect.h);
        vctx.restore();

        drawBeamLine(vctx, latRect, latOffset, degToRad(latAngleDeg));
        drawBeamLine(vctx, topRect, topOffset, degToRad(topAngleDeg));

        requestAnimationFrame(drawVistas);
    }

    function refreshVistas() {
        setVistasOverlaySize();
    }

    vImg.addEventListener('load', refreshVistas);
    window.addEventListener('resize', refreshVistas);
    window.matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`).addEventListener?.('change', refreshVistas);

    setVistasOverlaySize();
    requestAnimationFrame(drawVistas);
})();