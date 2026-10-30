import React, { useEffect, useRef, useState } from 'react';

const ERROR_DISPLAY_DURATION_MS = 5000;

const LoginForm = ({ socket, initialName = '' }) => {
    const [name, setName] = useState(initialName || '');
    const [err, setErr] = useState();
    const clearErrorTimeoutRef = useRef(null);

    const scheduleErrorClear = () => {
        if (clearErrorTimeoutRef.current) {
            clearTimeout(clearErrorTimeoutRef.current);
        }
        clearErrorTimeoutRef.current = setTimeout(() => setErr(null), ERROR_DISPLAY_DURATION_MS);
    };

    const onSubmit = (event) => {
        event.preventDefault();
        if (name.trim()) {
            socket.emit('login', { nom: name.trim() });
        } else {
            setErr("Nom invalide");
            scheduleErrorClear();
        }
    };

    useEffect(() => {
        const onError = (data) => {
            setErr(data.message);
            scheduleErrorClear();
        };
        socket.on('error', onError);
        return () => {
            socket.off('error', onError);
            if (clearErrorTimeoutRef.current) {
                clearTimeout(clearErrorTimeoutRef.current);
            }
        };
    }, [socket]);
    return (
        <>
        <form className="login-container" onSubmit={onSubmit}>
            <h2>Entrez votre nom</h2>
            <input
                type="text"
                placeholder="Nom du joueur"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={20}
                autoComplete="nickname"
                enterKeyHint="go"
            />
            <button type="submit">Jouer</button>
        </form>
        <div className='message-container'>
         {err && <p className="error">{err}</p>}
        </div>
        </>
    );
};

export default LoginForm;
