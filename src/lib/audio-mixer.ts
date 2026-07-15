import { useCallback, useEffect, useRef, useState } from "react";
import { getBackgroundBuffer, type SoundId } from "./background-sounds";
import { audioBufferToWav } from "./wav-encoder";

export type VoiceFormat = "whisper" | "normal" | "accelerated";

export type MixerConfig = {
  sound: SoundId;
  frequency: number;
  format: VoiceFormat;
  voiceVol: number; // 0-100
  bgVol: number;
  freqVol: number;
  durationMin: number;
};

type State = "idle" | "loading" | "ready" | "playing" | "paused";

function whisperFreqFor(format: VoiceFormat) {
  return format === "whisper" ? 500 : 20;
}
function rateFor(format: VoiceFormat) {
  return format === "accelerated" ? 2 : 1;
}

export function useAudioMixer() {
  const [state, setState] = useState<State>("idle");
  const [progress, setProgress] = useState(0); // 0..1 vs duration

  const ctxRef = useRef<AudioContext | null>(null);
  const masterRef = useRef<GainNode | null>(null);
  const bgGainRef = useRef<GainNode | null>(null);
  const oscGainRef = useRef<GainNode | null>(null);
  const voiceGainRef = useRef<GainNode | null>(null);
  const filterRef = useRef<BiquadFilterNode | null>(null);
  const oscRef = useRef<OscillatorNode | null>(null);
  const bgSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);

  const voiceBuffersRef = useRef<AudioBuffer[]>([]);
  const voiceIdxRef = useRef(0);
  const nextVoiceTimerRef = useRef<number | null>(null);
  const scheduledEndRef = useRef(0);

  const configRef = useRef<MixerConfig>({
    sound: "rain",
    frequency: 432,
    format: "normal",
    voiceVol: 45,
    bgVol: 70,
    freqVol: 20,
    durationMin: 5,
  });

  const startedAtRef = useRef(0);
  const pausedElapsedRef = useRef(0);

  const ensureCtx = useCallback(() => {
    if (!ctxRef.current) {
      const AC = (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext);
      ctxRef.current = new AC();
    }
    return ctxRef.current;
  }, []);

  const buildGraph = useCallback(() => {
    const ctx = ensureCtx();
    const cfg = configRef.current;

    // Master
    const master = ctx.createGain();
    master.gain.value = 0.85;
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 128;
    master.connect(analyser);
    analyser.connect(ctx.destination);
    masterRef.current = master;
    analyserRef.current = analyser;

    // Background
    const bgGain = ctx.createGain();
    bgGain.gain.value = cfg.bgVol / 100;
    bgGain.connect(master);
    bgGainRef.current = bgGain;
    const bgSource = ctx.createBufferSource();
    bgSource.buffer = getBackgroundBuffer(ctx, cfg.sound);
    bgSource.loop = true;
    bgSource.connect(bgGain);
    bgSourceRef.current = bgSource;

    // Oscillator (binaural-ish tone)
    const oscGain = ctx.createGain();
    oscGain.gain.value = (cfg.freqVol / 100) * 0.15;
    oscGain.connect(master);
    oscGainRef.current = oscGain;
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.value = cfg.frequency;
    osc.connect(oscGain);
    oscRef.current = osc;

    // Voice chain: [source] -> filter (highpass) -> voiceGain -> master
    const voiceGain = ctx.createGain();
    voiceGain.gain.value = cfg.voiceVol / 100;
    voiceGain.connect(master);
    voiceGainRef.current = voiceGain;

    const filter = ctx.createBiquadFilter();
    filter.type = "highpass";
    filter.frequency.value = whisperFreqFor(cfg.format);
    filter.Q.value = 0.7;
    filter.connect(voiceGain);
    filterRef.current = filter;
  }, [ensureCtx]);

  const scheduleNextVoice = useCallback((startAt: number) => {
    const ctx = ctxRef.current;
    const filter = filterRef.current;
    if (!ctx || !filter) return;
    const buffers = voiceBuffersRef.current;
    if (buffers.length === 0) return;
    const cfg = configRef.current;
    const buf = buffers[voiceIdxRef.current % buffers.length];
    voiceIdxRef.current++;

    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.playbackRate.value = rateFor(cfg.format);
    src.connect(filter);
    src.start(startAt);

    const gap = 0.35; // seconds between affirmations
    const durationOnCtx = buf.duration / rateFor(cfg.format);
    const nextAt = startAt + durationOnCtx + gap;
    scheduledEndRef.current = nextAt;

    src.onended = () => {
      if (state === "playing" || state === "ready" || state === "paused") {
        // schedule next only if context still running
        const c = ctxRef.current;
        if (!c) return;
        if (c.state !== "running") return;
        scheduleNextVoice(Math.max(c.currentTime, nextAt));
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const generate = useCallback(async (
    config: MixerConfig,
    voiceBuffers: AudioBuffer[],
  ) => {
    setState("loading");
    // Tear down previous
    stopAll();
    configRef.current = { ...config };
    voiceBuffersRef.current = voiceBuffers;
    voiceIdxRef.current = 0;

    const ctx = ensureCtx();
    if (ctx.state === "suspended") await ctx.resume().catch(() => {});
    buildGraph();

    const start = ctx.currentTime + 0.1;
    bgSourceRef.current?.start(start);
    oscRef.current?.start(start);
    scheduleNextVoice(start);

    startedAtRef.current = ctx.currentTime;
    pausedElapsedRef.current = 0;
    setState("playing");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [buildGraph, ensureCtx]);

  const play = useCallback(async () => {
    const ctx = ctxRef.current;
    if (!ctx) return;
    await ctx.resume().catch(() => {});
    setState("playing");
  }, []);

  const pause = useCallback(async () => {
    const ctx = ctxRef.current;
    if (!ctx) return;
    await ctx.suspend().catch(() => {});
    setState("paused");
  }, []);

  const stopAll = useCallback(() => {
    try { bgSourceRef.current?.stop(); } catch {}
    try { oscRef.current?.stop(); } catch {}
    if (nextVoiceTimerRef.current) {
      clearTimeout(nextVoiceTimerRef.current);
      nextVoiceTimerRef.current = null;
    }
    bgSourceRef.current = null;
    oscRef.current = null;
    // keep ctx alive for later use
  }, []);

  const stop = useCallback(() => {
    stopAll();
    setState("idle");
  }, [stopAll]);

  const setVoiceVol = useCallback((v: number) => {
    configRef.current.voiceVol = v;
    if (voiceGainRef.current) voiceGainRef.current.gain.value = v / 100;
  }, []);
  const setBgVol = useCallback((v: number) => {
    configRef.current.bgVol = v;
    if (bgGainRef.current) bgGainRef.current.gain.value = v / 100;
  }, []);
  const setFreqVol = useCallback((v: number) => {
    configRef.current.freqVol = v;
    if (oscGainRef.current) oscGainRef.current.gain.value = (v / 100) * 0.15;
  }, []);
  const setFrequency = useCallback((hz: number) => {
    configRef.current.frequency = hz;
    const ctx = ctxRef.current;
    if (oscRef.current && ctx) oscRef.current.frequency.setValueAtTime(hz, ctx.currentTime);
  }, []);
  const setFormat = useCallback((f: VoiceFormat) => {
    configRef.current.format = f;
    const ctx = ctxRef.current;
    if (filterRef.current && ctx) {
      filterRef.current.frequency.setValueAtTime(whisperFreqFor(f), ctx.currentTime);
    }
  }, []);
  const setSound = useCallback((s: SoundId) => {
    configRef.current.sound = s;
    const ctx = ctxRef.current;
    const bgGain = bgGainRef.current;
    if (!ctx || !bgGain) return;
    try { bgSourceRef.current?.stop(); } catch {}
    const src = ctx.createBufferSource();
    src.buffer = getBackgroundBuffer(ctx, s);
    src.loop = true;
    src.connect(bgGain);
    src.start(ctx.currentTime + 0.02);
    bgSourceRef.current = src;
  }, []);

  // progress tick
  useEffect(() => {
    if (state !== "playing") return;
    let raf = 0;
    const tick = () => {
      const ctx = ctxRef.current;
      if (ctx) {
        const elapsed = ctx.currentTime - startedAtRef.current;
        const dur = configRef.current.durationMin * 60;
        const p = Math.min(1, elapsed / dur);
        setProgress(p);
        if (p >= 1) {
          stop();
          return;
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [state, stop]);

  const download = useCallback(async (): Promise<Blob> => {
    const cfg = configRef.current;
    const buffers = voiceBuffersRef.current;
    const sampleRate = 44100;
    const durationSec = Math.max(5, cfg.durationMin * 60);
    const OfflineACtor = (window.OfflineAudioContext ||
      (window as unknown as { webkitOfflineAudioContext: typeof OfflineAudioContext }).webkitOfflineAudioContext);
    const offline = new OfflineACtor(2, Math.floor(sampleRate * durationSec), sampleRate);

    const master = offline.createGain();
    master.gain.value = 0.85;
    master.connect(offline.destination);

    // BG
    const bgGain = offline.createGain();
    bgGain.gain.value = cfg.bgVol / 100;
    bgGain.connect(master);
    const bgSrc = offline.createBufferSource();
    bgSrc.buffer = getBackgroundBuffer(offline, cfg.sound);
    bgSrc.loop = true;
    bgSrc.connect(bgGain);
    bgSrc.start(0);

    // Osc
    const oscGain = offline.createGain();
    oscGain.gain.value = (cfg.freqVol / 100) * 0.15;
    oscGain.connect(master);
    const osc = offline.createOscillator();
    osc.type = "sine";
    osc.frequency.value = cfg.frequency;
    osc.connect(oscGain);
    osc.start(0);
    osc.stop(durationSec);

    // Voice chain
    const voiceGain = offline.createGain();
    voiceGain.gain.value = cfg.voiceVol / 100;
    voiceGain.connect(master);
    const filter = offline.createBiquadFilter();
    filter.type = "highpass";
    filter.frequency.value = whisperFreqFor(cfg.format);
    filter.Q.value = 0.7;
    filter.connect(voiceGain);

    if (buffers.length > 0) {
      const rate = rateFor(cfg.format);
      const gap = 0.35;
      let t = 0.5;
      let idx = 0;
      while (t < durationSec) {
        const buf = buffers[idx % buffers.length];
        idx++;
        const src = offline.createBufferSource();
        src.buffer = buf;
        src.playbackRate.value = rate;
        src.connect(filter);
        src.start(t);
        t += buf.duration / rate + gap;
      }
    }

    const rendered = await offline.startRendering();
    return audioBufferToWav(rendered);
  }, []);

  // cleanup on unmount
  useEffect(() => {
    return () => {
      stopAll();
      ctxRef.current?.close().catch(() => {});
      ctxRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    state,
    progress,
    generate,
    play,
    pause,
    stop,
    setVoiceVol,
    setBgVol,
    setFreqVol,
    setFrequency,
    setFormat,
    setSound,
    download,
    analyserRef,
  };
}
