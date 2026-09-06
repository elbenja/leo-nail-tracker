import { useMemo } from 'react'
import { BackSide, CanvasTexture, SRGBColorSpace } from 'three'

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

// A big inside-out sphere holding a vertical gradient — a seamless studio
// cyclorama: warm sand overhead, brightening to cream at eye level where Leo
// stands. Unlit and unfogged so it stays a clean backdrop rather than becoming
// part of the scene.
function Backdrop() {
  const texture = useMemo(
    () =>
      paintTexture(4, 512, (ctx, w, h) => {
        const gradient = ctx.createLinearGradient(0, 0, 0, h)
        gradient.addColorStop(0.0, '#d3c3a8')
        gradient.addColorStop(0.30, '#ddd0b8')
        gradient.addColorStop(0.58, '#ece3d2')
        gradient.addColorStop(0.80, '#e6dcc8')
        gradient.addColorStop(1.0, '#dccfb7')
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

// The floor Leo stands on. It fades out radially so it dissolves into the
// backdrop rather than ending on a hard edge.
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
        color="#f2ead9"
        roughness={0.92}
        metalness={0}
        alphaMap={alphaMap}
        transparent
      />
    </mesh>
  )
}

export default function Atmosphere() {
  return (
    <>
      <color attach="background" args={['#e6dcc8']} />
      <fogExp2 attach="fog" args={['#e9e0ce', 0.055]} />
      <Backdrop />
      <Floor />

      {/* Bright, warm-neutral fill so nothing falls to black — but kept under
          the key, or the facets flatten out into one creamy blob. */}
      <ambientLight intensity={0.8} color="#fff1de" />

      {/* Key: warm, high and to the front-left. Wide and soft, and strong enough
          over the fill to shape the facets and drop a contact shadow.
          decay={2} is physically correct, so intensity has to be large at this range. */}
      <spotLight
        position={[2.6, 4.2, 3.0]}
        angle={0.75}
        penumbra={1}
        decay={2}
        intensity={155}
        color="#fff4e4"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0006}
        shadow-normalBias={0.02}
      />

      {/* Rim from behind. Faint now — a bright backdrop already separates Leo,
          so this just keeps his back edge from merging into it. */}
      <directionalLight position={[-3.5, 2.2, -3]} intensity={0.5} color="#ffe0b8" />

      {/* Bounce: cream from above, warm sand kicking back off the pale floor. */}
      <hemisphereLight args={['#fff6e8', '#e8dcc4', 0.7]} />
    </>
  )
}
