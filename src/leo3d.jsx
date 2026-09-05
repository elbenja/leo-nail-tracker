import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import LeoScene from './LeoScene.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <LeoScene />
  </StrictMode>,
)
