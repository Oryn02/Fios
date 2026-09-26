import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'

const rootElement = document.getElementById('root')!;

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>
)

// Enable smooth theme surface transitions only after first paint (boot script already set tokens).
requestAnimationFrame(() => {
  document.documentElement.classList.add('theme-ready');
});
