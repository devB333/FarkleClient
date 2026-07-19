import { useState, useEffect, useRef } from 'react'
import {io} from "socket.io-client"
import reactLogo from './assets/react.svg'
import viteLogo from './assets/vite.svg'
import heroImg from './assets/hero.png'
import UpdateSelected from './ScoreBoard.jsx'
import { Client } from './SocketConnection.js'
import './App.css'

export function Game({clientConn}) {
  const [playerNumber, updatePlayerNumber] = useState(0);// number that the player is, makes it eaiser to idenitfy them, will be passed after they join the room
  const [playersRound, updatePlayersRound] = useState(0);// whos round it is to play, set after the game hasStarted
  
  const INTERNAL_CANVAS_WIDTH = 500;
  const INTERNAL_CANVAS_HEIGHT = 281; // 500 * 9/16 ≈ 281, matches 16:9

  const canvasWidth = useRef(null);
  const canvasHeight = useRef(null);

    const [canvasSize, setCanvasSize] = useState({
    width: 500,
    height: 281
  });

  const diceBoardRef = useRef(null);

const scaleX = canvasSize.width / INTERNAL_CANVAS_WIDTH;
const scaleY = canvasSize.height / INTERNAL_CANVAS_HEIGHT;

 const [isNewRound, setIsnewRound] = useState(false); // this controls if its the next players turn, if it is the ui will swap to their name underlined, and the next time they hit roll, it will start their round and rerender/reroll the dice as 6 again.
 const [playerScores, updatePlayerScores] = useState([0,0]);// array that holds player scores (0 = player1 & 1 = player 2)

  const [dice, updateDice] = useState([]);// as long as dice is empty it will just skip this render because the array is empty so it will skip the map in renderDice


  const maxDieRange = 450; // these are the max and min values for x and y of the range in which the dice can land
  const minDieRange = 25; 

  const [bankButtonPressed, setBankPressed] = useState(false); // these are used to handle the ui
  const[endRoundButtonPressed, setEndRoundButtonPressed] = useState(false);// these are used to handle the ui buttons
  const [rollButtonPressed, setRollButtonPressed] = useState(false);

  const [hasRolled, updateHasRolled] = useState(true);// used to make sure the bank button can't be spammed (should only be able to bank if you have rolled once)
  // let hasRolled start on true so that they can bank their first dice, (controls both banking and rolling)
  

  const [hasBusted, updateHasBusted] = useState(false);// this is used to allow the player to reroll, only if roundScore > prevRoundScore can they roll again
  const [roundScore, updateRoundScore] = useState(0); // used to track and display the current score for this players entier round
  const [pendingScore, newPendingScore] = useState(0);// used to display current pending score on UI of the selected dice before they are banked and also work the canBankUI. Call this in handleBnaking after the banking is done to update the roundScore as well
  const [selectedDice, setSelectedDice] = useState([]);// this is used to track what dice are selected when they are banked, the object die.selected = bool in dice is what actually handles showing dice selected or not
  const [bankedDice, setBankedDice] = useState([]);// these are the dice banked by the player, used displaying banked dice

  const [time, setTime] = useState(0)
  const timeRef = useRef(0)
  const frameRef = useRef(0)

  const hasBeenAvailableBank = useRef(false);
  const hasBeenAvailableRoll = useRef(false);
  const hasBeenAvailableScore = useRef(false);

  // diagonal is used in checkIfOverlapping
  const diagonal = Math.sqrt(100*100 + 100*100)// the diagnoal of the square, or the max length if the square is roatated that we must account for

  const pipPositions = {// pip positions on the dice, made in objects, made for 100x100 viewbox, size of the dice
    1: [[50, 50]],
    2: [[30, 30], [70, 70]],
    3: [[30, 30], [50, 50], [70, 70]],
    4: [[30, 30], [70, 30], [30, 70], [70, 70]],
    5: [[30, 30], [70, 30], [50, 50], [30, 70], [70, 70]],
    6: [[30, 30], [70, 30], [30, 50], [70, 50], [30, 70], [70, 70]],
  }

  function renderPips(die)// this is client side rendering so it can stay
  {
    return pipPositions[die.value].map(([centerX,centerY], i) => {
      return <circle key={i} cx={centerX} cy={centerY} r={4} fill='orange'/>
    })
  }

 useEffect(() => {
  function updateSize() {
    if (diceBoardRef.current) {
      setCanvasSize({
        width: diceBoardRef.current.clientWidth,
        height: diceBoardRef.current.clientHeight
      });
    }
  }

  updateSize();

  window.addEventListener("resize", updateSize);

  return () => window.removeEventListener("resize", updateSize);
}, []);

  // checks if dice are overlapping by taking the center of each die and using the pythgorean theorem to get distance between both 2D
  //Get the overlap ammount
  //nomralize the vector by dx by the distance
  // then use normalized x and y vectors to figure out how much to move the object
  function isOverlapping(dieA, dieB)
  {
    // diagonal is used in checkIfOverlapping
    // diagnoal runs off the assumption that the square is 100 by 100
    const diagonal = Math.sqrt(100*100 + 100*100)// the diagnoal of the square, or the max length if the square is roatated that we must account
    
    const dx = (dieA.x + 50) - (dieB.x + 50)
    const dy = (dieA.y + 50) - (dieB.y + 50)
    const dist = Math.sqrt(dx*dx + dy*dy) || 1
    return dist < diagonal// if overlapping will return true because dist between them is less thant the diamater of the square
      
  }

  // runs a descending for loop to  check if the genrated die is overlapping with any other previous genrated die.
  // the logic is that we do a bottom up building approach, so we make sure the first die is not overlapping with any dice
  // then the second, then third and so on, and by the end none will be overlapping
  // we nest a while loop inside the for loop so that we can make sure its not overlapping again, and then 
  // after that we restart the for loop and make it go through all the dice again to ensure it has not interfeared with any other dice as well.
  function overlapCheck(die, diceArr)
  {
      console.log("hello")
      const whileLimit = 1000;
      var whileCounter = 0;

      for(let i = die.id - 1; i >= 0; i--)
      {
        console.log("in");
        var wasOverlapping = false;

        //console.log(diceArr.size + " " + i)
        while(isOverlapping(die, diceArr[i]))// until the die is not overlapping run this
        {

          console.log("in while");
          if(whileLimit == whileCounter)
          {
            console.log("limit reached");
            break;
          }
            
          wasOverlapping = true;
          die.x = Math.max(minDieRange, Math.min(maxDieRange,  minDieRange + (Math.random()) * (maxDieRange -minDieRange)));
          die.y = Math.max(minDieRange, Math.min(maxDieRange, minDieRange + (Math.random()) * (maxDieRange -minDieRange)));
          whileCounter++;
        }

        if(wasOverlapping)
          i = die.id;
      }
  }

  // this will create the dice for each one
  //sent to server
  function createDie(id, amp, diceArr)
  {
    

    const die = {
      id: id,
      value: Math.floor(Math.random()* 6) + 1,
      x: Math.max(minDieRange, Math.min(maxDieRange,  minDieRange + (Math.random()) * (maxDieRange -minDieRange))),
      y: Math.max(minDieRange, Math.min(maxDieRange, minDieRange + (Math.random()) * (maxDieRange -minDieRange))),
      seed: Math.random(),
      rotation: Math.random() * 360,
      amp: amp,
      selected: false
    }
    return die;
  }
  
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
          `M 10 10`,                    // start at top-left corner
          wobblyEdge(10,10, 90,10, die.seed * 1.5, die.amp, time, false),     // top edge
          wobblyEdge(90,10, 90,90 , die.seed * 1.3, die.amp, time, true),     // right edge
          wobblyEdge(90,90, 10,90 , die.seed * 2, die.amp, time,false),     // bottom edge
          wobblyEdge(10,90, 10,10 , die.seed * 3, die.amp, time, true),     // left edge
          `Z`                           // close the path
        ].join(' ')

        return d
}

