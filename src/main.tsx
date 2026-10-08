import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import { App } from './ui/App'
import './styles.css'

registerSW({ immediate: true })

const rootElement = document.getElementById('root')
if (!rootElement) throw new Error('Корневой элемент приложения не найден.')

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>
)
