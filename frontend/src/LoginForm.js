import React, { useState } from 'react';

const LoginForm = ({ handleLogin, err }) => {
    const [name, setName] = useState('');

    const onSubmit = () => {
        handleLogin(name);
    };

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