function wobblyRect()
{

  const seed = 2;
  const amp = 1;

  const d = [
    'M 10 10',
    wobblyEdge(10,10, 90,10, seed, amp, time, false),     // top edge
    wobblyEdge(90,10, 90,45, seed, amp, time, true),     // right edge
    wobblyEdge(90,45, 10,45, seed, amp, time, false),     // right edge
    wobblyEdge(10,45, 10,10, seed, amp, time, true),     // right edge
    'Z'
  ].join(' ');

  return d;
}


function wobblyOval(cx, cy, radiusX, radiusY, points, seed, amp) {
  let coords = [];

  for(let i = 0; i < points; i++) {
    const angle = (i / points) * Math.PI * 2;
    let x = Math.cos(angle) * radiusX;
    let y = Math.sin(angle) * radiusY;

    const wobble = Math.sin(time * seed + i) * amp;
    x += Math.cos(angle) * wobble;
    y += Math.sin(angle) * wobble;

    coords.push([cx + x, cy + y]);
  }

  // Start at midpoint between LAST and FIRST point
  const startMidX = (coords[coords.length - 1][0] + coords[0][0]) / 2;
  const startMidY = (coords[coords.length - 1][1] + coords[0][1]) / 2;

  let path = `M ${startMidX} ${startMidY}`;

  for (let i = 0; i < coords.length; i++) {
    const current = coords[i];
    const next = coords[(i + 1) % coords.length];
    const midX = (current[0] + next[0]) / 2;
    const midY = (current[1] + next[1]) / 2;

    path += ` Q ${current[0]} ${current[1]} ${midX} ${midY}`;
  }

  return path + " Z";
}

