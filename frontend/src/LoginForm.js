import React, { useEffect, useState } from 'react';

const LoginForm = ({ socket }) => {
    const [name, setName] = useState('');
    const [err, setErr] = useState(null);

    const onSubmit = () => {
        if (name.trim()) {
            socket.emit('login', { nom: name });
        } else {
            socket.emit("error", {message: "Veuillez entrer un nom."});
        }
    };

    useEffect(() => {
        socket.on('error', (data) => {
            setErr(data.message);
            let timer = setTimeout(() => setErr(null), 5000);
            return () => clearTimeout(timer);
        });

    }, [socket])
    return (
        <div className="login-container">
            <h2>Entrez votre nom pour commencer</h2>
            <input 
                type="text" 
                placeholder="Nom du joueur"
                value={name}
                onChange={(e) => setName(e.target.value)}
            />
            <button onClick={onSubmit}>Se Connecter</button>
            {err && <p className="error">{err}</p>}
        </div>
    );
};

export default LoginForm;
