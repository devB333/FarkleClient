
export class Client{
     constructor(socket){// always must use this.socket for everything and every function
        this.socket = socket;
        this.stateChangeCallbacks = {};// state change callbacks is a list of call backs that contain state change objects to be used when the server needs to make a state change, the list is made in App.jsx
        
         this.connected();


         this.socket.on('setPlayerNum', (playerNum) => {
            this.stateChangeCallbacks.setPlayerNumber(playerNum);
         });// end setPlayerNum

         this.socket.on('bankButtonPressedServer', (state)=>{
            this.stateChangeCallbacks.onBankButtonPressed(state);
         });// end socket.on function

         this.socket.on('newDice', (data) =>{// general purpose new dice handler used for both rerolls and syncing dice selection because they both remake and send the whole dice array. Selected dice ui uses die.selected var
            this.stateChangeCallbacks.onNewDice(data.dice, data.pendingScore, data.hasRolled, data.hasBusted, data.playersRound);
         });// end newDice update function

         this.socket.on('returnHandleBanking', (data) =>{
            this.stateChangeCallbacks.returnHandleBanking(data.bankedDice, data.roundScore);
         });

         this.socket.on('endRoundBankResponse', (data) => {
            this.stateChangeCallbacks.returnHandleScore(data.bankedDice, data.newPlayerScore, data.playerScoring, data.playerOneScore, data.playerTwoScore, data.playersRound);
         });

         this.socket.on('newRoundStart', ()=>{
            this.stateChangeCallbacks.newRoundStart();
         });

         this.socket.on('gameSetPlayerNames', (playerNames) =>{
            this.stateChangeCallbacks.gameSetPlayerNames(playerNames);
         })
         //__________________________________________________________ lobby functions below
         this.socket.on('moveToRoom',()=>{
            this.stateChangeCallbacks.moveToRoom();
         });
         //__________________________________________________________ room functions below
         this.socket.on('roomInfo', (data) =>{
            this.stateChangeCallbacks.roomInfo(data.playerNames, data.roomCode);
         });
         this.socket.on('tryStartGameResponse', (response) =>{
            this.stateChangeCallbacks.tryStartGameResponse(response);
         });
     }

      addStateChangeCallback(methodName, method)
     {
         this.stateChangeCallbacks[methodName] = method;
     }

     checkIfConnected()
     {
         return "connected;"
     }
     
      connected()
     {
        this.socket.on("connect", ()=>{
            console.log(this.socket.id);
        })
     }

     endRoundBank()
     {
        this.socket.emit('endRoundBank');
     }

     emitBankButtonPressed(state)
     {
         this.socket.emit('bankButtonPressedClient', state);
     }

     emitSelectedDieMatch(newDiceArr, newPendingScore)// this will sync when one player selects a die, the other will see it as well, the pending score also has to sync as well
     {                                                // it will also sync the pending score ui, to show both players the active pending score of the selected dice
         const obj = {dice: newDiceArr, pendingScore: newPendingScore}// data to be sent out, you want it to match the names of the newDice data objects to fit the genral purpose mold
         this.socket.emit('selectDiceSync', obj);
     }

     emitHandleBanking()
     {
         this.socket.emit('handleBanking');
     }

     emitRerollDice(isNewRound)
     {
         this.socket.emit('reRollDice', isNewRound);
     }



     //__________________________________________________________ room functions
     joinRoom(roomCode, name)// the server will decide if it needs to create a new room or not based on if room code is empty or not
     {
         const data = {
            roomCode: roomCode,
            name: name
         };

         console.log("in and trying to emit" + name);
         this.socket.emit('joinRoom', data);
     }
     
     emitGetRoomInfo()// this method will query the server on the room info to update state with names in lobby and roomCode
     {
         this.socket.emit('getRoomInfo');
     }

     emitTryStartGame()
     {
         this.socket.emit('tryStartGame');
     }
    

     //_______________________________________________________ gameStart funciton below
     emitGameStart()
     {
         this.socket.emit('gameStart')
     }
}