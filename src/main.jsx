import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// גופן Heebo – ארוז בתוך האפליקציה (עובד גם בלי אינטרנט)
import '@fontsource/heebo/400.css'
import '@fontsource/heebo/500.css'
import '@fontsource/heebo/700.css'
import '@fontsource/heebo/800.css'
import '@fontsource/heebo/900.css'
import './index.css'
import App from './App.jsx'
import { applyTheme, getStoredTheme } from './lib/ui'

// מחילים את ערכת הנושא עוד לפני הציור הראשון – בלי "הבזק" לבן במצב כהה
applyTheme(getStoredTheme())

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
