import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'


function createServerConn()
{

}
// use <strict mode> for testing but it doesnt work when testing backend logic because it runs everything twice
createRoot(document.getElementById('root')).render(
  
    <App/>
  
)
