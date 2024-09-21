class Game {
    constructor (groupe){
        this.groupe=groupe;
        this.timer=null;
    }

    rollDice(player) {
        if(this.groupe.chef == player){
            const result = Math.ceil(Math.random() * 6);
            this.groupe.broadcast({ type: 'diceRolled', result: result});
            this.nextTurn();
        }else{
            player.socket.emit('error', {message: "Ce n'est pas votre tour"})
        }
    }

    start(){
        this.groupe.broadcast({type: "gameStarted"})
        this.timer=setTimeout(() => {
            Game.nextTurn();
        }, 15000);
        this.groupe.broadcast({type: 'playerTurn', nextPlayerName: this.groupe.chef.nom})
    }

    nextTurn(){
        if(this.timer){
            clearTimeout(this.timer); 
        }
        let p =this.groupe.chef;
        const index = this.groupe.players.findIndex(player => player === p);
        this.groupe.chef=this.groupe.players[(index+1)%this.groupe.players.length];
        p.socket.emit('chef');
        console.log(this.groupe);
        this.groupe.chef.socket.emit('chef');
        this.groupe.broadcast({type: 'playerTurn', nextPlayerName: this.groupe.chef.nom})
        this.timer=setTimeout(() => {
            this.nextTurn();
        }, 15000);
    }

    
}

module.exports = Game;
