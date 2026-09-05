# Leo 3D paw picker — build spec

Replace the current paw selection UI in the nail tracker with an interactive 3D Leo.

## What the 3D layer does

**Only one job: tell us which paw the user tapped.** Nothing else.

Everything after that — nail names, days since last cut, logged work — is a 2D React card
overlaid on the canvas. The 3D scene never knows what a nail is.

## Locked decisions

Do not re-litigate these without asking.

| Decision | Rationale |
|---|---|
| One model, four invisible hitboxes | Not per-nail geometry. Nails live on the 2D card. |
| Hitboxes, not mesh segmentation | Source GLB is a single merged mesh. Segmenting means Blender work; hitboxes need none, and give bigger tap targets on mobile. |
| No skeleton / no rig for v1 | Wag needs bones or a vertex shader. Not worth it yet. Personality comes from whole-object motion. |
| react-three-fiber | App is React. |
| Generic goldendoodle, not Leo's likeness | Reads fine at this scale, far cheaper to iterate. |

## The asset

**Ship this: `leo.glb` — 5,050 tris, 340 KB, no compression extensions.** Already decimated and
verified. Load it with plain `useGLTF`; no decoder setup needed.

Source was `lowpoly dog 3d model 1.glb`, generated with Tripo.

| | |
|---|---|
| Triangles | 101,022 (55,005 verts) |
| Meshes | 1, named `meshes[0]` |
| Nodes | 1 |
| Skin / animations | none |
| Size | 3.4 MB (~3 MB geometry, 0.41 MB textures) |
| Materials | PBR — basecolor + metallicRoughness + normal |
| Orientation | Y-up, 1.0 units tall, origin centered between the feet |
| Bounds | x [-0.287, 0.287], y [0, 1.0], z [-0.497, 0.497] |

It is "low poly" as a visual style only — the faceting is baked into a normal map on a dense mesh.

### Decimation — already done

```bash
npx @gltf-transform/cli simplify src.glb s.glb --ratio 0.05 --error 0.005
npx @gltf-transform/cli optimize s.glb leo.glb --compress false --texture-compress webp --simplify false
```

101,022 → 5,050 triangles, 3.4 MB → 340 KB. Silhouette verified at 3 angles against the
original; the goldendoodle read survives intact (it holds even at 3.4k, which is where
simplify floors out at this error tolerance — 5k is the safe pick since size is texture-bound
below that anyway).

**Compression is deliberately off.** Draco gets the file to 216 KB, but the Draco decoder wasm
is ~200 KB over the wire on first load — a net loss for a single small model. Revisit only if
several models ship (ears, teeth). Enable brotli on the server instead; that's free.

Textures were converted JPEG → WebP (418 KB → 187 KB), which is where most of the saving came
from. `EXT_texture_webp` is supported by three.js and all current browsers.

## Paw hitboxes

Measured from the actual mesh (clustered the bottom 12% of vertices; front and back paws
separate cleanly along z). Model-local coordinates:

```js
export const PAWS = [
  { id: 'FL', label: 'Front left',  pos: [-0.189, 0.05,  0.190], size: [0.20, 0.14, 0.20] },
  { id: 'FR', label: 'Front right', pos: [ 0.131, 0.05,  0.227], size: [0.20, 0.14, 0.23] },
  { id: 'BL', label: 'Back left',   pos: [-0.080, 0.06, -0.369], size: [0.17, 0.14, 0.20] },
  { id: 'BR', label: 'Back right',  pos: [ 0.168, 0.06, -0.365], size: [0.17, 0.14, 0.20] },
]
```

Re-measured on the decimated `leo.glb` — centers moved by at most 0.01 units from the original,
so these values are good for both. Still render the boxes with a debug material and confirm
visually before making them invisible. Re-measure if the model is ever replaced or re-scaled.

### Critical gotcha

In three.js, `object.visible = false` **also removes the object from raycasting.** An invisible
hitbox made that way will never receive a click.

Use a visible mesh with a fully transparent material instead:

```jsx
<meshBasicMaterial transparent opacity={0} depthWrite={false} />
```

Raycast against the hitbox list only — the dog mesh itself should not be interactive.

## Build order

1. r3f canvas + `useGLTF` load of the decimated model, orbit-locked camera (no free orbit —
   pick one or two flattering angles).
2. Four hitboxes with a debug material. Confirm each fires with the correct id, on desktop
   click and mobile tap.
3. Make hitboxes transparent. Add hover state — cursor change plus a subtle highlight on the
   whole dog (not on the paw; the paw isn't separable).
4. Wire selection to the 2D card overlay. Selected paw id is the only thing crossing the
   boundary.
5. Idle motion: slow breathing scale on Y, damped tilt toward cursor, small bounce on select.
6. ~~Decimate~~ — done, ship `leo.glb`.

## Non-goals for v1

- Tail wag, ear flop, or any skeletal animation
- Clicking individual nails in 3D
- Free camera orbit
- Ears / teeth tracking (later — each becomes another hitbox on the same model, same pattern)

## Verification

- Each of the four hitboxes returns its correct id, on desktop and on a real phone
- Tap targets comfortable one-handed on a phone — enlarge hitboxes if not
- Final GLB under 400 KB
- Scene holds 60fps on mid-range mobile
- Nail data flows through React state only; three.js never imports it
