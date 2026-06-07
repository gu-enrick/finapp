import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Toaster } from 'react-hot-toast'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Toaster position="bottom-right" toastOptions={{
      duration: 3000,
      style: { fontSize: '14px' },
    }} />
    <App />
  </StrictMode>,
)