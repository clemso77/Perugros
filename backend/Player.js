class Player {
    constructor(name, socket, des, group, couleur){
        this.nom=name;
        this.group=group;
        this.des=des;
        this.socket=socket;
        this.id=socket.id;
        this.couleur = couleur;
        this.socket.request.session.couleur=couleur;
        this.socket.request.session.nom=name;
        this.socket.request.session.group=group;
        this.socket.request.session.userId=this.socket.id;
        this.socket.request.session.save(() => {
            this.socket.emit('loggedIn',{nom: name, color: couleur});
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

    changeColor(couleur){
        this.getSession().couleur=couleur;
        this.socket.request.session.save();
        this.couleur=couleur;
    }
}

module.exports = Player;