function wobblyLine(x1, x2, cy, amp, wobbles, time)
{
  const distance = x2 - x1;
  const increment = distance/wobbles;

  let cords = [x1];
  let yCords = [cy + Math.sin(time)];
  let d = ` M ${x1} ${cy}`

  console.log(wobbles)
  for(let i = 1; i <= wobbles; i++)
  {
    cords.push(cords[i-1] + increment);
    
  }

  for (let i = 1; i < cords.length; i++)
  {
    const jitter = getJitter(i - 0.5) * 0.3;
    const direction = i % 2 == 0 ? 1 : -1;
    const newY = cy + Math.sin((time * 3) + ((i/wobbles) * Math.PI * 2 * 5)) + (jitter) * 2 + Math.sin((time * 23) + (i/wobbles) * Math.PI * 2 * 13) * (amp * 0.3) + jitter * 4;
    yCords.push(newY);

    d += ` Q ${cords[i-1]} ${yCords[i-1]} ${cords[i]} ${yCords[i]}`
  }


  
  return d;
}

function getJitter(seed)
{
  return Math.sin(seed * 12.545454 * 75);
}

useEffect(()=>{
    // this is a way to expose state change functions via callbacks as objects in the client function
      clientConn.addStateChangeCallback("onBankButtonPressed", (state) => {
       setBankPressed(state);// were passing the setBankPressed function via a lambda, to be acessed like an object via onBankButtonPressed. It will look like: sateChangeCallbacks.onBankButtonPressed(state); That is the client Class equivenlnt of setBankPressed(state);
      });
      clientConn.addStateChangeCallback("setPlayerNumber", (newPlayerNum) => {
        updatePlayerNumber(newPlayerNum);});

      clientConn.addStateChangeCallback("onNewDice", (newDiceArr, pendingPoints, hasRolled, hasBusted, playersRound) => {// this will be used to update dice and pending points for selected dice/ genral purpose dice update
        updateDice(newDiceArr);
        updateHasBusted(hasBusted);
        newPendingScore(pendingPoints);
        updateHasRolled(hasRolled); // lets the player bank because they are looking at fresh dice, only if dice were rolled from a reRoll button not selectDice or prepares it for new player if they have busted
        updatePlayersRound(playersRound);// set new player up for next round

        console.log("Curr Val: " + hasBusted );

        console.log(pendingScore + " " + hasRolled);
        if((pendingScore > 0) && (hasRolled == false))
        {
          hasBeenAvailableBank.current = true;
          console.log("Bank Set")
        }
        if(hasRolled)
          hasBeenAvailableRoll.current = true;

        console.log("This is has rolleed "+hasRolled);

        if(hasBusted)
        {
          setIsnewRound(true);
          
          console.log("Busted!" + playersRound);
          toggleBustScreen();
        }

         clientConn.addStateChangeCallback("newRoundStart", ()=>{// sets isnewRound to false if the rolled that triggered it was starting a new round
        setIsnewRound(false);}); 
      
        clientConn.addStateChangeCallback("returnHandleBanking", (newBankedDice, newRoundScore) => {// this will be used to sync and update the banked dice and currRoundScore, after the dice have been banked.
        setBankedDice(newBankedDice);
        updateRoundScore(newRoundScore);

        hasBeenAvailableScore.current = true;
        console.log("this had been set to true");
      }); 
      clientConn.addStateChangeCallback("returnHandleScore", (newBankedDice, newPlayerScore, playerScoring, playerOneScore, playerTwoScore, playersRound) => {// this will be used to update the respective players score as well as sync bankedDice reset and switch turns using playerScoring logic to derive which player is next, maybe also recive the checkGameBool here too
        //console.log(playerScores);
        let newPlayerScores = [...playerScores];
        
        newPlayerScores[0] = playerOneScore;// need to -1 from playerScoring because emission passes 1 || 2
        newPlayerScores[1] = playerTwoScore;

        //console.log(newPlayerScores);

        console.log(playersRound);
        updatePlayersRound(playersRound);// set new player up for next round
        
        setIsnewRound(true);
        updateHasRolled(false);// prepare hasRolled so the next player can start the round by rolling the dice
        updatePlayerScores(newPlayerScores);

        
        updateRoundScore(0);// prepare round score back to 0
        setBankedDice(newBankedDice);// prepare bankedDice blank
        
     }); // closes returnHandleScore callback

    }); // closes onNewDice arrow body + closes addStateChateCallBack("onNewDice", ...) call

  }, []); // closes useEffect arrow body + closes useEffect(...) call
          

     


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


  /* this function was never used
function changeDieLocation(die, newX, newY) // die you want to find
  {
    // 400 is the ContainerSize - Size of the Die, because the 
    // point where the square is placed is always the top left, so 
    // this accounts for if the square is right on the 500 mark, it will
    // never let it do that, ebcause then it would be going over by 100
    die.x = Math.max(0, Math.min(400, die.x + newX))
    die.y = Math.max(0, Math.min(400, die.y + newY))
  }
  */


  // this makes a zig zag circle that engulfs the die for when the die is selected
  // this uses a circle as the basis for the spikes
  function zigZagCircle(cx, cy, radius, spikes, time, seed)// react client side function
  {
      // maybe add a pulse radius to make it pop out and then settle, might look cool
      // you would use something like this: const pulsedRadius = radius + Math.sin(time * 2) * 15
      // but you would also need to trakc how long the die has been selected for so it could settle
      // and you would need to make sure that the radius starts small and then grows so maybe as time grows add a little fixed ammount each time until it reaches a threshold then interpolate back down

    const points = spikes * 2;
    let path = '';

    

    for(let i = 0; i <= points; i ++)
    {
      const angle = (i / points) * Math.PI * 2;
      const wobble = i % 2 == 0 ? radius + 8 : radius - 8;
      const animated = wobble + Math.sin(time * seed + i) * 3;

      const newX = cx + Math.cos(angle) * animated;
      const newY = cy + Math.sin(angle) * animated;

      path += i == 0? `M ${newX} ${newY}` : `L ${newX} ${newY}`;
    }

    return path + ' Z';
  }

  // this uses an oval as the basis for the spikes but just seprating the x and y radius
  function zigZagOval(cx, cy, radiusX, radiusY, spikes, time, seed)// react client side function
  {
     const points = spikes * 2;
    let path = '';

    

    for(let i = 0; i <= points; i ++)
    {
      const angle = (i / points) * Math.PI * 2;
      const wobbleX = i % 2 == 0 ? radiusX + 8 : radiusX - 8;
      const wobbleY = i % 2 == 0 ? radiusY + 8 : radiusY - 8

      const animatedX = wobbleX + Math.sin(time * seed + i) * 3;
      const animatedY = wobbleY + Math.sin(time * seed + i) * 3;

      const newX = cx + Math.cos(angle) * animatedX;
      const newY = cy + Math.sin(angle) * animatedY;

      path += i == 0? `M ${newX} ${newY}` : `L ${newX} ${newY}`;
    }

    return path + ' Z';
  }

  function textBtnSway(cx, time, seed)
  {
    return cx + Math.sin(time * seed) * 3;
  }

  function toggleBustScreen()
  {

  }
  
  // runs the overlap check
  /*
  function startOverlapCheck(diceToFix)
  {
    var noneOverlapping = false
    let maxIterations = 5  // safety escape
    let iterations = 0

    while(noneOverlapping == false)
    {
      
      if (iterations > maxIterations) {
        console.log('escape — too many iterations')
        break  // force break out
      }

      noneOverlapping = true
      var overLapTemp = true
      for(let i = 0; i < diceToFix.length; i++)
      {
        for (let j = i +1; j < diceToFix.length; j++)
        {
          overLapTemp = isOverlapping(diceToFix[i],diceToFix[j])
          
          
          if (!overLapTemp)
          {
              noneOverlapping = false
              
          }
            
        }
      }
      iterations++
    }
    
    return diceToFix
  }
    */


