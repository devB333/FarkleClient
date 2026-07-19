import { useState, useEffect, useRef } from 'react';
import {io} from "socket.io-client";
import reactLogo from './assets/react.svg';
import viteLogo from './assets/vite.svg';
import heroImg from './assets/hero.png';
import UpdateSelected from './ScoreBoard.jsx';
import { Client } from './SocketConnection.js';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import {Game} from './Game.jsx';
import {Lobby} from './Lobby.jsx';
import {Room} from './Room.jsx';
import { SmokeBackground } from './Background.jsx';
import './App.css'

function App() 
{

  const client = useRef(null);
  const socket = useRef(null);

  if(!socket.current)
  {
      socket.current = io("http://localhost:3000")
     client.current = new Client(socket.current);// end client constructor
  }

  //<Game clientConn={client.current}/>
  useEffect(()=>{
     return () => {
    socket.current.disconnect()  // ← cleanup on when the component unmounts or the page ends
  }
},[])

    return (
      <BrowserRouter>
        <Routes>
            <Route path='/' element={<SmokeBackground/>}/>
        </Routes>
      </BrowserRouter>
    )
}

export default App
