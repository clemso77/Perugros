const DiceColor = ({ gameStarted, diceColor, setDiceColor, socket}) => {
    const handleColorChange = (event) => {
        console.log("emit");
        socket.emit('diceColor', event.target.value);
        setDiceColor(event.target.value);
    };

    return (
        <div>
        {!gameStarted && <input
            type="color"
            id="diceColorPicker"
            name="diceColor"
            value={diceColor}
            onChange={ handleColorChange }
            style={{ marginBottom: '10px' }}
        />}
        </div>
    );
}

export default DiceColor;