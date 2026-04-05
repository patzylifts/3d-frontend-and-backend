import { createContext, useContext, useState } from "react";

const cakeColors = [
    { color: "#683434", name: "brown" },
    { color: "#70fd9d", name: "mint" },
    { color: "#52e7d4", name: "blue" },
    { color: "#ffa500", name: "orange" },
    { color: "#ff0000", name: "red" },
    { color: "#222222", name: "black" },
    { color: "#ececec", name: "white" },
    { color: "#a56bff", name: "lavender" },
    { color: "#896599", name: "mauve" },
    { color: "#32cd32", name: "lime green" },
    { color: "#ffe4b5", name: "peach" },
    { color: "#ff69b4", name: "hot pink" },
];

// Flavor options — each maps to a texture folder in /textures/
const flavors = ["Choco Moist", "Vanilla Chiffon", "Ube Chiffon"];

const flavorTextureMap = {
    "Choco Moist": "abstract",
    "Vanilla Chiffon": "milkshake",
    "Ube Chiffon": "coffee",
};

const CustomizationContext = createContext({});

export const CustomizationProvider = (props) => {
    const [form, setForm] = useState(1); // 1 = round, 2 = rectangle
    const [candle, setCandle] = useState(false);
    const [chocolate, setChocolate] = useState(false);
    const [balls, setBalls] = useState(false);
    const [nuts, setNuts] = useState(false);
    const [cakeColor, setCakeColor] = useState(cakeColors[0]);
    const [flavor, setFlavor] = useState(flavors[0]);

    const generateRandomCake = () => {
        const randomForm = Math.random() < 0.5 ? 1 : 2;
        const randomCakeColor = cakeColors[Math.floor(Math.random() * cakeColors.length)];
        const randomFlavor = flavors[Math.floor(Math.random() * flavors.length)];

        const decorationOptions = ["candle", "chocolate", "balls", "nuts"];
        const randomDecoration = decorationOptions[Math.floor(Math.random() * decorationOptions.length)];

        setForm(randomForm);
        setCakeColor(randomCakeColor);
        setFlavor(randomFlavor);

        setCandle(false);
        setChocolate(false);
        setBalls(false);
        setNuts(false);
        switch (randomDecoration) {
            case "candle":    setCandle(true);    break;
            case "chocolate": setChocolate(true); break;
            case "balls":     setBalls(true);     break;
            case "nuts":      setNuts(true);      break;
            default: break;
        }
    };

    return (
        <CustomizationContext.Provider
            value={{
                form, setForm,
                cakeColors, cakeColor, setCakeColor,
                flavors, flavor, setFlavor,
                flavorTextureMap,
                candle, setCandle,
                chocolate, setChocolate,
                balls, setBalls,
                nuts, setNuts,
                generateRandomCake,
            }}
        >
            {props.children}
        </CustomizationContext.Provider>
    );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useCustomization = () => {
    return useContext(CustomizationContext);
};