import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import './index.css'
import App from './App.jsx'
import ConfirmEmail from './pages/ConfirmEmail.jsx'
import ResetPassword from './pages/ResetPassword.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Toaster position="bottom-right" toastOptions={{ duration: 3000, style: { fontSize: '14px' } }} />
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/confirm" element={<ConfirmEmail />} />
        <Route path="/reset-password" element={<ResetPassword />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>
)