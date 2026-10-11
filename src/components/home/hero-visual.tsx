'use client'

import dynamic from 'next/dynamic'
import { useSyncExternalStore } from 'react'

const BrakeDiscScene = dynamic(() => import('./brake-disc-scene'), { ssr: false, loading: () => <StaticRotor /> })

function supportsWebGL() {
  try {
    const canvas = document.createElement('canvas')
    return Boolean(canvas.getContext('webgl2') || canvas.getContext('webgl'))
  } catch {
    return false
  }
}

const subscribe = (cb: () => void) => {
  const mq = window.matchMedia('(min-width: 1024px)')
  mq.addEventListener('change', cb)
  return () => mq.removeEventListener('change', cb)
}

/** 3D rotor on large screens with WebGL; a crisp static SVG everywhere else (and during SSR). */
export function HeroVisual() {
  const use3d = useSyncExternalStore(
    subscribe,
    () => window.matchMedia('(min-width: 1024px)').matches && supportsWebGL(),
    () => false,
  )
  return (
    <div className="relative aspect-square w-full">
      <div className="absolute inset-[12%] rounded-full bg-[radial-gradient(circle,rgb(255_107_26/0.22),transparent_65%)] blur-2xl" aria-hidden="true" />
      {use3d ? <BrakeDiscScene /> : <StaticRotor />}
    </div>
  )
}

function StaticRotor() {
  const holes = [1.0, 1.2, 1.4].flatMap((r, ringIndex) =>
    Array.from({ length: 12 }, (_, i) => {
      const a = ((i + (ringIndex === 1 ? 0.5 : 0)) / 12) * Math.PI * 2 + r * 0.9
      return { x: 200 + Math.cos(a) * r * 100, y: 200 + Math.sin(a) * r * 100 }
    }),
  )
  return (
    <svg viewBox="0 0 400 400" className="absolute inset-0 h-full w-full" aria-hidden="true">
      <defs>
        <linearGradient id="rotor-metal" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#eef0f3" />
          <stop offset="0.45" stopColor="#9aa1ab" />
          <stop offset="0.65" stopColor="#dfe2e7" />
          <stop offset="1" stopColor="#6f7681" />
        </linearGradient>
        <linearGradient id="caliper" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ff8a4c" />
          <stop offset="1" stopColor="#d9530c" />
        </linearGradient>
      </defs>
      <circle cx="200" cy="200" r="160" fill="url(#rotor-metal)" />
      <circle cx="200" cy="200" r="158" fill="none" stroke="#ffffff" strokeOpacity="0.35" strokeWidth="1.5" />
      {holes.map((h, i) => (
        <circle key={i} cx={h.x} cy={h.y} r="5.5" fill="#0b0c0e" />
      ))}
      <circle cx="200" cy="200" r="80" fill="#8d949f" />
      <circle cx="200" cy="200" r="62" fill="#0b0c0e" />
      {Array.from({ length: 5 }, (_, i) => {
        const a = (i / 5) * Math.PI * 2 - Math.PI / 2
        return <circle key={i} cx={200 + Math.cos(a) * 52} cy={200 + Math.sin(a) * 52} r="7" fill="#9aa1ab" />
      })}
      <path d="M 369 145 A 178 178 0 0 1 337 340 L 296 300 A 118 118 0 0 0 317 166 Z" fill="url(#caliper)" />
    </svg>
  )
}
