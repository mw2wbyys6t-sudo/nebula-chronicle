import { ref } from 'vue';

let audioCtx = null;
let masterGain = null;
let analyser = null;
let dataArray = null;
let isPlaying = ref(false);
let isMuted = ref(false);

let chordOscillators = [];
let arpInterval = null;
let chordInterval = null;
let arpNodes = [];
let reverbNode = null;

// 动漫感空灵感：I - V - vi - IV 进行（C大调）
const CHORD_PROGRESSION = [
  { root: 261.63, name: 'C' },   // C4
  { root: 392.00, name: 'G' },   // G4
  { root: 329.63, name: 'Am' },  // A4
  { root: 349.23, name: 'F' }    // F4
];

const CHORD_INTERVAL = 6000; // 6 秒换一个和弦
const ARP_INTERVAL = 0.38;   // 琶音速度

function createReverb() {
  if (!audioCtx) return null;
  const convolver = audioCtx.createConvolver();
  const rate = audioCtx.sampleRate;
  const length = rate * 2.5;
  const impulse = audioCtx.createBuffer(2, length, rate);

  for (let channel = 0; channel < 2; channel++) {
    const data = impulse.getChannelData(channel);
    for (let i = 0; i < length; i++) {
      const decay = Math.pow(1 - i / length, 2.5);
      data[i] = (Math.random() * 2 - 1) * decay * 0.6;
    }
  }

  convolver.buffer = impulse;
  return convolver;
}

function playChord(chord, startTime, duration) {
  if (!audioCtx || !masterGain) return;

  const frequencies = [
    chord.root,
    chord.root * 1.25,   // 大三度/小三度会由和弦类型决定，这里简化为五和弦
    chord.root * 1.5     // 纯五度
  ];

  const chordGain = audioCtx.createGain();
  chordGain.gain.setValueAtTime(0, startTime);
  chordGain.gain.linearRampToValueAtTime(0.045, startTime + 1.2);
  chordGain.gain.setValueAtTime(0.045, startTime + duration - 1.5);
  chordGain.gain.linearRampToValueAtTime(0, startTime + duration);

  const filter = audioCtx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 1200;
  filter.Q.value = 1;

  chordGain.connect(filter);
  filter.connect(reverbNode || masterGain);
  if (reverbNode) filter.connect(masterGain);

  const oscRefs = [];
  frequencies.forEach((freq, i) => {
    const osc = audioCtx.createOscillator();
    osc.type = i === 0 ? 'sine' : 'triangle';
    osc.frequency.value = freq;

    const panner = audioCtx.createStereoPanner();
    panner.pan.value = (i - 1) * 0.4;

    osc.connect(panner);
    panner.connect(chordGain);
    osc.start(startTime);
    osc.stop(startTime + duration + 0.5);
    chordOscillators.push(osc);
    oscRefs.push(osc);
  });

  // 自动清理
  setTimeout(() => {
    chordOscillators = chordOscillators.filter(o => !oscRefs.includes(o));
  }, Math.max(0, (startTime - audioCtx.currentTime + duration + 1) * 1000));
}

function playArpNote(freq, time) {
  if (!audioCtx || !masterGain) return;

  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  const filter = audioCtx.createBiquadFilter();

  osc.type = 'sine';
  osc.frequency.value = freq;

  filter.type = 'lowpass';
  filter.frequency.value = 2000;
  filter.Q.value = 2;

  gain.gain.setValueAtTime(0, time);
  gain.gain.linearRampToValueAtTime(0.025, time + 0.05);
  gain.gain.exponentialRampToValueAtTime(0.001, time + 0.35);

  osc.connect(filter);
  filter.connect(gain);
  gain.connect(reverbNode || masterGain);
  if (reverbNode) gain.connect(masterGain);

  osc.start(time);
  osc.stop(time + 0.4);

  arpNodes.push(osc, gain, filter);
  setTimeout(() => {
    arpNodes = arpNodes.filter(n => n !== osc && n !== gain && n !== filter);
  }, 600);
}

