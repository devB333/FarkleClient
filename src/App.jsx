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
  
  let sessionID = localStorage.getItem('sessionID'); // was sessionStorage
  if (!sessionID) {
  sessionID =  Date.now().toString(36) +
        Math.random().toString(36).slice(2); //crypto.randomUUID()
  localStorage.setItem('sessionID', sessionID); // was sessionStorage
}


  if(!socket.current)
  {                           // for running on localHost machine: localHost:3000
    const socketUrl = import.meta.env.VITE_SOCKET_URL;
      socket.current = io(socketUrl,{
        auth: {sessionID: sessionID}
      }) //for testing with phone over local neetwrok: http://10.0.0.189:3000
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
            <Route path='/' element={<Lobby clientConn={client.current}/>}/>
            <Route path='/room' element={<Room clientConn={client.current}/>}/>
            <Route path='/game' element={<Game clientConn={client.current}/>}/>
        </Routes>
      </BrowserRouter>
    )
}

export default App
