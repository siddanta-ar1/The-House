// src/lib/audio.ts
// Kitchen audio alert system

let audioContext: AudioContext | null = null

/**
 * Play a kitchen ping alert sound
 * Falls back to Web Audio API oscillator if mp3 file is not available
 */
export function playKitchenPing() {
    // Try HTML5 Audio first (for mp3 file)
    try {
        const audio = new Audio('/sounds/kitchen-ping.mp3')
        audio.volume = 0.7
        audio.play().catch(() => {
            // Fallback to Web Audio API
            playFallbackPing()
        })
    } catch {
        playFallbackPing()
    }
}

/**
 * Fallback ping using Web Audio API oscillator
 */
function playFallbackPing() {
    try {
        if (!audioContext) {
            audioContext = new AudioContext()
        }

        const oscillator = audioContext.createOscillator()
        const gainNode = audioContext.createGain()

        oscillator.connect(gainNode)
        gainNode.connect(audioContext.destination)

        oscillator.frequency.setValueAtTime(880, audioContext.currentTime)
        oscillator.frequency.setValueAtTime(1320, audioContext.currentTime + 0.1)

        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime)
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5)

        oscillator.start(audioContext.currentTime)
        oscillator.stop(audioContext.currentTime + 0.5)
    } catch {
        // Audio not supported — silent fail
    }
}
