'use client'

/**
 * Procedurally modelled brake rotor + caliper (no external model files).
 * Loaded lazily on capable desktop devices only; rendering pauses when off-screen.
 */
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'

/** Builds a studio reflection map once the renderer exists; returns a disposer. */
function applyStudioEnvironment(gl: THREE.WebGLRenderer, scene: THREE.Scene) {
  const pmrem = new THREE.PMREMGenerator(gl)
  const room = new RoomEnvironment()
  const env = pmrem.fromScene(room, 0.04).texture
  scene.environment = env
  return () => {
    scene.environment = null
    env.dispose()
    pmrem.dispose()
    room.dispose()
  }
}

function useRotorGeometry() {
  return useMemo(() => {
    const shape = new THREE.Shape()
    shape.absarc(0, 0, 1.6, 0, Math.PI * 2, false)
    const center = new THREE.Path()
    center.absarc(0, 0, 0.62, 0, Math.PI * 2, true)
    shape.holes.push(center)
    // Cross-drilled holes in three staggered rings.
    const rings = [
      { r: 1.0, count: 12, size: 0.055, offset: 0 },
      { r: 1.2, count: 12, size: 0.055, offset: 0.5 },
      { r: 1.4, count: 12, size: 0.055, offset: 0 },
    ]
    for (const ring of rings) {
      for (let i = 0; i < ring.count; i++) {
        const a = ((i + ring.offset) / ring.count) * Math.PI * 2 + ring.r * 0.9
        const hole = new THREE.Path()
        hole.absarc(Math.cos(a) * ring.r, Math.sin(a) * ring.r, ring.size, 0, Math.PI * 2, true)
        shape.holes.push(hole)
      }
    }
    const geometry = new THREE.ExtrudeGeometry(shape, {
      depth: 0.16,
      bevelEnabled: true,
      bevelThickness: 0.02,
      bevelSize: 0.02,
      bevelSegments: 2,
      curveSegments: 72,
    })
    geometry.center()
    return geometry
  }, [])
}

function useCaliperGeometry() {
  return useMemo(() => {
    const start = THREE.MathUtils.degToRad(18)
    const end = THREE.MathUtils.degToRad(78)
    const shape = new THREE.Shape()
    shape.absarc(0, 0, 1.78, start, end, false)
    shape.absarc(0, 0, 1.18, end, start, true)
    shape.closePath()
    const geometry = new THREE.ExtrudeGeometry(shape, {
      depth: 0.56,
      bevelEnabled: true,
      bevelThickness: 0.06,
      bevelSize: 0.06,
      bevelSegments: 4,
      curveSegments: 32,
    })
    geometry.translate(0, 0, -0.28)
    return geometry
  }, [])
}

function Rotor({ reducedMotion }: { reducedMotion: boolean }) {
  const group = useRef<THREE.Group>(null)
  const disc = useRef<THREE.Group>(null)
  const rotor = useRotorGeometry()
  const caliper = useCaliperGeometry()
  const pointer = useThree((s) => s.pointer)

  useEffect(() => () => {
    rotor.dispose()
    caliper.dispose()
  }, [rotor, caliper])

  useFrame((_, delta) => {
    if (reducedMotion) return
    if (disc.current) disc.current.rotation.z -= delta * 0.35
    if (group.current) {
      group.current.rotation.y = THREE.MathUtils.lerp(group.current.rotation.y, -0.55 + pointer.x * 0.25, 0.05)
      group.current.rotation.x = THREE.MathUtils.lerp(group.current.rotation.x, 0.18 - pointer.y * 0.15, 0.05)
    }
  })

  return (
    <group ref={group} rotation={[0.18, -0.55, 0]}>
      <group ref={disc}>
        <mesh geometry={rotor} castShadow>
          <meshStandardMaterial color="#c9ced6" metalness={1} roughness={0.3} envMapIntensity={1.1} />
        </mesh>
        {/* Hub (hat) */}
        <mesh position={[0, 0, 0.2]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.78, 0.82, 0.32, 64]} />
          <meshStandardMaterial color="#8d949f" metalness={1} roughness={0.38} />
        </mesh>
        <mesh position={[0, 0, 0.37]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.3, 0.3, 0.04, 48]} />
          <meshStandardMaterial color="#1b1e23" metalness={0.6} roughness={0.5} />
        </mesh>
        {Array.from({ length: 5 }, (_, i) => {
          const a = (i / 5) * Math.PI * 2
          return (
            <mesh key={i} position={[Math.cos(a) * 0.52, Math.sin(a) * 0.52, 0.37]} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.07, 0.07, 0.06, 24]} />
              <meshStandardMaterial color="#0f1114" metalness={0.4} roughness={0.6} />
            </mesh>
          )
        })}
      </group>
      {/* Caliper stays still while the rotor spins. */}
      <mesh geometry={caliper}>
        <meshStandardMaterial color="#ff6b1a" metalness={0.35} roughness={0.32} envMapIntensity={0.9} />
      </mesh>
    </group>
  )
}

export default function BrakeDiscScene() {
  const wrapper = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(true)
  const [reducedMotion] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  const disposeEnv = useRef<(() => void) | null>(null)
  useEffect(() => () => disposeEnv.current?.(), [])

  useEffect(() => {
    const el = wrapper.current
    if (!el) return
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { threshold: 0.05 })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <div ref={wrapper} className="absolute inset-0">
      <Canvas
        dpr={[1, 1.75]}
        camera={{ position: [0, 0, 7.2], fov: 34 }}
        frameloop={visible && !reducedMotion ? 'always' : 'demand'}
        gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
        aria-hidden="true"
        onCreated={({ gl, scene }) => {
          disposeEnv.current = applyStudioEnvironment(gl, scene)
        }}
      >
        <ambientLight intensity={0.25} />
        <directionalLight position={[3, 4, 5]} intensity={1.6} />
        <pointLight position={[-3, -2, 2]} intensity={14} color="#ff6b1a" distance={8} />
        <Rotor reducedMotion={reducedMotion} />
      </Canvas>
    </div>
  )
}
