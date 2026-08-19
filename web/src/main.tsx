/**
 * 入口：把 App 掛到 index.html 的 #root。
 * StrictMode 在開發時會刻意跑兩次 effect，用來抓副作用；正式環境不會這樣。
 */
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
