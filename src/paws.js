// Paw hitbox volumes in model-local coordinates, measured off leo.glb by
// clustering the bottom 12% of vertices. See docs/leo-3d-plan.md.
// Re-measure if the model is ever replaced or re-scaled.
export const PAWS = [
  { id: 'FL', label: 'Front left', pos: [-0.189, 0.05, 0.190], size: [0.20, 0.14, 0.20] },
  { id: 'FR', label: 'Front right', pos: [0.131, 0.05, 0.227], size: [0.20, 0.14, 0.23] },
  { id: 'BL', label: 'Back left', pos: [-0.080, 0.06, -0.369], size: [0.17, 0.14, 0.20] },
  { id: 'BR', label: 'Back right', pos: [0.168, 0.06, -0.365], size: [0.17, 0.14, 0.20] },
]
