import { Suspense, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { Bounds, useGLTF } from '@react-three/drei'
import { PAWS } from './paws.js'

// leo.glb is Y-up, 0.72 units tall, origin centered between the feet, and faces
// +z (the front paws sit at positive z). See docs/leo-3d-plan.md.
const MODEL_URL = '/leo.glb'

// The geometry is meshopt-compressed; drei wires that decoder up by default, so
// plain useGLTF is all this needs.

// The camera is fixed — no orbit. This position only sets the viewing *angle*: a
// three-quarter view from Leo's front left, a little above him. <Bounds fit>
// picks the distance so he fills the frame at any aspect ratio, which matters
// because a phone in portrait is far narrower than a desktop window.
const CAMERA = { position: [1.85, 1.05, 2.5], fov: 30 }

// Step 2 only: one colour per paw so placement and identity can both be checked
// by eye. Step 3 swaps this for a fully transparent material.
const DEBUG_COLORS = { FL: '#e5484d', FR: '#30a46c', BL: '#3b82f6', BR: '#f5c400' }

function Leo() {
  const { scene } = useGLTF(MODEL_URL)
  return <primitive object={scene} />
}

useGLTF.preload(MODEL_URL)

function PawHitbox({ paw, onSelect }) {
  return (
    <mesh
      position={paw.pos}
      onClick={(e) => {
        e.stopPropagation()
        onSelect(paw.id)
      }}
    >
      <boxGeometry args={paw.size} />
      <meshBasicMaterial color={DEBUG_COLORS[paw.id]} transparent opacity={0.45} depthWrite={false} />
    </mesh>
  )
}

export default function LeoScene() {
  const [selected, setSelected] = useState(null)
  const selectedPaw = PAWS.find((p) => p.id === selected)

  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh' }}>
      <Canvas style={{ width: '100%', height: '100%' }} camera={CAMERA}>
        <hemisphereLight args={['#fff6ea', '#7d6b55', 1.1]} />
        <directionalLight position={[2.5, 4, 3]} intensity={2.2} />
        <directionalLight position={[-3, 1.5, -2]} intensity={0.5} />
        <Suspense fallback={null}>
          <Bounds fit clip observe margin={1.15}>
            <Leo />
            {PAWS.map((paw) => (
              <PawHitbox key={paw.id} paw={paw} onSelect={setSelected} />
            ))}
          </Bounds>
        </Suspense>
      </Canvas>

      {/* Step 2 debug readout. Step 4 replaces this with the real 2D card. */}
      <div
        style={{
          position: 'absolute',
          left: 16,
          right: 16,
          bottom: 16,
          padding: '14px 16px',
          borderRadius: 12,
          background: 'white',
          boxShadow: '0 2px 12px rgba(0,0,0,0.12)',
          font: '15px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
          textAlign: 'center',
          color: selectedPaw ? '#2d2d2d' : '#999',
        }}
      >
        {selectedPaw ? `${selectedPaw.id} — ${selectedPaw.label}` : 'Tap a paw'}
      </div>
    </div>
  )
}
