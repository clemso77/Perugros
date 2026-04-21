import React, { useEffect, useRef, useState } from 'react';

const ERROR_DISPLAY_DURATION_MS = 5000;

const LoginForm = ({ socket }) => {
    const [name, setName] = useState('');
    const [err, setErr] = useState();
    const clearErrorTimeoutRef = useRef(null);

    const scheduleErrorClear = () => {
        if (clearErrorTimeoutRef.current) {
            clearTimeout(clearErrorTimeoutRef.current);
        }
        clearErrorTimeoutRef.current = setTimeout(() => setErr(null), ERROR_DISPLAY_DURATION_MS);
    };

    const onSubmit = () => {
        if (name.trim()) {
            socket.emit('login', { nom: name });
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
