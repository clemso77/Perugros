import React, { useState } from 'react';

// Les erreurs renvoyées par le serveur s'affichent via les notifications globales (GameStatus)
const LoginForm = ({ socket, online }) => {
    const [name, setName] = useState('');
    const [err, setErr] = useState(null);

    const onSubmit = (event) => {
        event.preventDefault();
        if (!online) return;
        if (name.trim()) {
            setErr(null);
            socket.emit('login', { nom: name.trim() });
        } else {
            setErr("Choisissez un nom pour jouer");
        }
    };

    return (
        <form className="login-container menu-card" onSubmit={onSubmit}>
            <h2>Comment vous appelez-vous ?</h2>
            <p className='login-sub'>Ce nom sera visible par les autres joueurs.</p>
            <input
                type="text"
                placeholder="Votre nom"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={20}
                autoComplete="nickname"
                enterKeyHint="go"
                aria-label='Votre nom'
            />
            {err && <p className='form-error'>{err}</p>}
            <button type="submit" className='btn-primary' disabled={!online}>
                {online ? 'Jouer' : 'Connexion…'}
            </button>
        </form>
    );
};

export default LoginForm;
