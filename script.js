const crtCanvas = document.getElementById('crt');
const crtCtx = crtCanvas.getContext('2d');

const modeSelectEl = document.getElementById('mode');

const xVoltInput = document.getElementById('vx');
const yVoltInput = document.getElementById('vy');
const xVoltValueEl = document.getElementById('vxVal');
const yVoltValueEl = document.getElementById('vyVal');

const acceleratingVoltageInput = document.getElementById('vacc');
const acceleratingVoltageValueEl = document.getElementById('vaccVal');

const latencyInput = document.getElementById('lat');
const latencyValueEl = document.getElementById('latVal');

const sineControlsEl = document.getElementById('sineControls');
const manualControlsEl = document.getElementById('manualControls');

const freqXInput = document.getElementById('fx');
const freqYInput = document.getElementById('fy');
const freqXValueEl = document.getElementById('fxVal');
const freqYValueEl = document.getElementById('fyVal');

const phaseInput = document.getElementById('phase');
const phaseValueEl = document.getElementById('phaseVal');

const maxVoltageInput = document.getElementById('vm');
const maxVoltageValueEl = document.getElementById('vmVal');

const ratioPresetsEl = document.getElementById('ratioPresets');
const phasePresetsEl = document.getElementById('phasePresets');

const crtWrap = document.getElementById('crt-wrap');

function setCanvasSizeToContainer() {
    const deviceRatio = window.devicePixelRatio || 1;
    const wrapRect = crtWrap.getBoundingClientRect();
    const sizePx = Math.max(64, Math.min(wrapRect.width, wrapRect.height));
    crtCanvas.style.width = sizePx + 'px';
    crtCanvas.style.height = sizePx + 'px';
    crtCanvas.width = Math.round(sizePx * deviceRatio);
    crtCanvas.height = Math.round(sizePx * deviceRatio);
    crtCtx.setTransform(deviceRatio, 0, 0, deviceRatio, 0, 0);
}

setCanvasSizeToContainer();

let deviceRatio = window.devicePixelRatio || 1;
let canvasWidth = crtCanvas.width / deviceRatio;
let canvasHeight = crtCanvas.height / deviceRatio;
let maxVoltage = Number(maxVoltageInput.value);

function computePixelsPerVolt() {
    const screenPixels = Math.min(canvasWidth, canvasHeight);
    const maxDisplacementPixels = 0.95 * (screenPixels / 2);
    return maxDisplacementPixels / Math.max(1, maxVoltage);
}

let pixelsPerVolt = computePixelsPerVolt();

let startTimeMs = performance.now();
let lastFrameTimeMs = startTimeMs;

function overlayAlphaFromLatency(latency) {
    return Math.max(0.01, 1 - latency);
}

function hexToRgb(hex) {
    hex = (hex || '').trim().replace('#', '');
    if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
    const val = parseInt(hex || '33FF33', 16);
    return {r: (val >> 16) & 255, g: (val >> 8) & 255, b: val & 255};
}

const accentHex = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#33FF33';
const accentRgb = hexToRgb(accentHex);

function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

function mapVoltageToAngle(voltage, baseDeg, rangeDeg) {
    if (maxVoltage <= 0) return baseDeg;
    return baseDeg + (voltage / Math.max(1, maxVoltage)) * rangeDeg;
}

function getXSliderMax() {
    return Math.max(Math.abs(Number(xVoltInput.min || -1)), Math.abs(Number(xVoltInput.max || 1)));
}

