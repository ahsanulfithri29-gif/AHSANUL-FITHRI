/**
 * Audio Alarm Synthesizer for Exam Lockdown Security System
 * Uses Web Audio API to generate real-time synthesized alarms
 * without relying on external audio file downloads.
 */

class SecurityAudioSystem {
  private audioCtx: AudioContext | null = null;
  private alarmOscillator: OscillatorNode | null = null;
  private alarmGain: GainNode | null = null;
  private alarmInterval: number | null = null;
  private isAlarmRunning = false;
  private isMuted = false;

  private initContext() {
    if (!this.audioCtx) {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.audioCtx = new AudioContextClass();
    }
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
  }

  public setMute(muted: boolean) {
    this.isMuted = muted;
    if (muted && this.isAlarmRunning) {
      this.stopLoudAlarm();
    }
  }

  public getIsMuted(): boolean {
    return this.isMuted;
  }

  /**
   * Triggers the piercing dual-tone cheating alarm siren
   * Alternates between 880 Hz and 659 Hz to create an unmistakable security siren
   */
  public startLoudAlarm(durationSeconds?: number) {
    if (this.isMuted) return;

    try {
      this.initContext();
      if (!this.audioCtx) return;

      if (this.isAlarmRunning) {
        return; // already active
      }

      this.isAlarmRunning = true;
      const ctx = this.audioCtx;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      gain.gain.setValueAtTime(0.35, ctx.currentTime);

      osc.connect(gain);
      gain.connect(ctx.destination);

      let highTone = true;
      osc.frequency.setValueAtTime(880, ctx.currentTime);

      this.alarmOscillator = osc;
      this.alarmGain = gain;

      osc.start();

      // Alternate siren pitch every 200ms
      this.alarmInterval = window.setInterval(() => {
        if (!this.isAlarmRunning || !this.audioCtx) return;
        highTone = !highTone;
        const targetFreq = highTone ? 920 : 660;
        this.alarmOscillator?.frequency.cancelScheduledValues(this.audioCtx.currentTime);
        this.alarmOscillator?.frequency.linearRampToValueAtTime(targetFreq, this.audioCtx.currentTime + 0.08);
      }, 200);

      // Auto stop after duration if specified
      if (durationSeconds && durationSeconds > 0) {
        window.setTimeout(() => {
          this.stopLoudAlarm();
        }, durationSeconds * 1000);
      }
    } catch {
      // Audio context might be restricted before user gesture
    }
  }

  /**
   * Stops the active siren
   */
  public stopLoudAlarm() {
    this.isAlarmRunning = false;
    if (this.alarmInterval) {
      clearInterval(this.alarmInterval);
      this.alarmInterval = null;
    }
    if (this.alarmOscillator) {
      try {
        this.alarmOscillator.stop();
        this.alarmOscillator.disconnect();
      } catch {
        // already stopped
      }
      this.alarmOscillator = null;
    }
    if (this.alarmGain) {
      try {
        this.alarmGain.disconnect();
      } catch {
        // already disconnected
      }
      this.alarmGain = null;
    }
  }

  /**
   * Short warning beep for blocked keys or initial boundary warning
   */
  public playWarningBeep() {
    if (this.isMuted) return;

    try {
      this.initContext();
      if (!this.audioCtx) return;

      const ctx = this.audioCtx;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(520, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(320, ctx.currentTime + 0.18);

      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.18);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.2);
    } catch {
      // AudioContext policy
    }
  }

  /**
   * Proctor alert chime when a violation event arrives in the teacher dashboard
   */
  public playProctorAlert() {
    if (this.isMuted) return;

    try {
      this.initContext();
      if (!this.audioCtx) return;

      const ctx = this.audioCtx;
      const notes = [440, 554.37, 659.25]; // A major triad chime
      notes.forEach((freq, index) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + index * 0.08);

        const startTime = ctx.currentTime + index * 0.08;
        gain.gain.setValueAtTime(0.18, startTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.4);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(startTime);
        osc.stop(startTime + 0.45);
      });
    } catch {
      // ignore
    }
  }

  public isRunning(): boolean {
    return this.isAlarmRunning;
  }
}

export const securityAudio = new SecurityAudioSystem();
