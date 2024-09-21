class Player {
    constructor(name, socket, des, group){
        this.nom=name;
        this.group=group;
        this.des=5;
        this.socket=socket;
        this.id=socket.id;
    }

    getSession(){
        return this.socket.request.session;
    }

    setGroup(id){
        this.group=id;
    }
}

module.exports = Player;
