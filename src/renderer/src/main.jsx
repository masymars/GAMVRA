import './assets/main.css'

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import MedicalAIApp from './App'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <MedicalAIApp />
  </StrictMode>
)