/*
  const [dice, updateDice] = useState(() => {

    // make this a loop for more effiecency when you want to
   const initialDice = []
      initialDice.push(createDie(0, 2, initialDice));
      overlapCheck(initialDice[0], initialDice);
      initialDice.push(createDie(1, 1, initialDice));
      overlapCheck(initialDice[1], initialDice);
      initialDice.push(createDie(2, 2, initialDice));
      overlapCheck(initialDice[2], initialDice);
      initialDice.push(createDie(3, 4, initialDice));
      overlapCheck(initialDice[3], initialDice);
      initialDice.push(createDie(4, 3, initialDice));
      overlapCheck(initialDice[4], initialDice);
      initialDice.push(createDie(5, 2, initialDice));
      overlapCheck(initialDice[5], initialDice);
    
    
    
    return initialDice
  })
  */

  //this function will genrate new dice to reroll
  // passed to server
  function reRollDice(howManyToReroll)
  {
    console.log("gonna reroll")
    clientConn.emitRerollDice(isNewRound);// if its a new round we want to reroll all 6 dice no matter what
  }
    

  function calcDicePoints(diceToCheck, selectedDiceCheck)// selectedDiceCheck is a bool variable (put true if you want to only check selected dice) that exists because if youre checking if all the dice have any valid points you don't care about keeping dice that don't contribute, but for acutal scoring you do. Basically to check for busts we need to check all the dice at once to see if theres any acceptable combo of dice, but using selceted dice it needs to be exactly what the player puts in
  {
      let score = 0;
      let diceCount = [0,0,0,0,0,0,0] // this will count how many of each dice are in the selected dice ammount
      diceToCheck.forEach((die)=> diceCount[die.value]++);

      const allDiceScore = diceCount.filter((die) => die !== 0);
      
      if((allDiceScore.length == 2) && (allDiceScore.every((c) => c === 3)))// 2 triplets
        return 2500;
      else if ((allDiceScore.length == 3) && (allDiceScore.every((c) => c === 2)))// three pair
        return 1500;
      else if ((allDiceScore.length == 2) && ((allDiceScore[0] === 4 && allDiceScore[1] === 2) || (allDiceScore[0] == 2 && allDiceScore[1] === 4)))// 4 of a kind & a pair
        return 1500;
      else if ((allDiceScore.length == 6) && (allDiceScore.every((c) => c === 1)))
        return 1500;
      
      

      for(let i = 1; i <= 6; i++)
      {
        if(diceCount[i] == 6)
        {
          score += 3000;
          diceCount[i] -= 6;
        }
        else if(diceCount[i] == 5)
        {
          score += 2000;
          diceCount[i] -= 5;
        }
        else if(diceCount[i] == 4)
        {
          if(i == 1)
            score += 2000;
          else 
            score += 1000;

          diceCount[i] -= 4;
        }
        else if(diceCount[i] == 3)
        {
          if(i == 1)
            score += 1000;
          else
            score += (i * 100);

          diceCount[i] -= 3;
        }
      }

      score += diceCount[1] * 100;
      score += diceCount[5] * 50;

      diceCount[1] = 0;
      diceCount[5] = 0;

      if(selectedDiceCheck)
      {
          if(diceCount.every((c) => c == 0))
            return score;
          else
            return 0;
      }
      else 
        return score;
      
  }

  // you might want to refactor this function because there are a lot of redundanices in terms of overlapping or code written twice because of the if statemnts
  function handleSelectDie(die) //next you need to handle valid point systems and pass both points and validity to handleBanking! There should be a scoreboard with pending points, and you should only be able to bank if
  {                             // you have valid points, in turn the bank button should also light up when you are able to bank.
    
    if(!(playersRound == playerNumber))// if the wrong player selects a die, do nothing
      return;

    updateDice((currentDice)=>{
      const newDiceArr = currentDice.map((currDie)=>{
        if(currDie.id == die.id)
        {
          const newDie = {...currDie};
          newDie.selected = !(newDie.selected);
          return newDie;
        }
        else
          return currDie;
      });// end map

      const newSelectedDiceArr = newDiceArr.filter((die)=> (die.selected));
      const newPendingScoreEmit = calcDicePoints(newSelectedDiceArr, true);// this calculates the new pending score

      newPendingScore(newPendingScoreEmit);// this sets the new pending score locally

      clientConn.emitSelectedDieMatch(newDiceArr, newPendingScoreEmit);// this updates it on the server to be sent to the other client
      console.log(newPendingScoreEmit + " wdadw " + hasRolled);
      if((newPendingScoreEmit > 0 )&& (hasRolled == true))
      {
        hasBeenAvailableBank.current = true;
        console.log("dwadwadwa");
      }
        
      return newDiceArr;
    });

    
    
  }

  function handleEndRound()
  {
    console.log("Handling End ROund");
    clientConn.endRoundBank(roundScore);
  }

  
  function handleBanking()
  {
     clientConn.emitHandleBanking();
  }

  // renders the dice
  function renderDice() {
  return dice.map((die) => (
    <div key={die.id} style={{
      position: 'absolute',
      left: `${(die.x * scaleX)}px`,
      top: `${(die.y *scaleY)}px`,
      width: '15%',// middle val is the % and if it gets too large or two small it wont go past the other to. To calc what you want the % to be , do server DIE_SIZE/500, becaues 500 is the width of you server rendering board
      aspectRatio: '1',
       
    }}>
      {die.selected && (
        <svg
          viewBox='-30 -30 160 160'
          width="160%"
          height="160%"
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            pointerEvents: 'none',
          }}
        >
          <path d={zigZagCircle(50, 50, 65, 10, time, die.seed)} />
        </svg>
      )}
      <svg
        viewBox="0 0 100 100"
        width="100%"
        height="100%"
        onClick={() => handleSelectDie(die)}
        style={{ 
          '--rotation': `${die.rotation}deg`,
           animation:'diePopIn 0.75s ease-out forwards' }}
      >
        <path d={wobblyDie(die, time)}/>
        {renderPips(die)}
      </svg>
    </div>
  ))
}



  function renderBankedDice()
  {
    //console.log(bankedDice);
     return bankedDice.map((die) => ( 
      <div key={die.id * -1} style={{margin:'0 0.5%', display: 'flex', justifyContent:'center', height:'175%', aspectRatio:'1/1',
        
      }}>
        <svg viewBox="0 0 100 100" width = "100%" height = "100%" style={{animation:'dieBankPopIn 0.75s ease-out'}}>
            <path d={wobblyDie(die,time)}/>
            {renderPips(die)}
        </svg>
       </div>
     ))
  }

  function getFontSpace(text)
  {
    const maxChar = 6.5;
    const minSize = 40;
    const maxSize = 58;

    let shiftDegree = 40;
    

    const limiter = (58-40)/maxChar;

    for(let i = 0; i < text.length; i++)
    {
      shiftDegree +=  limiter;
    }

    console.log(shiftDegree);
    return shiftDegree;
  }

  function getScoreShift(score)
  {
    if(score < 1000)
      return 5;
    else return 0
  }

  function letterPopOffset(charIndex, changeTime, currentTime) {
  const elapsed = currentTime - changeTime;// elapsed time
  const delay = charIndex * 0.05;      // stagger per letter — when the elapsed time has grown larger than 0.5s * charIndex t will become greater than 0
  const duration = 0.7;                 // how long each letter's pop takes
  const t = elapsed - delay;

  if (t < 0 || t > duration) return 0;  // not yet started or already finished

  const progress = t / duration;
  // simple pop-up-and-settle curve: sin gives a smooth up-then-down motion
  return -Math.sin(progress * Math.PI) * 6; // 6 = how high the letters pop (viewBox units)
  // * PI allows for a full hump of the unit circle in both increasing and decreasing
  // must return negative Math.sin because SVG uses postive to mean ydown and negative to mean sin up
}

