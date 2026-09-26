/**
 * Sound and Audio Notification Utilities
 * Uses Web Audio API for zero-latency, cross-platform audio feedback (mobile & desktop)
 */

let sharedAudioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  try {
    if (!sharedAudioCtx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        sharedAudioCtx = new AudioCtx();
      }
    }
    if (sharedAudioCtx && sharedAudioCtx.state === 'suspended') {
      sharedAudioCtx.resume().catch(() => {
        // User gesture may be required
      });
    }
    return sharedAudioCtx;
  } catch {
    return null;
  }
}

/** Check if sound is enabled (persisted in localStorage, default is enabled) */
export function isSoundEnabled(): boolean {
  try {
    const val = localStorage.getItem('donbosco_sound_enabled');
    return val === null ? true : val === 'true';
  } catch {
    return true;
  }
}

/** Set sound enabled/disabled */
export function setSoundEnabled(enabled: boolean): void {
  try {
    localStorage.setItem('donbosco_sound_enabled', enabled ? 'true' : 'false');
  } catch {
    // Ignore storage errors
  }
}

/**
 * Âm báo điểm danh THÀNH CÔNG (Crisp chime: 880Hz -> 1318.5Hz - nốt A5 -> E6)
 * Giúp giáo lý viên và học sinh nghe rõ tiếng "Bíp - Ting" vui tai xác nhận đã điểm danh
 */
export function playSuccessChime(isLate: boolean = false): void {
  if (!isSoundEnabled()) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    if (isLate) {
      // Âm báo trễ giờ (2 nốt trầm hơn một chút: 587Hz -> 440Hz - D5 -> A4)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'triangle';
      osc1.frequency.setValueAtTime(587.33, now);
      gain1.gain.setValueAtTime(0.25, now);
      gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.14);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.14);

      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(440, now + 0.12);
      gain2.gain.setValueAtTime(0.25, now + 0.12);
      gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.32);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.12);
      osc2.stop(now + 0.32);
    } else {
      // Âm báo đúng giờ chuẩn (2 nốt ngân trong trẻo, sắc nét: 880Hz -> 1318.5Hz)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(880, now);
      gain1.gain.setValueAtTime(0.28, now);
      gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.12);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.12);

      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(1318.51, now + 0.08);
      gain2.gain.setValueAtTime(0.32, now + 0.08);
      gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.08);
      osc2.stop(now + 0.3);
    }

    // Rung phản hồi trên điện thoại
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(isLate ? [80, 40, 80] : 100);
    }
  } catch {
    // Audio Context not ready or blocked
  }
}

/**
 * Âm báo ĐÃ ĐIỂM DANH TRƯỚC ĐÓ / TRÙNG MÃ (Double reminder chime: 523Hz -> 523Hz)
 * Báo hiệu cho người quét biết em này đã điểm danh trong ngày rồi
 */
export function playAlreadyMarkedChime(): void {
  if (!isSoundEnabled()) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    // Tone 1
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(659.25, now); // E5
    gain1.gain.setValueAtTime(0.26, now);
    gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.14);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.14);

    // Tone 2
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(523.25, now + 0.16); // C5
    gain2.gain.setValueAtTime(0.28, now + 0.16);
    gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.35);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.16);
    osc2.stop(now + 0.35);

    // Rung cảnh báo nhẹ
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate([120, 60, 120]);
    }
  } catch {
    // Audio Context not ready
  }
}

/**
 * Âm báo lỗi (Mã không hợp lệ hoặc không có quyền)
 */
export function playErrorChime(): void {
  if (!isSoundEnabled()) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(220, now);
    gain.gain.setValueAtTime(0.24, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.28);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.28);

    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate([200, 100, 200]);
    }
  } catch {
    // Audio Context not ready
  }
}
