import React, { useEffect, useState } from 'react';

const LoginForm = ({ socket }) => {
    const [name, setName] = useState('');
    const [err, setErr] = useState();

    const onSubmit = () => {
        if (name.trim()) {
            socket.emit('login', { nom: name });
        } else {
            setErr("Nom invalide");
            let timer = setTimeout(() => setErr(null), 5000);
            return () => clearTimeout(timer);
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
        <>
        <div className="login-container">
            <h2>Entrez votre nom</h2>
            <input 
                type="text" 
                placeholder="Nom du joueur"
                value={name}
                onChange={(e) => setName(e.target.value)}
            />
            <button onClick={onSubmit}>Jouer</button>
        </div>
        <div className='message-container'>
         {err && <p className="error">{err}</p>}
        </div>
        </>
    );
};

export default LoginForm;