const lastScoreChangeTime = useRef([0, 0]); // one per player
const prevScores = useRef([0, 0]);

useEffect(() => {
  playerScores.forEach((score, i) => {
    if (score !== prevScores.current[i]) {
      lastScoreChangeTime.current[i] = timeRef.current; // mark when it changed
      prevScores.current[i] = score;
    }
  });
}, [playerScores]);

const popTimeRef = useRef(time);



useEffect(()=>
{// loop timer for popOffsetLoop
  
  const elapsed = time - popTimeRef.current;
  const delay = 7.5// seconds this must always be longer than delay in popOffsetLoop
  
  if(((elapsed - delay) > 0))
  {
    popTimeRef.current = time;
    console.log("hi")
  }
    
}, [time]);

function popOffsetLoop(charIndex, changeTime, currentTime)
{
  const amp = 15;

  const elapsed = currentTime - changeTime;
  const delay = charIndex * 0.9; // must be >=
  const duration = 1// second — this takes advantage of the fact that once elapsed - delay > 0, duration is the ammount of time it can run for according to the if as long as duration is > 0

  const t = elapsed - delay;

  if( t < 0 || t > duration)
      return 0
  else 
  {
    const progress = t/duration;// diving by duration ensures = spacing and a complete loop when duration is it, because every progress is a percent/portion/ratio of duration
    return -Math.sin(progress * Math.PI) * amp;
  }
}

