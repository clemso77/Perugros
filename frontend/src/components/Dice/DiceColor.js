import React from 'react';

const DiceColor = ({ gameStarted, diceColor, setDiceColor, socket }) => {
    const handleColorChange = (event) => {
        const newColor = event.target.value;
        socket.emit('diceColor', newColor);
        setDiceColor(newColor);
    };

    return (
        <div>
            {!gameStarted && (
                <input
                    type="color"
                    id="diceColorPicker"
                    name="diceColor"
                    value={diceColor}
                    onChange={handleColorChange}
                    style={{ marginBottom: '10px' }}
                />
            )}
        </div>
    );
};

export default DiceColor;
