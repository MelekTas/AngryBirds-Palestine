import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx' // .tsx uzantısına dikkat
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)