function renderPoppingTextLoop(text, changeTime)
{
  return text.split('').map((char,index) =>
  {
    let offset = popOffsetLoop(index, changeTime, time);
    const dy = offset;
    
    
    return (
       <span style={{ display:'inline-block',transform: `translateY(${dy}%)`, fontSize:'5vw', color: 'orange', fontFamily:"'Press Start 2P'"}}>
        {char}
      </span>
    );
    
  });
}

function renderPoppingText(text, changeTime) {
  let baseline = 0; // dy is relative, so track cumulative offset to reset each char to 0 before applying pop
  return text.split('').map((char, i) => {
    let offset = letterPopOffset(i, changeTime, time);
    const waveOffset = waveChar(i,time);
    offset += waveOffset;
    const dy = offset - baseline;
    baseline = offset;
    return (
      <tspan key={i} dy={dy}>
        {char === ' ' ? '\u00A0' : char}
      </tspan>
    );
  });
}

function waveChar(charIndex, time, baseline)
{
  const amp = 5; // amplitude of the sine wave for letters
  const y = Math.sin(time + charIndex);
  return y;
}


const playerChangeTimeStamp = useRef(0);
useEffect(()=>{
  playerChangeTimeStamp.current = time;
  console.log("fired");
}, [playersRound]);

const playerChosen = useRef(false);

function currPlayerRoundLine(playerNum, time, animationStartTime)
{
  const elapsedTime = time - animationStartTime;
  let offSet = 58 * 2;
  const duration = 3.5;// seconds

  const progress = elapsedTime/duration;

  let startPos = playerNum == 1 ? 58 : -58;
  const eased = easeOutQuad(progress);

  if(playerNum == 0)
  {
    return 0;
  }
  else if ((playerChosen.current == false) && !(playerNum == 0))
  {
    offSet = 58;
    startPos = 0;
    console.log("set to 0");
  }

  if(progress <= 1 && !(progress > 1))
  {
    console.log("startPos: " + startPos)
    if(playerNum == 1)
      return startPos + (offSet * progress * - 1 * eased);
    else 
      return startPos + (offSet * progress * 1) * eased;
      }
  

  if(playerChosen.current == false)
  {
    
    if (playerNum == 1 && !(playerNum == 0))
        return -58;
    else if (!(playerNum == 0)) return 58
    
    playerChosen.current = true;
  }

  return startPos * -1;

}

