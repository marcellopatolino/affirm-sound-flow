// Placeholder background "sounds" generated programmatically until real MP3s
// are uploaded. Returns cached AudioBuffers per sound id + AudioContext.

export type SoundId = "rain" | "ocean" | "forest" | "white" | "brown" | "pink";

export const SOUND_IDS: SoundId[] = ["rain", "ocean", "forest", "white", "brown", "pink"];

const cache = new WeakMap<BaseAudioContext, Map<SoundId, AudioBuffer>>();

export function getBackgroundBuffer(ctx: BaseAudioContext, id: SoundId): AudioBuffer {
  let byCtx = cache.get(ctx);
  if (!byCtx) {
    byCtx = new Map();
    cache.set(ctx, byCtx);
  }
  const existing = byCtx.get(id);
  if (existing) return existing;
  const buf = generateSound(ctx, id);
  byCtx.set(id, buf);
  return buf;
}

function generateSound(ctx: BaseAudioContext, id: SoundId): AudioBuffer {
  const sampleRate = ctx.sampleRate;
  const durationSec = 6; // loops seamlessly
  const length = Math.floor(sampleRate * durationSec);
  const buffer = ctx.createBuffer(2, length, sampleRate);

  for (let ch = 0; ch < 2; ch++) {
    const data = buffer.getChannelData(ch);
    switch (id) {
      case "white":
        for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * 0.4;
        break;
      case "pink":
        pinkNoise(data, 0.4);
        break;
      case "brown":
        brownNoise(data, 0.5);
        break;
      case "rain":
        pinkNoise(data, 0.35);
        // add small droplets
        for (let i = 0; i < length; i++) {
          if (Math.random() < 0.0008) {
            const amp = 0.6 * Math.random();
            for (let k = 0; k < 200 && i + k < length; k++) {
              data[i + k] += amp * Math.exp(-k / 40) * (Math.random() * 2 - 1);
            }
          }
        }
        break;
      case "ocean": {
        brownNoise(data, 0.6);
        // modulate with slow swell
        for (let i = 0; i < length; i++) {
          const swell = 0.5 + 0.5 * Math.sin((2 * Math.PI * i) / (sampleRate * 4));
          data[i] *= swell;
        }
        break;
      }
      case "forest": {
        pinkNoise(data, 0.25);
        // occasional bird-ish chirps (soft high tones)
        for (let i = 0; i < length; i++) {
          if (Math.random() < 0.00025) {
            const freq = 1500 + Math.random() * 2500;
            const dur = Math.floor(sampleRate * 0.15);
            for (let k = 0; k < dur && i + k < length; k++) {
              const env = Math.sin((Math.PI * k) / dur);
              data[i + k] += 0.15 * env * Math.sin((2 * Math.PI * freq * k) / sampleRate);
            }
          }
        }
        break;
      }
    }
  }
  // fade edges so loop is seamless
  const fade = Math.floor(sampleRate * 0.05);
  for (let ch = 0; ch < 2; ch++) {
    const data = buffer.getChannelData(ch);
    for (let i = 0; i < fade; i++) {
      const g = i / fade;
      data[i] *= g;
      data[length - 1 - i] *= g;
    }
  }
  return buffer;
}

function pinkNoise(data: Float32Array, amp: number) {
  let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
  for (let i = 0; i < data.length; i++) {
    const white = Math.random() * 2 - 1;
    b0 = 0.99886 * b0 + white * 0.0555179;
    b1 = 0.99332 * b1 + white * 0.0750759;
    b2 = 0.96900 * b2 + white * 0.1538520;
    b3 = 0.86650 * b3 + white * 0.3104856;
    b4 = 0.55000 * b4 + white * 0.5329522;
    b5 = -0.7616 * b5 - white * 0.0168980;
    data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11 * amp;
    b6 = white * 0.115926;
  }
}

function brownNoise(data: Float32Array, amp: number) {
  let last = 0;
  for (let i = 0; i < data.length; i++) {
    const white = Math.random() * 2 - 1;
    last = (last + 0.02 * white) / 1.02;
    data[i] = last * 3.5 * amp;
  }
}