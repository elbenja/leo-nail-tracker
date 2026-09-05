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

**Ship this: `leo.glb` — 35,216 tris, 377 KB, meshopt-compressed.** Loaded with plain
`useGLTF`; drei enables the meshopt decoder by default, so no decoder setup is needed.

Source was `low poly Leo 3d model.glb`, generated with Tripo. It replaced an earlier
goldendoodle (see git history) which was 1.0 units tall and had its fur baked into a normal
map; this one is shorter and has the fur **sculpted into the geometry**, which changes how far
it can be decimated. See below.

| | |
|---|---|
| Triangles | 100,618 (55,201 verts) |
| Meshes | 1, named `meshes[0]` |
| Nodes | 1 |
| Skin / animations | none |
| Size | 3.4 MB |
| Materials | PBR — basecolor + metallicRoughness + normal |
| Orientation | Y-up, 0.719 units tall, origin centered between the feet |
| Bounds | x [-0.192, 0.192], y [0, 0.719], z [-0.500, 0.500] |

### Decimation — already done

```bash
npx @gltf-transform/cli simplify src.glb s.glb --ratio 0.35 --error 0.00075
# then drop the metallicRoughness map (see below) and:
npx @gltf-transform/cli optimize s.glb leo.glb --compress meshopt --texture-compress webp --simplify false
```

100,618 → 35,216 triangles, 3.4 MB → 377 KB.

**Do not decimate this model to ~5k the way the previous one was.** Its fur tufts are real
geometry, not a normal map, so aggressive simplification tears them into visible shards. This
was checked at 5.0k, 5.6k, 9.2k, 21.8k and 35.2k triangles against the original silhouette:
5–9k is badly blotched, 21.8k is acceptable, 35.2k is close to the original. Stripping the
normal map does **not** help — the damage is in the mesh, which is what distinguishes this
model from the old one.

**Compression is meshopt, deliberately.** It is what makes 35k tris affordable: the same 377 KB
budget buys ~5k triangles uncompressed. The decoder is ~25 KB and ships inside three, unlike
Draco's ~200 KB wasm fetched from a CDN — which is why Draco was rejected for the old model and
is still the wrong choice here.

Textures: basecolor + normal converted JPEG → WebP. The **metallicRoughness map is dropped**
(`roughnessFactor: 0.9`, `metallicFactor: 0`) — it cost 85 KB and made no visible difference on
a matte dog, and that budget went into geometry instead.

## Paw hitboxes

Measured from the actual mesh (clustered the bottom 12% of vertices; front and back paws
separate cleanly along z). Model-local coordinates:

```js
export const PAWS = [
  { id: 'FL', label: 'Front left',  pos: [ 0.041, 0.055,  0.209], size: [0.15, 0.13, 0.21] },
  { id: 'FR', label: 'Front right', pos: [-0.126, 0.055,  0.171], size: [0.15, 0.13, 0.21] },
  { id: 'BL', label: 'Back left',   pos: [ 0.144, 0.055, -0.284], size: [0.17, 0.13, 0.17] },
  { id: 'BR', label: 'Back right',  pos: [-0.047, 0.055, -0.356], size: [0.17, 0.13, 0.17] },
]
```

Measured on the 35k mesh and cross-checked against a 5k decimation of the same model; the
centers agreed within 0.001. `size` is padded past the measured paw for a comfortable tap
target, stopping short of the gap between each pair so no two boxes overlap.

### Left and right are Leo's, not yours

He faces +z with Y up, so **his left is +x**. `FL` is therefore the +x front cluster, which is
the paw on *your right* when you look at him head-on. The first version of these constants had
this mirrored — the ids were viewer-relative — which would have attached trimmed-nail history
to the wrong paw once the 2D card was wired up. The 2D tracker's `fl`/`fr`/`bl`/`br` keys are
anatomical, as a nail chart is.

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
