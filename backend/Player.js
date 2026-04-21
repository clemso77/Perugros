const { SOCKET_EVENTS, GAME_CONFIG} = require('./constants');

class Player {
    constructor(name, socket, nbDes, group, couleur){
        this.nom=name;
        this.group=group;
        this.nbDes=nbDes;
        this.des =   [];
        this.socket=socket;
        this.finishedLaunching=false;
        this.id=socket.id;
        this.couleur = couleur;
        this.socket.request.session.couleur=couleur;
        this.socket.request.session.nom=name;
        this.socket.request.session.group=group;
        this.socket.request.session.userId=this.socket.id;
        this.socket.request.session.save(() => {
            this.socket.emit(SOCKET_EVENTS.LOGGED_IN, {nom: name, color: couleur});
        });
    }

    getSession(){
        return this.socket.request.session;
    }

    setGroup(id){
        this.group=id;
        this.getSession().group=id;
        this.socket.request.session.save();
    }

    addDice(result){
        this.des.push(result);
    }

    clearDice(){
        this.des = [];
    }

    reset() {
        this.des = [];
        this.nbDes = GAME_CONFIG.INITIAL_DICE_COUNT;
        this.finishedLaunching = false;
    }

    win(){
        this.socket.emit(SOCKET_EVENTS.AFFICHAGE, {name: this.nom, lose: false });
        let i=0;
        let id = setInterval(() => {
            if(i>=100){
                clearInterval(id);
                return;
            }
            i++;
            function ColorRandom() {
                let letters = '0123456789ABCDEF';
                let color = '#';
                for (let j = 0; j < 6; j++) {
                    color += letters[Math.floor(Math.random() * 16)];
                }
                return color;
            }

            let value = Math.random() * 6 + 1 ;
            value = Math.floor(value);
            this.socket.emit(SOCKET_EVENTS.SHOW_DICE, {value: value , color: ColorRandom()});
        }, 100);
    }

    changeColor(couleur){
        this.getSession().couleur=couleur;
        this.socket.request.session.save();
        this.couleur=couleur;
    }

    getCouleur(){
        return this.getSession().couleur;
    }

    loseDice(){
        this.nbDes--;
    }
}

module.exports = Player;
