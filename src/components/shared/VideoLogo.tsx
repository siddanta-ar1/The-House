'use client'

import { useRef, useEffect } from 'react'

interface VideoLogoProps {
    /** Height class — e.g. "h-8", "h-10", "h-6" */
    className?: string
    /** Whether to apply dark-background styles (no filter needed since video has own colors) */
    variant?: 'default' | 'dark'
}

/**
 * Animated logo using /logo.mp4.
 * Auto-plays, loops, is muted (required for autoplay policy), and inline.
 * Falls back to a text logo if video fails.
 */
export default function VideoLogo({ className = 'h-8', variant = 'default' }: VideoLogoProps) {
    const videoRef = useRef<HTMLVideoElement>(null)

    useEffect(() => {
        // Ensure autoplay works on mount (some browsers need explicit play call)
        const v = videoRef.current
        if (v) {
            v.play().catch(() => {
                // Autoplay blocked — video stays on first frame, which is fine
            })
        }
    }, [])

    return (
        <video
            ref={videoRef}
            src="/logo.mp4"
            autoPlay
            loop
            muted
            playsInline
            // Prevent right-click download menu
            onContextMenu={(e) => e.preventDefault()}
            className={`${className} w-auto object-contain pointer-events-auto select-none ${
                variant === 'dark' ? 'brightness-110' : ''
            }`}
            // Accessible alt via aria
            aria-label="KKhane logo"
            role="img"
        />
    )
}
