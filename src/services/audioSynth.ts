import { AlarmToneStandard } from '../types/clinical';

/**
 * Web Audio API synthesizer calibrated directly against measured spectral & envelope
 * profiles from real Philips IntelliVue MX-series clinical audio:
 * - QRS / SpO2 SmartTone Beep: 625 Hz at 100% SpO2 (610 Hz at 98%), 52ms soft pure sine pulse
 * - Red (***) High-Priority Chime: 955 Hz fundamental + 1910 Hz + 2875 Hz 3rd bell harmonic
 *   resonant strike (~460ms bell decay, repeating on 1.02s cadence)
 * - Yellow (**) Medium-Priority Chime: 955 Hz + gentle 2875 Hz resonant chime (~520ms mellow decay, ~2.2s cadence)
 * - Cyan (!) Technical INOP Tone: Soft 490 Hz -> 320 Hz advisory chime
 */
class ClinicalAudioSynthesizer {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;

  // Philips IntelliVue Monitor Audio State
  private enabled = false;
  private volume = 7; // 0..10 scale matching Philips Alarm Volume menu
  private standard: AlarmToneStandard = 'PHILIPS';

  // B. Braun Space / Spaceplus Infusion Station Audio State
  private bbraunEnabled = false;
  private bbraunVolume = 7; // 0..10 scale

  private getOrCreateContext(): AudioContext | null {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    if (this.ctx && !this.masterGain) {
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(1, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);
    }
    return this.ctx;
  }

  private getOutputNode(ctx: AudioContext): AudioNode {
    if (!this.masterGain) {
      this.masterGain = ctx.createGain();
      this.masterGain.gain.setValueAtTime(1, ctx.currentTime);
      this.masterGain.connect(ctx.destination);
    }
    return this.masterGain;
  }

  private ensurePhilipsContext(): AudioContext | null {
    if (!this.enabled || this.volume <= 0) return null;
    return this.getOrCreateContext();
  }

  private ensureBbraunContext(): AudioContext | null {
    if (!this.bbraunEnabled || this.bbraunVolume <= 0) return null;
    return this.getOrCreateContext();
  }

  /**
   * Immediately cuts off all active/decaying oscillators (used when returning to Main Menu).
   */
  public stopAllActiveSounds(): void {
    if (!this.ctx || !this.masterGain) return;
    try {
      const now = this.ctx.currentTime;
      const oldGain = this.masterGain;
      oldGain.gain.cancelScheduledValues(now);
      oldGain.gain.setValueAtTime(0.0001, now);
      window.setTimeout(() => {
        try {
          oldGain.disconnect();
        } catch {
          // ignore already disconnected
        }
      }, 40);
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(1, now);
      this.masterGain.connect(this.ctx.destination);
    } catch {
      this.masterGain = null;
    }
  }

  public setEnabled(next: boolean): void {
    this.enabled = next;
    if (next) {
      this.ensurePhilipsContext();
    }
  }

  public isEnabled(): boolean {
    return this.enabled;
  }

  public setVolume(vol0To10: number): void {
    this.volume = Math.max(0, Math.min(10, Math.round(vol0To10)));
    if (this.volume > 0 && !this.enabled) {
      this.setEnabled(true);
    }
  }

  public getVolume(): number {
    return this.volume;
  }

  public setToneStandard(std: AlarmToneStandard): void {
    this.standard = std;
  }

  public getToneStandard(): AlarmToneStandard {
    return this.standard;
  }

  public setBbraunEnabled(next: boolean): void {
    this.bbraunEnabled = next;
    if (next) {
      this.ensureBbraunContext();
    }
  }

  public isBbraunEnabled(): boolean {
    return this.bbraunEnabled;
  }

  public setBbraunVolume(vol0To10: number): void {
    this.bbraunVolume = Math.max(0, Math.min(10, Math.round(vol0To10)));
    if (this.bbraunVolume > 0 && !this.bbraunEnabled) {
      this.setBbraunEnabled(true);
    }
  }

  public getBbraunVolume(): number {
    return this.bbraunVolume;
  }

  private scaledGain(baseGain: number): number {
    return Math.max(0.0002, baseGain * (this.volume / 7));
  }

  private scaledBbraunGain(baseGain: number): number {
    return Math.max(0.0002, baseGain * (this.bbraunVolume / 7));
  }