function startArpeggio() {
  if (!audioCtx) return;
  if (arpInterval) clearInterval(arpInterval);

  let chordIndex = 0;
  let noteIndex = 0;
  const patterns = [
    [1, 3, 5, 8, 5, 3],
    [1, 5, 8, 10, 8, 5],
    [1, 3, 6, 8, 6, 3],
    [1, 4, 6, 8, 6, 4]
  ];

  const schedule = () => {
    if (!isPlaying.value || isMuted.value) return;

    const chord = CHORD_PROGRESSION[chordIndex];
    const pattern = patterns[chordIndex];
    const degree = pattern[noteIndex % pattern.length];
    const freq = chord.root * (1 + (degree - 1) * 0.12);

    playArpNote(freq * 2, audioCtx.currentTime + 0.02);

    noteIndex++;
    if (noteIndex % pattern.length === 0) {
      chordIndex = (chordIndex + 1) % CHORD_PROGRESSION.length;
    }
  };

  arpInterval = setInterval(schedule, ARP_INTERVAL * 1000);
}

function startChordLoop() {
  if (!audioCtx) return;
  // 先清掉旧 interval，避免热重载或重复 init 叠加
  if (chordInterval) clearInterval(chordInterval);

  let index = 0;
  const nextChord = () => {
    if (!isPlaying.value || isMuted.value) return;
    const chord = CHORD_PROGRESSION[index % CHORD_PROGRESSION.length];
    playChord(chord, audioCtx.currentTime, CHORD_INTERVAL / 1000);
    index++;
  };

  nextChord();
  chordInterval = setInterval(nextChord, CHORD_INTERVAL);
}

export function useAudio() {
  const init = async () => {
    if (audioCtx) return;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      audioCtx = new AudioContext();

      masterGain = audioCtx.createGain();
      masterGain.gain.value = 0.55;

      analyser = audioCtx.createAnalyser();
      analyser.fftSize = 64;
      dataArray = new Uint8Array(analyser.frequencyBinCount);

      reverbNode = createReverb();

      masterGain.connect(analyser);
      analyser.connect(audioCtx.destination);

      if (audioCtx.state === 'suspended') {
        await audioCtx.resume();
      }

      startChordLoop();
      startArpeggio();
      isPlaying.value = true;
    } catch (e) {
      // 静默失败，音频为非核心功能
    }
  };

  const toggle = async () => {
    if (!audioCtx) {
      await init();
      return;
    }
    if (audioCtx.state === 'suspended') {
      await audioCtx.resume();
      isMuted.value = false;
      isPlaying.value = true;
      // 恢复播放时重启 interval
      if (!arpInterval) startArpeggio();
      if (!chordInterval) startChordLoop();
    } else if (audioCtx.state === 'running') {
      await audioCtx.suspend();
      isMuted.value = true;
      isPlaying.value = false;
      // 静音时清除 interval，避免空转
      if (arpInterval) { clearInterval(arpInterval); arpInterval = null; }
      if (chordInterval) { clearInterval(chordInterval); chordInterval = null; }
    }
  };

  const setVolume = (v) => {
    if (masterGain) {
      masterGain.gain.value = Math.max(0, Math.min(1, v));
    }
  };

  const getLevel = () => {
    if (!analyser || !dataArray) return 0;
    analyser.getByteFrequencyData(dataArray);
    const sum = dataArray.reduce((a, b) => a + b, 0);
    return sum / dataArray.length / 255;
  };

  const getFreqBands = () => {
    if (!analyser || !dataArray) return { low: 0, mid: 0, high: 0 };
    analyser.getByteFrequencyData(dataArray);
    const len = dataArray.length;
    const lowEnd = Math.floor(len * 0.25);
    const midEnd = Math.floor(len * 0.6);
    const low = dataArray.slice(0, lowEnd).reduce((a, b) => a + b, 0) / lowEnd / 255;
    const mid = dataArray.slice(lowEnd, midEnd).reduce((a, b) => a + b, 0) / (midEnd - lowEnd) / 255;
    const high = dataArray.slice(midEnd).reduce((a, b) => a + b, 0) / (len - midEnd) / 255;
    return { low, mid, high };
  };

  const dispose = () => {
    try {
      if (arpInterval) clearInterval(arpInterval);
      if (chordInterval) clearInterval(chordInterval);
      chordOscillators.forEach(o => { try { o.stop(); o.disconnect(); } catch (e) {} });
      arpNodes.forEach(n => { try { n.stop?.(); n.disconnect?.(); } catch (e) {} });
      masterGain?.disconnect?.();
      analyser?.disconnect?.();
      reverbNode?.disconnect?.();
      audioCtx?.close?.();
    } catch (e) {
      // ignore
    }
    audioCtx = null;
    masterGain = null;
    analyser = null;
    dataArray = null;
    chordOscillators = [];
    arpNodes = [];
    reverbNode = null;
    isPlaying.value = false;
    isMuted.value = false;
  };

  return { init, toggle, setVolume, getLevel, getFreqBands, isPlaying, dispose };
}
