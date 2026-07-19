import {useState, useRef, useEffect} from 'react';

export function Room()
{
    const [time, setTime] = useState(0);
      const timeRef = useRef(0);
      const frameRef = useRef(0);

       const pipPositions = {// pip positions on the dice, made in objects, made for 100x100 viewbox, size of the dice
        1: [[50, 50]],
        2: [[30, 30], [70, 70]],
        3: [[30, 30], [50, 50], [70, 70]],
        4: [[30, 30], [70, 30], [30, 70], [70, 70]],
        5: [[30, 30], [70, 30], [50, 50], [30, 70], [70, 70]],
        6: [[30, 30], [70, 30], [30, 50], [70, 50], [30, 70], [70, 70]],
        8: [[30, 10], [70, 100],]
    }



    const [dice, setDice] = useState(()=>{
        const newDice = [];

            newDice.push(createDie(0));

        return newDice;
    });


     // this is what increments time and keeps track of the current ref frame
      useEffect(()=>{
        
        let lastTime = performance.now();
    
        function animate (currTime){
          const deltaTime = (currTime - lastTime)/1000;// seconds
          lastTime = currTime;
    
          timeRef.current += deltaTime * 2; // 3 wobble speed
          setTime(timeRef.current);
    
          frameRef.current = requestAnimationFrame(animate)
        }
    
        frameRef.current = requestAnimationFrame(animate)
        return () => cancelAnimationFrame(frameRef.current) // cleanup, unmount
      },[]) // the [] mean only run once

        function wobblyEdge(x1, y1, x2, y2, seed, amp, time, isVert) {// react client side rendering funciton
            const segments = 4  // how many squiggles per edge
            let path = ''
            
            for (let i = 0; i < segments; i++) {
                // position along the edge (0 to 1)
                const t1 = i / segments
                const t2 = (i + 0.5) / segments  // midpoint of this segment
                const t3 = (i + 1) / segments    // end of this segment
                
                // interpolate points along the edge
                const midX = x1 + (x2 - x1) * t2
                const midY = y1 + (y2 - y1) * t2
                const endX = x1 + (x2 - x1) * t3
                const endY = y1 + (y2 - y1) * t3

                // alternate direction each segment
                const direction = i % 2 === 0 ? 1 : -1
                const offset = Math.sin(time * seed * (i + 1)) * amp * direction

                const isVertical = x1 === x2
                const ctrlX = isVertical ? midX + offset : midX
                const ctrlY = isVertical ? midY : midY + offset

                if(isVert) 
                path += `Q ${midX + offset} ${midY} ${endX} ${endY}`
                else
                path +=`Q ${midX} ${midY + offset} ${endX}  ${endY}`
            }

            return path
        }
       function wobblyDie(die, time) {// react client function
        const d = [
          `M 0 0`,                    // start at top-left corner
          wobblyEdge(0,0, 100,0, die.seed * 1.5, die.amp, time, false),     // top edge
          wobblyEdge(100,0, 100,100 , die.seed * 1.3, die.amp, time, true),     // right edge
          wobblyEdge(100,100, 0,100 , die.seed * 2, die.amp, time,false),     // bottom edge
          wobblyEdge(0,100, 0,0 , die.seed * 3, die.amp, time, true),     // left edge
          `Z`                           // close the path
        ].join(' ')

        return d
    }

    function createDie(id)
  {
    const die = {
      id: id,
      value: 8,
      x: 0,//Math.max(minDieRangeX, Math.min(maxDieRangeX, minDieRangeX + Math.random() * (maxDieRangeX - minDieRangeX))),
      y: 0,//Math.max(minDieRangeY, Math.min(maxDieRangeY, minDieRangeY + Math.random() * (maxDieRangeY - minDieRangeY))),
      seed: Math.random(),
      rotation: Math.random() * 360,
      amp:((Math.random() * 6) + 1),
      selected: false
    }
    return die;
  }

  function renderDisplayDice()
  {
    //console.log(bankedDice);
     return dice.map((die) => ( 
      <div key={die.id * -1} style={{margin:'0 0', display: 'flex', justifyContent:'center', width: '100vw',aspectRatio: '1/1',
                height: '100vh'
        
      }}>
        <svg viewBox="0 0 100 100" width = "100%" height = "100%"  style={{animation:'dieBankPopIn 0.75s ease-out'}}>
            <path d={wobblyDie(die,time)}/>
            {renderPips(die)}
        </svg>
       </div>
     ))
  }

   function renderPips(die)// this is client side rendering so it can stay
  {
    return pipPositions[die.value].map(([centerX,centerY], i) => {
      return <circle key={i} cx={centerX} cy={centerY} r={4} fill='#27a58c'/>
    })
  }

  function waveChar(charIndex, time)
{
  //const onlyPos = ((time + charIndex) % Math.PI) + Math.PI - 3; Makes sin only pos if you want, but I found it looks better like this
  const amp = 5; // amplitude of the sine wave for letters
  const y = Math.sin((time*3.7 + charIndex)) *  amp;
  
  return y;
}

function divBob(accleration,time, offset)
{
  const amp = 5;
  const y = Math.sin(time * accleration + offset) * amp
  return y;
}

function renderFloatingText(text,time)
{
  return text.split('').map((char,i)=>{
    const dy = waveChar(i,time);
    console.log(dy);
    return (
      <span style={{display:'inline-block', transform:`translateY(${dy}%)`, margin:'0.4em', fontFamily:"'Press Start 2P'", fontSize: '8vw'}}>
        {char}
      </span>
    )
  })
}

const [createRoomPress, updateCreateRoomPress] = useState(false);

    return (
        <div style={{}}>
                    <div style={{
                position: 'fixed',
                top: 0,
                left: 0,
                width: '100vw',
                height: '100vh',
                aspectRatio: '1/1'
            }}>
                {renderDisplayDice()}
            </div>
            <div style={{ height:'100vh', width: '100vw', display:'flex', justifyContent: 'center', alignItems:'center', flexDirection: 'column', zIndex: '3', position:'relative', gap:'5vh'}}>
                
                <div>
                    <h1>{renderFloatingText("Farkle", time)}</h1>
                </div>       
                
                <div style={{display: 'flex', flexDirection:'row', gap:'15vw'}}>
                  <h5 className="card-title" style={{fontFamily:"'Press Start 2P'", marginBottom:'15%', border:'10px solid #318071', padding: '10px', borderRadius:'25px', color:'ghostwhite', transform:`translate(${divBob(2, time, 3)}px,${divBob(0.5, time, 10)}px )`}}>Gertie</h5>
                  <h5 className="card-title" style={{fontFamily:"'Press Start 2P'", marginBottom:'15%', border:'10px solid #318071', padding: '10px', borderRadius:'25px', color:'ghostwhite', transform:`translate(${divBob(2, time, 25)}px,${divBob(0.5, time, 10)}px )`}}>Dev</h5>
                </div>

                <div stlye={{display:'flex', flexDirection:'row'}}>
                  <button className='LobbyBtns'style={{fontFamily:"'Press Start 2P'"}}>
                      Start Game
                  </button>
                </div>
            </div>  
        </div>
        
    );
}