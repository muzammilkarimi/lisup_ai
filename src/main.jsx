import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import Onboarding from './components/Onboarding.jsx'
import './index.css'

// The same bundle serves two windows: the floating bar (default) and the
// first-run setup wizard (#onboarding).
const Root = window.location.hash === '#onboarding' ? Onboarding : App

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>
)
