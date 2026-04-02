const AudioContextRef = window.AudioContext || window.webkitAudioContext;
const audioCtx = new AudioContextRef();

const carrierWave = document.getElementById('carrierWave');
const modWave = document.getElementById('modWave');
const modRatio = document.getElementById('modRatio');
const modIndex = document.getElementById('modIndex');
const attack = document.getElementById('attack');
const decay = document.getElementById('decay');
const sustain = document.getElementById('sustain');
const release = document.getElementById('release');
const volume = document.getElementById('volume');
const panic = document.getElementById('panic');
const keysRoot = document.getElementById('keys');

const valueMap = {
  modRatio: document.getElementById('ratioVal'),
  modIndex: document.getElementById('indexVal'),
  attack: document.getElementById('attackVal'),
  decay: document.getElementById('decayVal'),
  sustain: document.getElementById('sustainVal'),
  release: document.getElementById('releaseVal'),
  volume: document.getElementById('volumeVal'),
};

const keyToSemitone = {
  a: 0,
  w: 1,
  s: 2,
  e: 3,
  d: 4,
  f: 5,
  t: 6,
  g: 7,
  y: 8,
  h: 9,
  u: 10,
  j: 11,
  k: 12,
};

const keyNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B', 'C'];
const baseFreq = 261.63; // C4

const master = audioCtx.createGain();
master.gain.value = Number(volume.value);
master.connect(audioCtx.destination);

const activeVoices = new Map();
const downKeys = new Set();
const keyElements = new Map();

function updateReadout() {
  valueMap.modRatio.textContent = Number(modRatio.value).toFixed(2);
  valueMap.modIndex.textContent = Number(modIndex.value).toFixed(0);
  valueMap.attack.textContent = Number(attack.value).toFixed(3);
  valueMap.decay.textContent = Number(decay.value).toFixed(2);
  valueMap.sustain.textContent = Number(sustain.value).toFixed(2);
  valueMap.release.textContent = Number(release.value).toFixed(2);
  valueMap.volume.textContent = Number(volume.value).toFixed(2);
}

function noteFreqFromKey(key) {
  const semitone = keyToSemitone[key];
  return baseFreq * 2 ** (semitone / 12);
}

function ensureRunning() {
  if (audioCtx.state !== 'running') {
    audioCtx.resume();
  }
}

function mkVoice(freq) {
  const carrier = audioCtx.createOscillator();
  const modulator = audioCtx.createOscillator();
  const modGain = audioCtx.createGain();
  const amp = audioCtx.createGain();

  carrier.type = carrierWave.value;
  modulator.type = modWave.value;

  carrier.frequency.value = freq;
  modulator.frequency.value = freq * Number(modRatio.value);
  modGain.gain.value = Number(modIndex.value);

  modulator.connect(modGain);
  modGain.connect(carrier.frequency);

  amp.gain.value = 0;
  carrier.connect(amp);
  amp.connect(master);

  carrier.start();
  modulator.start();

  return { carrier, modulator, modGain, amp };
}

function applyAttackDecay(amp) {
  const now = audioCtx.currentTime;
  const atk = Number(attack.value);
  const dec = Number(decay.value);
  const sus = Number(sustain.value);

  amp.gain.cancelScheduledValues(now);
  amp.gain.setValueAtTime(0, now);
  amp.gain.linearRampToValueAtTime(1, now + atk);
  amp.gain.linearRampToValueAtTime(sus, now + atk + dec);
}

function releaseAndStop(voice) {
  const now = audioCtx.currentTime;
  const rel = Number(release.value);

  voice.amp.gain.cancelScheduledValues(now);
  voice.amp.gain.setValueAtTime(voice.amp.gain.value, now);
  voice.amp.gain.linearRampToValueAtTime(0, now + rel);

  const stopAt = now + rel + 0.03;
  voice.carrier.stop(stopAt);
  voice.modulator.stop(stopAt);
}

function setKeyActive(key, isActive) {
  const el = keyElements.get(key);
  if (el) {
    el.classList.toggle('active', isActive);
  }
}

function noteOn(key) {
  if (activeVoices.has(key)) return;

  ensureRunning();
  const freq = noteFreqFromKey(key);
  const voice = mkVoice(freq);

  applyAttackDecay(voice.amp);
  activeVoices.set(key, voice);
  setKeyActive(key, true);
}

function noteOff(key) {
  const voice = activeVoices.get(key);
  if (!voice) return;

  releaseAndStop(voice);
  activeVoices.delete(key);
  setKeyActive(key, false);
}

function stopAllNotes() {
  [...activeVoices.keys()].forEach((key) => noteOff(key));
}

function renderKeyboard() {
  Object.keys(keyToSemitone).forEach((key) => {
    const semitone = keyToSemitone[key];
    const keyEl = document.createElement('button');
    keyEl.type = 'button';
    keyEl.className = 'key';
    keyEl.innerHTML = `<strong>${key.toUpperCase()}</strong><small>${keyNames[semitone]}</small>`;

    keyEl.addEventListener('pointerdown', () => noteOn(key));
    keyEl.addEventListener('pointerup', () => noteOff(key));
    keyEl.addEventListener('pointerleave', () => noteOff(key));

    keyElements.set(key, keyEl);
    keysRoot.appendChild(keyEl);
  });
}

[modRatio, modIndex, attack, decay, sustain, release, volume].forEach((input) => {
  input.addEventListener('input', () => {
    updateReadout();
    master.gain.setValueAtTime(Number(volume.value), audioCtx.currentTime);

    activeVoices.forEach((voice) => {
      voice.modulator.frequency.setValueAtTime(
        voice.carrier.frequency.value * Number(modRatio.value),
        audioCtx.currentTime,
      );
      voice.modGain.gain.setValueAtTime(Number(modIndex.value), audioCtx.currentTime);
    });
  });
});

window.addEventListener('keydown', (event) => {
  const key = event.key.toLowerCase();
  if (!(key in keyToSemitone)) return;
  if (downKeys.has(key)) return;

  downKeys.add(key);
  noteOn(key);
});

window.addEventListener('keyup', (event) => {
  const key = event.key.toLowerCase();
  if (!(key in keyToSemitone)) return;

  downKeys.delete(key);
  noteOff(key);
});

window.addEventListener('blur', () => {
  downKeys.clear();
  stopAllNotes();
});

panic.addEventListener('click', stopAllNotes);

renderKeyboard();
updateReadout();
