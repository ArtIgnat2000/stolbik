type FeedbackTone = 'tap' | 'correct' | 'gentle-wrong' | 'reward'

const TONES: Record<FeedbackTone, { frequency: number; duration: number; wave: OscillatorType }> = {
  tap: { frequency: 520, duration: 0.045, wave: 'sine' },
  correct: { frequency: 660, duration: 0.12, wave: 'sine' },
  'gentle-wrong': { frequency: 330, duration: 0.1, wave: 'sine' },
  reward: { frequency: 784, duration: 0.16, wave: 'sine' }
}

let audioContext: AudioContext | null = null

export function playFeedback(tone: FeedbackTone, enabled: boolean): void {
  if (!enabled || typeof window === 'undefined') return
  const AudioContextConstructor = window.AudioContext
  if (!AudioContextConstructor) return
  try {
    audioContext ??= new AudioContextConstructor()
    if (audioContext.state === 'suspended') void audioContext.resume()
    const oscillator = audioContext.createOscillator()
    const gain = audioContext.createGain()
    const settings = TONES[tone]
    const start = audioContext.currentTime
    oscillator.type = settings.wave
    oscillator.frequency.setValueAtTime(settings.frequency, start)
    gain.gain.setValueAtTime(0.0001, start)
    gain.gain.exponentialRampToValueAtTime(0.045, start + 0.012)
    gain.gain.exponentialRampToValueAtTime(0.0001, start + settings.duration)
    oscillator.connect(gain)
    gain.connect(audioContext.destination)
    oscillator.start(start)
    oscillator.stop(start + settings.duration + 0.02)
  } catch {
    // Audio is a comfort feature; unavailable or blocked audio never interrupts a lesson.
  }
}

export function vibrate(pattern: number | number[], enabled: boolean): void {
  if (!enabled || typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') return
  try {
    navigator.vibrate(pattern)
  } catch {
    // Haptics are optional and are not supported by every browser.
  }
}
