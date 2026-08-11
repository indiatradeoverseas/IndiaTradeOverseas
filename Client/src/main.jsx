import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { GoogleOAuthProvider } from '@react-oauth/google'
import './index.css'
import App from './App.jsx'

// Prerendered pages (see scripts/prerender.mjs) ship with real static markup
// already inside #root for crawlers/first paint, but always still get a
// plain client render here rather than hydrateRoot - framer-motion's
// entrance animations leave the prerendered DOM in its post-animation
// state, which doesn't match the initial={{opacity:0,...}} state React
// expects to hydrate onto, so hydrateRoot reliably mismatches and falls
// back to a full client render anyway. createRoot gets the same end
// result without the console errors along the way.
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID}>
      <App />
    </GoogleOAuthProvider>
  </StrictMode>,
)
