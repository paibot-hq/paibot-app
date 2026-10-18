// The sound of the glitch noise in the browser: a low hum all the time, and each scene's own sound (sceneSound) played
// as the scene starts.

import { sceneSound, type Intensity, type Segment } from "./glitch.ts";

export class GlitchSound {
  private ctx = new AudioContext();
  private out: GainNode;
  private hum: GainNode;
  private playing: AudioBufferSourceNode | null = null;

  constructor() {
    const { ctx } = this;
    // A compressor keeps the louder scenes (a flash's thump) from clipping.
    const limit = ctx.createDynamicsCompressor();
    limit.connect(ctx.destination);
    this.out = ctx.createGain();
    this.out.gain.value = 0.6;
    this.out.connect(limit);
    // The hum: 38 Hz, swelling and fading every eight seconds or so.
    const tone = ctx.createOscillator();
    tone.frequency.value = 38;
    this.hum = ctx.createGain();
    this.hum.gain.value = 0.06;
    const swell = ctx.createOscillator();
    swell.frequency.value = 0.13;
    const depth = ctx.createGain();
    depth.gain.value = 0.06;
    swell.connect(depth).connect(this.hum.gain);
    tone.connect(this.hum).connect(this.out);
    tone.start();
    swell.start();
  }

  // The sound of a scene that starts now, cutting off the one before.
  scene(segment: Segment, intensity: Intensity) {
    const { ctx } = this;
    this.playing?.stop();
    this.playing = null;
    const samples = sceneSound(segment, intensity, segment.end - segment.start, ctx.sampleRate);
    if (!samples) return;
    const buffer = ctx.createBuffer(1, samples.length, ctx.sampleRate);
    buffer.copyToChannel(samples, 0);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(this.out);
    source.start();
    this.playing = source;
  }

  close() {
    void this.ctx.close();
  }
}
