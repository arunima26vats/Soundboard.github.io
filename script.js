const canvas = document.getElementById("visualizer");
const ctx = canvas.getContext("2d");

/* === UI ELEMENTS === */
const quote = document.querySelector(".quote");
const divider = document.querySelector(".divider");
const buttons = document.querySelectorAll("button");
const muteBtn = document.getElementById("muteBtn");
const volumeSlider = document.getElementById("volume");

/* === Canvas Setup === */
function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
resizeCanvas();
window.addEventListener("resize", resizeCanvas);

/* === Web Audio Setup === */
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
const analyser = audioCtx.createAnalyser();
const gainNode = audioCtx.createGain();

/* Unlock AudioContext on first user interaction */
document.addEventListener(
  "click",
  () => {
    if (audioCtx.state === "suspended") {
      audioCtx.resume();
    }
  },
  { once: true }
);

analyser.fftSize = 2048;
analyser.smoothingTimeConstant = 0.85;
gainNode.gain.value = 0.6;

gainNode.connect(analyser);
analyser.connect(audioCtx.destination);

const bufferLength = analyser.frequencyBinCount;
const timeData = new Uint8Array(bufferLength);
const freqData = new Uint8Array(bufferLength);

/* === LOCAL SOUNDS === */
const sounds = {
  kick: "kick.wav",
  clap: "clap.wav",
  pop: "pop.wav",
  synth: "synth.wav",
  dog: "dog.wav",
  cat: "cat.wav",
};

let currentSource = null;

/* === MUTE STATE === */
let isMuted = false;
let lastVolume = gainNode.gain.value;

/* === Grid State === */
let gridOffset = 0;

/* === Play Sound === */
async function playSound(type) {
  try {
    if (audioCtx.state === "suspended") await audioCtx.resume();

    if (currentSource) {
      try { currentSource.stop(); } catch {}
    }

    const res = await fetch(sounds[type]);
    const buffer = await audioCtx.decodeAudioData(await res.arrayBuffer());

    const source = audioCtx.createBufferSource();
    source.buffer = buffer;
    source.connect(gainNode);
    source.start();
    currentSource = source;

    const btn = document.querySelector(`button[data-sound="${type}"]`);
    btn.classList.add("active");
    setTimeout(() => btn.classList.remove("active"), 160);
  } catch (err) {
    console.error("Audio playback failed:", err);
  }
}

/* === Button Events === */
buttons.forEach(btn =>
  btn.addEventListener("click", () => playSound(btn.dataset.sound))
);

/* === Volume Control === */
volumeSlider.addEventListener("input", (e) => {
  gainNode.gain.value = e.target.value;
  lastVolume = e.target.value;

  if (e.target.value > 0) {
    isMuted = false;
    muteBtn.textContent = "MUTE";
    muteBtn.classList.remove("muted");
  }
});

/* === Mute Button === */
muteBtn.addEventListener("click", () => {
  isMuted = !isMuted;

  if (isMuted) {
    lastVolume = gainNode.gain.value;
    gainNode.gain.value = 0;
    muteBtn.textContent = "UNMUTE";
    muteBtn.classList.add("muted");
  } else {
    gainNode.gain.value = lastVolume || 0.6;
    muteBtn.textContent = "MUTE";
    muteBtn.classList.remove("muted");
  }
});

/* === Grid Drawing === */
function drawGrid(bass) {
  const spacing = 80;
  const speed = 0.12 + bass * 0.3;
  gridOffset += speed;

  ctx.save();
  ctx.strokeStyle = "rgba(243, 237, 237, 0.04)";
  ctx.lineWidth = 0.8;
  ctx.shadowBlur = 0;

  for (let x = -spacing + (gridOffset % spacing); x < canvas.width; x += spacing) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, canvas.height);
    ctx.stroke();
  }

  for (let y = -spacing + (gridOffset % spacing); y < canvas.height; y += spacing) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(canvas.width, y);
    ctx.stroke();
  }

  ctx.restore();
}

/* === Render Loop === */
function draw() {
  requestAnimationFrame(draw);

  analyser.getByteTimeDomainData(timeData);
  analyser.getByteFrequencyData(freqData);

  /* Bass detection */
  let bassSum = 0;
  const bassRange = Math.floor(bufferLength * 0.1);
  for (let i = 0; i < bassRange; i++) bassSum += freqData[i];
  const bass = bassSum / bassRange / 255;

  /* Background */
  ctx.fillStyle = "rgba(0,0,0,0.18)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  drawGrid(bass);

  /* WAVEFORM */
  ctx.lineWidth = 1 + bass * 1.2;
  ctx.strokeStyle = "#d36a1f";
  ctx.shadowBlur = 18;
  ctx.shadowColor = "#d36a1f";

  ctx.beginPath();
  const sliceWidth = canvas.width / bufferLength;
  let x = 0;

  for (let i = 0; i < bufferLength; i++) {
    const v = timeData[i] / 128;
    const y = (v * canvas.height) / 2;
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    x += sliceWidth;
  }

  ctx.stroke();
  ctx.shadowBlur = 0;

  /* Quote reaction */
  if (quote) {
    quote.style.opacity = 0.75 + bass * 0.25;
    quote.style.textShadow = `
      0 0 ${12 + bass * 20}px rgba(211,106,31,0.6),
      0 0 ${30 + bass * 40}px rgba(211,106,31,0.3)
    `;
  }

  /* Divider reaction */
  if (divider) {
    divider.style.height = `${2 + bass * 6}px`;
    divider.style.boxShadow = `0 0 ${20 + bass * 50}px rgba(211,106,31,0.7)`;
  }
}

draw();

