import { useState, useEffect, useRef } from 'react'

export function WinGamePopUp({name, winningScore, otherScore, clientConn})
{
    return(
        <div 
            style={{width: '100dvw', 
                height: '100dvh',
                zIndex: '9',
                backgroundColor: '#07060669',
                position: 'absolute'
            }}
        >

        
            <h1 className='hasWon'>
                <div>
                    {name} Wins! <br/> <br/> Final Score: <br/> {winningScore} to {otherScore}
                </div>
                
                <div>
                    <button style={{marginLeft: '10px', display:'inline-block'}} className='LobbyBtns'
                    onPointerUp={()=>{clientConn.emitNewGame()}}
                    >Play Again?</button>
                </div>
                
            </h1>
        </div>
    );
}