function animateFrame(timestamp) {
    const nowMs = timestamp;
    lastFrameTimeMs = nowMs;
    const elapsedSec = (nowMs - startTimeMs) / 1000;

    maxVoltage = Number(maxVoltageInput.value);
    pixelsPerVolt = computePixelsPerVolt();

    const latency = Number(latencyInput.value || 0);
    const overlayAlpha = overlayAlphaFromLatency(latency);
    crtCtx.fillStyle = `rgba(0,0,0,${overlayAlpha})`;
    crtCtx.fillRect(0, 0, canvasWidth, canvasHeight);

    const mode = modeSelectEl.value;
    let voltageX = Number(xVoltInput.value);
    let voltageY = Number(yVoltInput.value);

    if (mode === 'sine') {

        const fx = Number(freqXInput.value);
        const fy = Number(freqYInput.value);
        const phase = Number(phaseInput.value);
        const normX = Math.sin(2 * Math.PI * fx * elapsedSec);
        const normY = Math.sin(2 * Math.PI * fy * elapsedSec + phase);

        const xSliderMax = getXSliderMax();
        const ySliderMax = Math.max(Math.abs(Number(yVoltInput.min || -1)), Math.abs(Number(yVoltInput.max || 1)));
        voltageX = normX * xSliderMax;
        voltageY = normY * ySliderMax;
    }

    const centerX = canvasWidth / 2;
    const centerY = canvasHeight / 2;

    const beamX = centerX + voltageX * pixelsPerVolt;
    const beamY = centerY - voltageY * pixelsPerVolt;

    const vacc = Number(acceleratingVoltageInput.value);
    const vaccMin = Number(acceleratingVoltageInput.min || 1000);
    const vaccMax = Number(acceleratingVoltageInput.max || 20000);
    const vnorm = (vacc - vaccMin) / (vaccMax - vaccMin);
    const brightness = 0.2 + 0.8 * vnorm;
    const radius = Math.max(1, 2 + 6 * vnorm);

    const outerAlpha = 0.45 * brightness;
    const midAlpha = 0.25 * brightness;
    const coreAlpha = 0.9 * brightness;
    const gradient = crtCtx.createRadialGradient(beamX, beamY, 0, beamX, beamY, radius * 6);
    gradient.addColorStop(0, `rgba(${accentRgb.r},${accentRgb.g},${accentRgb.b},${outerAlpha.toFixed(3)})`);
    gradient.addColorStop(0.3, `rgba(${accentRgb.r},${accentRgb.g},${accentRgb.b},${midAlpha.toFixed(3)})`);
    gradient.addColorStop(1, `rgba(0, 0, 0, 0)`);

    crtCtx.beginPath();
    crtCtx.fillStyle = gradient;
    crtCtx.arc(beamX, beamY, radius * 6, 0, Math.PI * 2);
    crtCtx.fill();

    crtCtx.beginPath();
    crtCtx.fillStyle = `rgba(${accentRgb.r},${accentRgb.g},${accentRgb.b},${coreAlpha.toFixed(3)})`;
    crtCtx.arc(beamX, beamY, radius, 0, Math.PI * 2);
    crtCtx.fill();

    requestAnimationFrame(animateFrame);
}

modeSelectEl.addEventListener('change', () => {
    const mode = modeSelectEl.value;
    if (mode === 'sine') {
        sineControlsEl.style.display = '';
        manualControlsEl.style.display = 'none';
        startTimeMs = performance.now();
    } else {
        sineControlsEl.style.display = 'none';
        manualControlsEl.style.display = '';
    }
});

xVoltInput.addEventListener('input', () => {
    xVoltValueEl.textContent = xVoltInput.value;
});
yVoltInput.addEventListener('input', () => {
    yVoltValueEl.textContent = yVoltInput.value;
});
acceleratingVoltageInput.addEventListener('input', () => {
    acceleratingVoltageValueEl.textContent = acceleratingVoltageInput.value;
});
latencyInput.addEventListener('input', () => {
    latencyValueEl.textContent = latencyInput.value;
});
freqXInput.addEventListener('input', () => {
    freqXValueEl.textContent = Number(freqXInput.value).toFixed(2);
});
freqYInput.addEventListener('input', () => {
    freqYValueEl.textContent = Number(freqYInput.value).toFixed(2);
});
phaseInput.addEventListener('input', () => {
    phaseValueEl.textContent = Number(phaseInput.value).toFixed(2);
});
maxVoltageInput.addEventListener('input', () => {
    maxVoltage = Number(maxVoltageInput.value);
    maxVoltageValueEl.textContent = maxVoltageInput.value;
    pixelsPerVolt = computePixelsPerVolt();
});

ratioPresetsEl.addEventListener('click', (ev) => {
    const btn = ev.target.closest('.preset-btn');
    if (!btn) return;
    ratioPresetsEl.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const r = Number(btn.dataset.r);
    const s = Number(btn.dataset.s);
    const fx = Number(freqXInput.value);
    const newFy = fx * (s / r);
    const fyMin = Number(freqYInput.min);
    const fyMax = Number(freqYInput.max);
    freqYInput.value = Math.min(fyMax, Math.max(fyMin, Number(newFy.toFixed(2))));
    freqYValueEl.textContent = Number(freqYInput.value).toFixed(2);
});

