import { useState, useEffect, useRef } from 'react'

export function DisconnectPopUp()
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

        
            <h1 className='dissConPop'>
                <div>
                    Player Has Disconnected... Waiting to reconnect
                </div>
                
                <svg className="spinner" viewBox="0 0 50 50" width="50" height="50">
                    <circle
                        cx="25" cy="25" r="20"
                        fill="none"
                        stroke="#e6af43"
                        stroke-width="2.5"
                        stroke-linecap= "round"
                        stroke-dasharray="30 15"
                    />
                </svg>
                
                
            </h1>
        </div>
    );
}