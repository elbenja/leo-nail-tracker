// Paw hitbox volumes in model-local coordinates, measured off leo.glb by
// clustering the bottom 12% of vertices. See docs/leo-3d-plan.md.
// Re-measure if the model is ever replaced or re-scaled.
//
// Left/right are LEO's, not the viewer's — that is what "front left" means on a
// nail chart, and these ids feed the 2D card. He faces +z, so his left is +x.
// Boxes are padded past the measured paw for a comfortable tap target; the
// padding stops short of the gap between each pair so they never overlap.
export const PAWS = [
  { id: 'FL', label: 'Front left', pos: [0.041, 0.055, 0.209], size: [0.15, 0.13, 0.21] },
  { id: 'FR', label: 'Front right', pos: [-0.126, 0.055, 0.171], size: [0.15, 0.13, 0.21] },
  { id: 'BL', label: 'Back left', pos: [0.144, 0.055, -0.284], size: [0.17, 0.13, 0.17] },
  { id: 'BR', label: 'Back right', pos: [-0.047, 0.055, -0.356], size: [0.17, 0.13, 0.17] },
]
