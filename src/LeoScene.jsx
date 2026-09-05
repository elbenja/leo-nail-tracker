import { Suspense, useCallback, useEffect, useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls, useGLTF } from '@react-three/drei'
import { Box3, Sphere, Vector3 } from 'three'
import { PAWS } from './paws.js'

// leo.glb is Y-up, 0.72 units tall, origin centered between the feet, and faces
// +z (the front paws sit at positive z). See docs/leo-3d-plan.md.
const MODEL_URL = '/leo.glb'

// The geometry is meshopt-compressed; drei wires that decoder up by default, so
// plain useGLTF is all this needs.

// Only the starting angle — a three-quarter view from Leo's front left. The rig
// below picks the distance, and OrbitControls takes over once you drag.
const CAMERA = { position: [1.85, 1.05, 2.5], fov: 30, near: 0.01, far: 100 }

// How much empty space to leave around whatever the camera is framing.
const WHOLE_DOG_MARGIN = 1.15
const PAW_MARGIN = 1.25

// Paws sit on the floor, so preserving the orbit direction exactly would frame a
// selected paw edge-on. Keep the azimuth the user chose, but always look down at
// it from this angle above the horizon.
const PAW_ELEVATION = 0.45

// A click that travels further than this many pixels was a camera drag, not a
// tap. Without it every orbit gesture would also select or deselect a paw.
const DRAG_SLOP = 4

// Distance at which a sphere of `radius` just fills the frame. Uses whichever of
// the two fields of view is tighter, so it fits on a narrow phone as well as a
// wide desktop window.
function fitDistance(radius, camera, margin) {
  const vFov = (camera.fov * Math.PI) / 180
  const hFov = 2 * Math.atan(Math.tan(vFov / 2) * camera.aspect)
  return (margin * radius) / Math.tan(Math.min(vFov, hFov) / 2)
}

const pawRadius = (paw) => 0.5 * Math.hypot(...paw.size)

function Leo({ onMeasure }) {
  const { scene } = useGLTF(MODEL_URL)

  useEffect(() => {
    const sphere = new Box3().setFromObject(scene).getBoundingSphere(new Sphere())
    onMeasure({ center: sphere.center.clone(), radius: sphere.radius })
  }, [scene, onMeasure])

  return <primitive object={scene} />
}

useGLTF.preload(MODEL_URL)

// Drives the camera to whatever is selected: a paw, or the whole dog when
// nothing is. It keeps the current viewing direction and only changes distance
// and target, so a zoom never yanks the dog round to a different side.
function CameraRig({ selected, dog }) {
  const { camera, size } = useThree()
  const controls = useThree((state) => state.controls)
  const goal = useRef(null)

  useEffect(() => {
    if (!controls || !dog) return
    const paw = PAWS.find((p) => p.id === selected)
    const center = paw ? new Vector3(...paw.pos) : dog.center
    const radius = paw ? pawRadius(paw) : dog.radius
    const margin = paw ? PAW_MARGIN : WHOLE_DOG_MARGIN

    const direction = camera.position.clone().sub(controls.target)
    if (direction.lengthSq() === 0) direction.fromArray(CAMERA.position)
    direction.normalize()

    if (paw) {
      const azimuth = new Vector3(direction.x, 0, direction.z)
      if (azimuth.lengthSq() === 0) azimuth.set(0, 0, 1)
      azimuth.normalize().multiplyScalar(Math.cos(PAW_ELEVATION))
      direction.set(azimuth.x, Math.sin(PAW_ELEVATION), azimuth.z)
    }

    goal.current = {
      position: center.clone().addScaledVector(direction, fitDistance(radius, camera, margin)),
      target: center.clone(),
    }
  }, [selected, dog, controls, camera, size])

  // Any drag or wheel hands control back to the user mid-flight.
  useEffect(() => {
    if (!controls) return
    const cancel = () => {
      goal.current = null
    }
    controls.addEventListener('start', cancel)
    return () => controls.removeEventListener('start', cancel)
  }, [controls])

  useFrame((_, delta) => {
    const to = goal.current
    if (!to || !controls) return

    const k = 1 - Math.exp(-6 * delta)
    camera.position.lerp(to.position, k)
    controls.target.lerp(to.target, k)
    controls.update()

    if (camera.position.distanceTo(to.position) < 0.001) {
      camera.position.copy(to.position)
      controls.target.copy(to.target)
      controls.update()
      goal.current = null
    }
  })

  return null
}

function PawHitbox({ paw, onSelect }) {
  return (
    <mesh
      position={paw.pos}
      onClick={(e) => {
        e.stopPropagation()
        if (e.delta > DRAG_SLOP) return
        onSelect(paw.id)
      }}
      onPointerOver={(e) => {
        e.stopPropagation()
        document.body.style.cursor = 'pointer'
      }}
      onPointerOut={() => {
        document.body.style.cursor = ''
      }}
    >
      <boxGeometry args={paw.size} />
      {/* Not visible={false}: three.js drops invisible objects from raycasting,
          so the box would never be clickable. A fully transparent material hides
          it while keeping it a hit target. */}
      <meshBasicMaterial transparent opacity={0} depthWrite={false} />
    </mesh>
  )
}

export default function LeoScene() {
  const [selected, setSelected] = useState(null)
  const [dog, setDog] = useState(null)
  const pointerDownAt = useRef(null)
  const selectedPaw = PAWS.find((p) => p.id === selected)

  const onMeasure = useCallback((measurement) => setDog(measurement), [])

  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh' }}>
      <Canvas
        style={{ width: '100%', height: '100%' }}
        camera={CAMERA}
        onPointerDown={(e) => {
          pointerDownAt.current = [e.clientX, e.clientY]
        }}
        onPointerMissed={(e) => {
          if (e.button !== 0) return
          const from = pointerDownAt.current
          if (from && Math.hypot(e.clientX - from[0], e.clientY - from[1]) > DRAG_SLOP) return
          setSelected(null)
        }}
      >
        <hemisphereLight args={['#fff6ea', '#7d6b55', 1.1]} />
        <directionalLight position={[2.5, 4, 3]} intensity={2.2} />
        <directionalLight position={[-3, 1.5, -2]} intensity={0.5} />

        <OrbitControls
          makeDefault
          enablePan={false}
          enableDamping
          minDistance={0.1}
          maxDistance={6}
          maxPolarAngle={Math.PI * 0.49}
        />
        <CameraRig selected={selected} dog={dog} />

        <Suspense fallback={null}>
          <Leo onMeasure={onMeasure} />
          {PAWS.map((paw) => (
            <PawHitbox key={paw.id} paw={paw} onSelect={setSelected} />
          ))}
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
        {selectedPaw ? `${selectedPaw.id} — ${selectedPaw.label} · tap away to zoom out` : 'Tap a paw · drag to rotate · scroll to zoom'}
      </div>
    </div>
  )
}