  /**
   * Synthesize a multi-harmonic resonant bell chime matching real Philips IntelliVue MX speakers
   */
  private playHarmonicBellStrike(
    partials: { freqHz: number; relGain: number; decaySec: number }[],
    startOffsetSec: number,
    attackSec = 0.008,
    lowpassHz = 3600
  ): void {
    const ctx = this.ensurePhilipsContext();
    if (!ctx) return;

    const out = this.getOutputNode(ctx);
    const now = ctx.currentTime + startOffsetSec;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(lowpassHz, now);
    filter.connect(out);

    for (const p of partials) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const peak = this.scaledGain(p.relGain);

      osc.type = 'sine';
      osc.frequency.setValueAtTime(p.freqHz, now);

      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(peak, now + attackSec);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + p.decaySec);

      osc.connect(gain);
      gain.connect(filter);

      osc.start(now);
      osc.stop(now + p.decaySec + 0.03);
    }
  }

  private playFilteredTone(
    freqHz: number,
    startOffsetSec: number,
    durationSec: number,
    baseGain = 0.08,
    type: OscillatorType = 'sine',
    lowpassHz = 2400
  ): void {
    const ctx = this.ensurePhilipsContext();
    if (!ctx) return;

    const out = this.getOutputNode(ctx);
    const peakGain = this.scaledGain(baseGain);
    const now = ctx.currentTime + startOffsetSec;
    const osc = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freqHz, now);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(lowpassHz, now);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(peakGain, now + 0.009);
    gain.gain.setValueAtTime(peakGain, now + Math.max(0.015, durationSec * 0.45));
    gain.gain.exponentialRampToValueAtTime(0.0001, now + durationSec);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(out);

    osc.start(now);
    osc.stop(now + durationSec + 0.02);
  }

  /**
   * Synthesize a crisp German infusion-pump piezo-transducer pip (distinct from Philips bell chimes).
   * Uses a band-passed triangle/square hybrid at 1.9–2.9 kHz with fast 3ms piezo ceramic envelope.
   */
  private playBbraunPiezoPip(
    freqHz: number,
    startOffsetSec: number,
    durationSec: number,
    baseGain = 0.075,
    waveform: OscillatorType = 'square'
  ): void {
    const ctx = this.ensureBbraunContext();
    if (!ctx) return;

    const out = this.getOutputNode(ctx);
    const peakGain = this.scaledBbraunGain(baseGain);
    const now = ctx.currentTime + startOffsetSec;

    const osc = ctx.createOscillator();
    const bandpass = ctx.createBiquadFilter();
    const gain = ctx.createGain();

    osc.type = waveform;
    osc.frequency.setValueAtTime(freqHz, now);

    bandpass.type = 'bandpass';
    bandpass.frequency.setValueAtTime(freqHz, now);
    bandpass.Q.setValueAtTime(3.2, now);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(peakGain, now + 0.003);
    gain.gain.setValueAtTime(peakGain, now + Math.max(0.006, durationSec - 0.012));
    gain.gain.exponentialRampToValueAtTime(0.0001, now + durationSec);

    osc.connect(bandpass);
    bandpass.connect(gain);
    gain.connect(out);

    osc.start(now);
    osc.stop(now + durationSec + 0.015);
  }

  /**
   * Authentic Philips IntelliVue Red (***) High-Priority Alarm:
   * Bright urgent 955 Hz + 2875 Hz resonant bell-chime strike repeating every ~1.02s.
   */
  public playHighPriorityBurst(): void {
    if (!this.enabled || this.volume <= 0) return;

    if (this.standard === 'PHILIPS') {
      this.playHarmonicBellStrike(
        [
          { freqHz: 955, relGain: 0.135, decaySec: 0.48 },
          { freqHz: 1912, relGain: 0.042, decaySec: 0.34 },
          { freqHz: 2875, relGain: 0.095, decaySec: 0.44 },
        ],
        0.0,
        0.006,
        4200
      );
      return;
    }

    // IEC 60601-1-8 5-pulse high-priority burst
    const notes = [523.25, 659.25, 783.99, 987.77, 1046.5];
    const offsets = [0, 0.13, 0.26, 0.48, 0.61];
    notes.forEach((freq, idx) => {
      this.playFilteredTone(freq, offsets[idx], 0.105, 0.1, 'triangle', 2600);
    });
  }

  /**
   * Authentic Philips IntelliVue Yellow (**) Medium-Priority Alarm:
   * Mellow resonant 955 Hz + soft 2875 Hz chime repeating every ~2.2s.
   */
  public playMediumPriorityBurst(): void {
    if (!this.enabled || this.volume <= 0) return;

    if (this.standard === 'PHILIPS') {
      this.playHarmonicBellStrike(
        [
          { freqHz: 955, relGain: 0.095, decaySec: 0.56 },
          { freqHz: 2875, relGain: 0.055, decaySec: 0.52 },
        ],
        0.0,
        0.016,
        3400
      );
      return;
    }

    const notes = [440, 587.33, 698.46];
    const offsets = [0, 0.2, 0.4];
    notes.forEach((freq, idx) => {
      this.playFilteredTone(freq, offsets[idx], 0.16, 0.085, 'sine', 2000);
    });
  }

  /**
   * Authentic Philips IntelliVue Cyan (!) Low-Priority / Technical INOP Tone:
   * Soft dual-partial 490 Hz / 315 Hz advisory chime.
   */
  public playLowPriorityInop(): void {
    if (!this.enabled || this.volume <= 0) return;
    this.playHarmonicBellStrike(
      [
        { freqHz: 490, relGain: 0.075, decaySec: 0.22 },
        { freqHz: 315, relGain: 0.045, decaySec: 0.24 },
      ],
      0.0,
      0.012,
      1600
    );
  }

  /**
   * Authentic Philips SmartTone QRS / SpO2 Pulse Beep:
   * Measured ~625 Hz at SpO2 100%, ~610 Hz at SpO2 98%, dropping smoothly on desaturation.
   */
  public playQrsPulseBeep(spo2Pct: number): void {
    if (!this.enabled || this.volume <= 0) return;
    const clampedSpo2 = Math.max(70, Math.min(100, spo2Pct || 98));
    const freq = 400 + (clampedSpo2 - 70) * 7.5;
    this.playFilteredTone(freq, 0, 0.056, 0.052, 'sine', 1900);
  }

  /**
   * Tactile Philips SmartKey touch tone (warm 860/1080 Hz)
   */
  public playKeyClick(confirm = false): void {
    if (!this.enabled || this.volume <= 0) return;
    this.playFilteredTone(
      confirm ? 1080 : 860,
      0,
      confirm ? 0.042 : 0.024,
      0.032,
      'sine',
      2200
    );
  }

  /**
   * NBP measurement completion chime
   */
  public playNbpComplete(): void {
    if (!this.enabled || this.volume <= 0) return;
    this.playFilteredTone(625, 0, 0.085, 0.055, 'sine', 2000);
    this.playFilteredTone(955, 0.1, 0.13, 0.055, 'sine', 2200);
  }

  /**
   * B. Braun Infusomat® / Perfusor® Space High-Priority Critical Pump Alarm:
   * Distinct sharp piezo-ceramic alternating burst (2640 Hz - 1980 Hz - 2640 Hz) for
   * Occlusion, Empty Syringe/Bag, or Disconnected IV Line.
   */
  public playBbraunCriticalAlarm(): void {
    if (!this.bbraunEnabled || this.bbraunVolume <= 0) return;
    this.playBbraunPiezoPip(2640, 0.0, 0.085, 0.085, 'square');
    this.playBbraunPiezoPip(1980, 0.115, 0.085, 0.078, 'square');
    this.playBbraunPiezoPip(2640, 0.23, 0.11, 0.09, 'square');
  }

  /**
   * B. Braun Infusomat® / Perfusor® Space Pre-Alarm / KVO / Near-Empty Advisory Tone:
   * Crisp dual-step 2150 Hz -> 2420 Hz piezo chirp.
   */
  public playBbraunPreAlarm(): void {
    if (!this.bbraunEnabled || this.bbraunVolume <= 0) return;
    this.playBbraunPiezoPip(2150, 0.0, 0.075, 0.058, 'triangle');
    this.playBbraunPiezoPip(2420, 0.11, 0.09, 0.062, 'triangle');
  }

  /**
   * B. Braun Membrane / Touchscreen Tactile Key Beep (crisp 2880/3200 Hz piezo click)
   */
  public playBbraunKeyBeep(confirm = false): void {
    if (!this.bbraunEnabled || this.bbraunVolume <= 0) return;
    this.playBbraunPiezoPip(
      confirm ? 3200 : 2880,
      0.0,
      confirm ? 0.028 : 0.016,
      0.036,
      'triangle'
    );
  }
}

export const clinicalAudio = new ClinicalAudioSynthesizer();
