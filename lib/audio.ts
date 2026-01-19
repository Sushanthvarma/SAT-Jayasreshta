/**
 * Audio Feedback System
 * Provides sound effects for user interactions to make the app feel more lively
 */

class AudioManager {
  private sounds: Map<string, HTMLAudioElement> = new Map();
  private enabled: boolean = true;
  private volume: number = 0.5;

  constructor() {
    // Check if audio is enabled (respect user preferences)
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('audioEnabled');
      this.enabled = saved !== null ? saved === 'true' : true;
      const savedVolume = localStorage.getItem('audioVolume');
      this.volume = savedVolume ? parseFloat(savedVolume) : 0.5;
    }
  }

  /**
   * Create audio element from base64 data URI or URL
   */
  private createSound(name: string, dataUri: string): HTMLAudioElement {
    const audio = new Audio(dataUri);
    audio.volume = this.volume;
    audio.preload = 'auto';
    return audio;
  }

  /**
   * Initialize all sound effects using Web Audio API tones
   */
  init() {
    if (typeof window === 'undefined') return;

    // Generate sounds using Web Audio API for better performance
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();

    // Click sound - short, pleasant beep
    this.sounds.set('click', this.generateTone(audioContext, 800, 0.05, 'sine'));
    
    // Success sound - ascending notes
    this.sounds.set('success', this.generateTone(audioContext, 600, 0.1, 'sine'));
    
    // Error sound - low buzz
    this.sounds.set('error', this.generateTone(audioContext, 300, 0.15, 'square'));
    
    // Achievement/Badge - celebratory chime
    this.sounds.set('achievement', this.generateTone(audioContext, 1000, 0.2, 'sine'));
    
    // Level up - ascending scale
    this.sounds.set('levelUp', this.generateTone(audioContext, 800, 0.3, 'sine'));
    
    // Page transition - soft whoosh
    this.sounds.set('transition', this.generateTone(audioContext, 400, 0.08, 'sine'));
    
    // Submit - confirmation beep
    this.sounds.set('submit', this.generateTone(audioContext, 500, 0.12, 'sine'));
    
    // Notification - gentle ping
    this.sounds.set('notification', this.generateTone(audioContext, 700, 0.1, 'sine'));
  }

  /**
   * Generate a tone using Web Audio API
   */
  private generateTone(
    audioContext: AudioContext,
    frequency: number,
    duration: number,
    type: OscillatorType = 'sine'
  ): HTMLAudioElement {
    // Create a simple audio element that will be replaced with actual sound
    const audio = new Audio();
    audio.volume = this.volume;
    
    // For now, we'll use a data URI approach or create actual audio files
    // This is a placeholder - in production, you'd use actual sound files
    return audio;
  }

  /**
   * Play a sound effect
   */
  play(soundName: string, volumeOverride?: number) {
    if (!this.enabled || typeof window === 'undefined') return;

    const sound = this.sounds.get(soundName);
    if (!sound) {
      // Fallback: use Web Audio API to generate sound on the fly
      this.playTone(soundName);
      return;
    }

    try {
      const audio = sound.cloneNode() as HTMLAudioElement;
      if (volumeOverride !== undefined) {
        audio.volume = volumeOverride;
      }
      audio.play().catch(err => {
        // Silently fail if audio can't play (user interaction required, etc.)
        console.debug('Audio play failed:', err);
      });
    } catch (error) {
      // Fallback to tone generation
      this.playTone(soundName);
    }
  }

  /**
   * Play a tone using Web Audio API (fallback)
   */
  private playTone(soundName: string) {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      const frequencies: Record<string, { freq: number; duration: number; type: OscillatorType }> = {
        click: { freq: 800, duration: 0.05, type: 'sine' },
        success: { freq: 600, duration: 0.1, type: 'sine' },
        error: { freq: 300, duration: 0.15, type: 'square' },
        achievement: { freq: 1000, duration: 0.2, type: 'sine' },
        levelUp: { freq: 800, duration: 0.3, type: 'sine' },
        transition: { freq: 400, duration: 0.08, type: 'sine' },
        submit: { freq: 500, duration: 0.12, type: 'sine' },
        notification: { freq: 700, duration: 0.1, type: 'sine' },
      };

      const config = frequencies[soundName] || frequencies.click;
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.value = config.freq;
      oscillator.type = config.type;

      gainNode.gain.setValueAtTime(0, audioContext.currentTime);
      gainNode.gain.linearRampToValueAtTime(this.volume * 0.3, audioContext.currentTime + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + config.duration);

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + config.duration);
    } catch (error) {
      // Silently fail if Web Audio API is not available
      console.debug('Web Audio API not available:', error);
    }
  }

  /**
   * Enable/disable audio
   */
  setEnabled(enabled: boolean) {
    this.enabled = enabled;
    if (typeof window !== 'undefined') {
      localStorage.setItem('audioEnabled', String(enabled));
    }
  }

  /**
   * Set volume (0-1)
   */
  setVolume(volume: number) {
    this.volume = Math.max(0, Math.min(1, volume));
    this.sounds.forEach(sound => {
      sound.volume = this.volume;
    });
    if (typeof window !== 'undefined') {
      localStorage.setItem('audioVolume', String(this.volume));
    }
  }

  /**
   * Check if audio is enabled
   */
  isEnabled(): boolean {
    return this.enabled;
  }
}

// Export singleton instance
export const audioManager = new AudioManager();

// Initialize on client side
if (typeof window !== 'undefined') {
  // Wait for user interaction before initializing (browser requirement)
  const initAudio = () => {
    audioManager.init();
    document.removeEventListener('click', initAudio);
    document.removeEventListener('touchstart', initAudio);
  };
  
  document.addEventListener('click', initAudio, { once: true });
  document.addEventListener('touchstart', initAudio, { once: true });
}

// Convenience functions
export const playSound = (soundName: string, volume?: number) => {
  audioManager.play(soundName, volume);
};

export const enableAudio = () => audioManager.setEnabled(true);
export const disableAudio = () => audioManager.setEnabled(false);
export const setAudioVolume = (volume: number) => audioManager.setVolume(volume);
export const isAudioEnabled = () => audioManager.isEnabled();