function easeOutQuad(t) {// makes it faster when t is smaller and slower when t gets larger, since progress only ever = 1, it will never be greater than 1
  return 1 - (1 - t) * (1 - t);
}
      
  return (
  <div style={{
    height: '100dvh',
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    boxSizing: 'border-box',
    padding: '0.5em',
    position: 'relative'
  }}>

    {/* header - fixed size, stays at top */}
    <div style={{ flex: '0 0 auto', display:'flex',justifyContent: 'center', gap:'19vw', position: 'relative'}}>
      
      <svg width= '50%' viewBox='0 0 100 100' style={{position:'absolute', transform: `translate(${currPlayerRoundLine(playersRound, time, playerChangeTimeStamp.current)}%,-10%)`}}> {/*position:'absolute', left:'54%', top:'-30%' use for Player2 */}
          <path d={wobblyLine(25, 75, 50, 1, 25, time)} stroke='orange' fill='none'/>                            {/*{position:'absolute', left:'-4%', top:'-30%' use for Player2  */}
      </svg>

      <div style={{position: 'absolute', top: '65%'}}>
        {renderPoppingTextLoop(`${pendingScore}`,popTimeRef.current)}
      </div>
      
      {/*Player 1 */}
        <svg viewBox='0 0 100 50' width='40%' style={{width:'37vw'}}>
  <path d={wobblyOval(50, 25, 50, 20, 20, 0.7, 1)} />
  <text x='50' y='25' textAnchor='middle' dominantBaseline='middle'
  fontSize='40%' fill='blue' fontFamily="'Press Start 2P'">
  {renderPoppingText(`Gertie: ${playerScores[0]}`, lastScoreChangeTime.current[0])}
</text>
</svg>

        {/*Player 2 */}
        <svg viewBox='0 0 100 50' width='40%' style={{width:'37vw'}}>
  <path d={wobblyOval(50, 25, 50, 20, 17, 0.5, 2)} />
  <text x='50' y='25' textAnchor='middle' dominantBaseline='middle'
  fontSize='40%' fill='blue' fontFamily="'Press Start 2P'">
  {renderPoppingText(`Dev: ${playerScores[1]}`, lastScoreChangeTime.current[1])}
</text>
</svg>
      {/* remove most of this stuff and replace it with the oval names and socre. And put pending score in a plain black box in the center, use position absoulte and save yourself the time <h1 style={{ margin: '0.2em 0' }}>Farkle</h1>
      <h2 style={{ margin: '0.2em 0' }}>Player Number: {playerNumber}</h2>
      <h2 style={{ margin: '0.2em 0' }}>Whos Turn: {playersRound}</h2>
      <h3 style={{ margin: '0.2em 0' }}>Pending Score {pendingScore}</h3>*/}
      
    </div>

    {/* dice area - grows to fill whatever space is left */}
    <div ref={diceBoardRef} style={{
      flex: '0 0 auto',
      position: 'relative',
      minHeight: 0,
      aspectRatio: '16/9',
      border: '1px solid black',
      margin: '0.5em 0',
    }}>
      {renderDice()}
    </div>

    {/* scores + round score svg - fixed, compact */}
    <div id='bankBoxAndScore' style={{flex:'0 0 auto', aspectRatio: '15/7', width:'100%', position:'relative', overflow:'hidden', border: '1px solid black', paddingBottom: '0', display:'flex', flexDirection:'column'}}>
      <div style={{ flex: '0 0 auto', textAlign: 'center', margin: '0', position:'realtive'}}>
        <div style={{ display: 'flex', justifyContent: 'space-around' }}>
          <div style={{flex:'0 0 auto'}}>Player One Score: {playerScores[0]}</div>
          <div style={{flex:'0 0 auto'}}>Player Two Score: {playerScores[1]}</div>
        </div>
        <svg viewBox='0 0 160 140' width='38%' style={{ display: 'block', position:'absolute', transform:'translate(-50%,-50%)', left:'50%', top:'30%'}}>
          <path d={zigZagOval(80,70, 75, 40, 16, time, .5)}/>
          <path d={zigZagOval(80,70, 68, 33, 16, time, .5)} stroke='orange' strokeWidth='.5'/>
          <path d={zigZagOval(80,70, 61, 31, 16, time, .5)} stroke='orange' strokeWidth='.5'/>
          <text x={textBtnSway(80,time,.5)} y='70' textAnchor='middle' dominantBaseline='middle'
            fontSize='75%' fill='blue' fontWeight='1' fontFamily="'Press Start 2P'">
            {roundScore}
          </text>
        </svg>
      </div>

      {/* banked dice - fixed, compact strip */}
      <div id='bankBox' style={{ display: 'flex', justifyContent: 'center', flex:'0 0 auto', position: 'absolute', left: '50%', top:'70%', transform: 'translate(-50%, -50%)', width: '100%', height: '20%'}}>
        {renderBankedDice()}
      </div>
    </div>

    {/* buttons - fixed, row instead of stacked, smaller */}
    <div style={{
      flex: '0 0 auto',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '15%',
      width: '100%',
      marginTop: '8%'
    }}>
      <div id='topTwoBtns'style={{
      display:'flex', 
      gap: '25%', 
      justifyContent:'center',
      width: '100%'
      }}>
        <div style={{
          flex: '0 0 auto',
          width: '30%',
          aspectRatio: '1/1',
          border: '2vw solid #000000',
          borderTop: '2vw solid #333333',
          borderLeft: '2vw solid #333333',
          padding: '0.6vw', boxSizing: 'border-box',
        }}>
          <div style={{
            width: '100%', height: '100%',
            backgroundColor: '#111111',
            border: '2vw solid #333333',
            borderBottom: '2vw solid #070606bd',
            borderRight: '2vw solid #000000',
            transform: bankButtonPressed ? 'translate(1px, 1px)' : 'none',
            fontFamily: "'Press Start 2P'",
            fontSize: '4vw',
            boxSizing: 'border-box',
            userSelect: 'none',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color:'#61998e8a',
            animation: (pendingScore > 0) && hasRolled ? 'textGlowRoll 4s ease-out forwards'  : hasBeenAvailableBank.current ? 'textGlowRollOut 1.5s ease-out forwards' : 'none'
          }}
          onMouseDown={() => { setBankPressed(true); clientConn.emitBankButtonPressed(true); }}
          onMouseUp={() => {
            setBankPressed(false); clientConn.emitBankButtonPressed(false);
            if ((pendingScore > 0) && hasRolled && (playersRound == playerNumber)) handleBanking();
          }}
          onTouchStart={() => setBankPressed(true)}
          onTouchEnd={() => {
            setBankPressed(false);
            if ((pendingScore > 0) && hasRolled && (playersRound == playerNumber)) handleBanking();
          }}
          >
            Bank
          </div>
        </div>

        <div style={{
          flex: '0 0 auto',
          width: '30%',
          aspectRatio:'1/1',
          border: '2vw solid #000000',
          borderTop: '2vw solid #333333',
          borderLeft: '2vw solid #333333',
          padding: '0.6vw', boxSizing: 'border-box',
        }}>
          <div style={{
            width: '100%', height: '100%',
            backgroundColor: '#111111',
            border: '2vw solid #333333',
            borderBottom: '2vw solid #070606bd',
            borderRight: '2vw solid #000000',
            transform: rollButtonPressed ? 'translate(1px, 1px)' : 'none',
            fontFamily: "'Press Start 2P'",
            fontSize: '4vw',
            boxSizing: 'border-box',
            userSelect: 'none',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: hasRolled == false ? '#32cfb0' : '#61998e8a',
            animation: hasRolled == false ? 'textGlowRoll 4s ease-out forwards' : hasBeenAvailableRoll.current ? 'textGlowRollOut 4s ease-out forwards' : 'none'
          }}
          onMouseDown={() => setRollButtonPressed(true)}
          onMouseUp={() => {
            setRollButtonPressed(false);
            if ((hasRolled == false) && (playersRound == playerNumber)) reRollDice();
          }}
          onTouchStart={() => setBankPressed(true)}
          onTouchEnd={() => {
            setBankPressed(false);
            if ((hasRolled == false) && (playersRound == playerNumber)) reRollDice();
          }}
          >
            Roll
          </div>
        </div>
      </div>

      <div style={{
        width: '70%', aspectRatio: '16/6',
        border: '3vw solid #000000',
        borderTop: '3vw solid #333333',
        borderLeft: '3vw solid #333333',
        padding: '.5vw', boxSizing: 'border-box',
      }}>
        <div style={{
          width: '100%', height: '100%',
          backgroundColor: '#111111',
          border: '3vw solid #333333',
          borderBottom: '3vw solid #070606bd',
          borderRight: '3vw solid #000000',
          transform: endRoundButtonPressed ? 'translate(1px, 1px)' : 'none',
          fontFamily: "'Press Start 2P'",
          fontSize: '4vw',
          lineHeight:'1.1',
          boxSizing: 'border-box',
          userSelect: 'none',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          textAlign: 'center',
          color: ((roundScore > 0) && !hasBusted && (playersRound == playerNumber) && (hasRolled == false)) ? '#32cfb0' : '#61998e8a',
          
          animation: ((roundScore > 0) && !hasBusted && (playersRound == playerNumber) && (hasRolled == false)) ? 'textGlowRoundScore 5s ease-out forwards' : hasBeenAvailableScore.current ? 'textGlowRoundScoreOut 3s ease-out forwards' : 'none'// anmiation shadow controlled in index.css, 1s is the number of seconds, you can make it larger or smaller, forwards means keep the animation style
        }}
        onMouseDown={() => setEndRoundButtonPressed(true)}
        onMouseUp={() => {
          setEndRoundButtonPressed(false);
          if ((roundScore > 0) && !hasBusted && (playersRound == playerNumber) && (hasRolled == false)) handleEndRound();
        }}
        onTouchStart={() => setEndRoundButtonPressed(true)}
        onTouchEnd={() => {
          setEndRoundButtonPressed(false);
          if ((roundScore > 0) && !hasBusted && (playersRound == playerNumber) && (hasRolled == false)) handleEndRound();
        }}
        >
          End Round <br></br>N' Score
        </div>
      </div>
    </div>

  </div>
)
}

