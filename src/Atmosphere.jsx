import { useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { AdditiveBlending, BackSide, CanvasTexture, SRGBColorSpace, Vector3 } from 'three'

// Paints a texture with a 2D canvas instead of shipping an image file. Cheap,
// and it keeps the whole look editable from code.
function paintTexture(width, height, paint) {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  paint(canvas.getContext('2d'), width, height)
  const texture = new CanvasTexture(canvas)
  texture.colorSpace = SRGBColorSpace
  return texture
}

// A big inside-out sphere holding a vertical gradient — warm and lit near the
// floor, falling off to near-black overhead. Unlit and unfogged so it stays a
// clean backdrop rather than becoming part of the scene.
function Backdrop() {
  const texture = useMemo(
    () =>
      paintTexture(4, 512, (ctx, w, h) => {
        const gradient = ctx.createLinearGradient(0, 0, 0, h)
        gradient.addColorStop(0.0, '#5e3a1f')
        gradient.addColorStop(0.22, '#2e1d11')
        gradient.addColorStop(0.55, '#150e08')
        gradient.addColorStop(1.0, '#080605')
        ctx.fillStyle = gradient
        ctx.fillRect(0, 0, w, h)
      }),
    [],
  )

  return (
    <mesh>
      <sphereGeometry args={[24, 32, 32]} />
      {/* BackSide, not a negative scale: flipping scale inverts the winding and
          FrontSide then culls every face, leaving the page showing through. */}
      <meshBasicMaterial
        map={texture}
        side={BackSide}
        fog={false}
        depthWrite={false}
        toneMapped={false}
      />
    </mesh>
  )
}

// The floor Leo stands on. It fades out radially so it reads as a pool of light
// rather than a disc with a hard edge.
function Floor() {
  const alphaMap = useMemo(
    () =>
      paintTexture(256, 256, (ctx, w) => {
        const gradient = ctx.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2)
        gradient.addColorStop(0.0, '#ffffff')
        gradient.addColorStop(0.45, '#bbbbbb')
        gradient.addColorStop(1.0, '#000000')
        ctx.fillStyle = gradient
        ctx.fillRect(0, 0, w, w)
      }),
    [],
  )

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
      <circleGeometry args={[7, 64]} />
      <meshStandardMaterial
        color="#332215"
        roughness={0.95}
        metalness={0}
        alphaMap={alphaMap}
        transparent
      />
    </mesh>
  )
}

// Fake depth-of-field: soft additive discs that always sit behind Leo. Real
// bokeh needs a postprocessing pass; sprites with a radial falloff read the
// same at this scale and cost nothing.
const BOKEH = [
  [-1.6, 1.00, 0.0, 0.55, 0.26],
  [1.40, 0.70, 0.4, 0.38, 0.20],
  [0.10, 1.55, -0.3, 0.30, 0.16],
  [2.00, 0.40, -0.6, 0.45, 0.15],
  [-1.0, 0.35, 0.6, 0.32, 0.19],
  [-2.2, 1.35, -0.8, 0.25, 0.14],
  [0.90, 1.25, 0.9, 0.22, 0.22],
]

function Bokeh() {
  const group = useRef(null)
  const camera = useThree((state) => state.camera)
  const offset = useMemo(() => new Vector3(), [])

  const texture = useMemo(
    () =>
      paintTexture(128, 128, (ctx, w) => {
        const r = w / 2
        const gradient = ctx.createRadialGradient(r, r, 0, r, r, r)
        gradient.addColorStop(0.0, 'rgba(255,226,180,0.95)')
        gradient.addColorStop(0.55, 'rgba(255,198,132,0.35)')
        gradient.addColorStop(1.0, 'rgba(255,180,110,0)')
        ctx.fillStyle = gradient
        ctx.fillRect(0, 0, w, w)
      }),
    [],
  )

  // Keep the whole cluster on the far side of Leo from the camera, so orbiting
  // never swings a glowing disc in front of his face.
  useFrame(() => {
    if (!group.current) return
    offset.copy(camera.position).setY(0).normalize().multiplyScalar(-5)
    group.current.position.set(offset.x, 0, offset.z)
    group.current.lookAt(camera.position.x, 0, camera.position.z)
  })

  return (
    <group ref={group}>
      {BOKEH.map(([x, y, z, scale, opacity], i) => (
        <sprite key={i} position={[x, y, z]} scale={scale}>
          <spriteMaterial
            map={texture}
            blending={AdditiveBlending}
            opacity={opacity}
            transparent
            depthWrite={false}
            toneMapped={false}
          />
        </sprite>
      ))}
    </group>
  )
}

export default function Atmosphere() {
  return (
    <>
      <color attach="background" args={['#0a0705']} />
      <fogExp2 attach="fog" args={['#120c07', 0.085]} />
      <Backdrop />
      <Bokeh />
      <Floor />

      {/* Dim, cool base so shadowed fur keeps some shape instead of going flat black. */}
      <ambientLight intensity={0.22} color="#6a5a78" />

      {/* Key: warm, high and to the front-left, tight enough to pool on the floor.
          decay={2} is physically correct, so intensity has to be large at this range. */}
      <spotLight
        position={[2.6, 4.2, 3.0]}
        angle={0.55}
        penumbra={1}
        decay={2}
        intensity={260}
        color="#fff1d8"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0006}
        shadow-normalBias={0.02}
      />

      {/* Rim from behind, to lift Leo's edge off the dark backdrop. */}
      <directionalLight position={[-3.5, 2.2, -3]} intensity={2.4} color="#ffc98a" />

      {/* Weak bounce from the floor. */}
      <hemisphereLight args={['#ffd9b0', '#1a1008', 0.22]} />
    </>
  )
}