phasePresetsEl.addEventListener('click', (ev) => {
    const btn = ev.target.closest('.preset-btn');
    if (!btn) return;
    phasePresetsEl.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    phaseInput.value = Number(btn.dataset.p);
    phaseValueEl.textContent = Number(phaseInput.value).toFixed(2);
});

function refreshSizes() {
    setCanvasSizeToContainer();
    deviceRatio = window.devicePixelRatio || 1;
    canvasWidth = crtCanvas.width / deviceRatio;
    canvasHeight = crtCanvas.height / deviceRatio;
    pixelsPerVolt = computePixelsPerVolt();
}

window.addEventListener('resize', refreshSizes);
window.matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`).addEventListener?.('change', refreshSizes);

xVoltValueEl.textContent = xVoltInput.value;
yVoltValueEl.textContent = yVoltInput.value;
acceleratingVoltageValueEl.textContent = acceleratingVoltageInput.value;
latencyValueEl.textContent = latencyInput.value;
freqXValueEl.textContent = Number(freqXInput.value || 0).toFixed(2);
freqYValueEl.textContent = Number(freqYInput.value || 0).toFixed(2);
phaseValueEl.textContent = Number(phaseInput.value || 0).toFixed(2);
maxVoltageValueEl.textContent = maxVoltageInput.value;

crtCtx.fillStyle = 'black';
crtCtx.fillRect(0, 0, canvasWidth, canvasHeight);
requestAnimationFrame(animateFrame);

(function () {
    const vistasImageEl = document.getElementById('vistas');
    const vistasOverlayCanvas = document.getElementById('vistas-overlay');
    const vistasCtx = vistasOverlayCanvas.getContext('2d');

    const lateralBeamBaseAngleDeg = 0;
    const lateralBeamAngleRangeDeg = 40;
    const topBeamBaseAngleDeg = 0;
    const topBeamAngleRangeDeg = 40;

    const lateralVistaFrac = {x: 0.24, y: 0.12, w: 0.10, h: 0.31};
    const topVistaFrac = {x: 0.24, y: 0.575, w: 0.10, h: 0.31};

    function degToRad(deg) {
        return deg * Math.PI / 180;
    }

    function setVistasOverlayCanvasSize() {
        const rect = vistasImageEl.getBoundingClientRect();
        const ratio = window.devicePixelRatio || 1;

        vistasOverlayCanvas.style.left = rect.left + 'px';
        vistasOverlayCanvas.style.top = rect.top + 'px';
        vistasOverlayCanvas.style.width = rect.width + 'px';
        vistasOverlayCanvas.style.height = rect.height + 'px';
        vistasOverlayCanvas.style.border = 'none';

        vistasOverlayCanvas.width = Math.max(1, Math.round(rect.width * ratio));
        vistasOverlayCanvas.height = Math.max(1, Math.round(rect.height * ratio));
        vistasCtx.setTransform(ratio, 0, 0, ratio, 0, 0);
    }

    function fracToRect(fraction, totalW, totalH) {
        return {x: fraction.x * totalW, y: fraction.y * totalH, w: fraction.w * totalW, h: fraction.h * totalH};
    }

    function drawBeamLineInRect(context, rect, lateralOffsetPx, angleRad) {
        context.save();

        const pad = Math.max(8, rect.w * 0.04);
        const startX = rect.x + pad;
        const startY = rect.y + rect.h / 2;

        const beamLen = Math.max(rect.w, rect.h) * 0.9;
        const dx = Math.cos(angleRad) * beamLen;
        const dy = Math.sin(angleRad) * beamLen;

        const perpX = -Math.sin(angleRad);
        const perpY = Math.cos(angleRad);

        let endX = startX + dx + perpX * lateralOffsetPx;
        let endY = startY + dy + perpY * lateralOffsetPx;

        const inset = pad + 2;
        endX = clamp(endX, rect.x + inset, rect.x + rect.w - inset);
        endY = clamp(endY, rect.y + inset, rect.y + rect.h - inset);

        context.beginPath();
        context.lineWidth = Math.max(2, Math.min(6, Math.min(rect.w, rect.h) * 0.02));
        context.strokeStyle = `rgba(${accentRgb.r},${accentRgb.g},${accentRgb.b},0.95)`;
        context.lineCap = 'round';
        context.moveTo(startX, startY);
        context.lineTo(endX, endY);
        context.stroke();

        context.globalCompositeOperation = 'lighter';
        const grad = context.createLinearGradient(startX, startY, endX, endY);
        grad.addColorStop(0, 'rgba(0,0,0,0)');
        grad.addColorStop(0.45, `rgba(${accentRgb.r},${accentRgb.g},${accentRgb.b},0.14)`);
        grad.addColorStop(0.5, `rgba(${accentRgb.r},${accentRgb.g},${accentRgb.b},0.22)`);
        grad.addColorStop(0.55, `rgba(${accentRgb.r},${accentRgb.g},${accentRgb.b},0.14)`);
        grad.addColorStop(1, 'rgba(0,0,0,0)');
        context.fillStyle = grad;

        context.restore();
    }

    function drawVistasOverlay(nowMs) {
        const overlayW = vistasOverlayCanvas.width / (window.devicePixelRatio || 1);
        const overlayH = vistasOverlayCanvas.height / (window.devicePixelRatio || 1);

        vistasCtx.clearRect(0, 0, overlayW, overlayH);

        const lateralRect = fracToRect(lateralVistaFrac, overlayW, overlayH);
        const topRect = fracToRect(topVistaFrac, overlayW, overlayH);

        const currentMaxVoltage = Number(maxVoltageInput.value);
        maxVoltage = currentMaxVoltage;

        let voltageX = Number(xVoltInput.value);
        let voltageY = Number(yVoltInput.value);

        let normX = 0;
        let normY = 0;

        if (modeSelectEl.value === 'sine') {
            const elapsedSec = (nowMs - startTimeMs) / 1000;
            const fx = Number(freqXInput.value);
            const fy = Number(freqYInput.value);
            const phase = Number(phaseInput.value);
            normX = Math.sin(2 * Math.PI * fx * elapsedSec);
            normY = Math.sin(2 * Math.PI * fy * elapsedSec + phase);

            const xSliderMax = Math.max(Math.abs(Number(xVoltInput.min || -1)), Math.abs(Number(xVoltInput.max || 1)));
            const ySliderMax = Math.max(Math.abs(Number(yVoltInput.min || -1)), Math.abs(Number(yVoltInput.max || 1)));
            voltageX = normX * xSliderMax;
            voltageY = normY * ySliderMax;
        }

        const pxPerVoltLat = 0.95 * (Math.min(lateralRect.w, lateralRect.h) / 2) / Math.max(1, currentMaxVoltage);
        const pxPerVoltTop = 0.95 * (Math.min(topRect.w, topRect.h) / 2) / Math.max(1, currentMaxVoltage);

        const lateralOffsetPx = voltageY * pxPerVoltLat;
        const topOffsetPx = voltageX * pxPerVoltTop;

        let lateralAngleDeg;
        let topAngleDeg;
        if (modeSelectEl.value === 'sine') {
            lateralAngleDeg = -mapVoltageToAngle(normY, lateralBeamBaseAngleDeg, lateralBeamAngleRangeDeg);
            topAngleDeg = -mapVoltageToAngle(normX, topBeamBaseAngleDeg, topBeamAngleRangeDeg);
        } else {
            lateralAngleDeg = -mapVoltageToAngle(voltageY, lateralBeamBaseAngleDeg, lateralBeamAngleRangeDeg);
            topAngleDeg = -mapVoltageToAngle(voltageX, topBeamBaseAngleDeg, topBeamAngleRangeDeg);
        }

        vistasCtx.save();
        vistasCtx.strokeStyle = 'rgba(255,255,255,0.04)';
        vistasCtx.lineWidth = 1;
        vistasCtx.strokeRect(lateralRect.x, lateralRect.y, lateralRect.w, lateralRect.h);
        vistasCtx.strokeRect(topRect.x, topRect.y, topRect.w, topRect.h);
        vistasCtx.restore();

        drawBeamLineInRect(vistasCtx, lateralRect, lateralOffsetPx, degToRad(lateralAngleDeg));
        drawBeamLineInRect(vistasCtx, topRect, topOffsetPx, degToRad(topAngleDeg));

        requestAnimationFrame(drawVistasOverlay);
    }

    function refreshVistasOverlay() {
        setVistasOverlayCanvasSize();
    }

    vistasImageEl.addEventListener('load', refreshVistasOverlay);
    window.addEventListener('resize', refreshVistasOverlay);
    window.matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`).addEventListener?.('change', refreshVistasOverlay);

    setVistasOverlayCanvasSize();
    requestAnimationFrame(drawVistasOverlay);
})();