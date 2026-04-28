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
    { color: "#f3e5ab", name: "vanilla" },
];

const flavors = ["Choco Moist", "Vanilla Chiffon", "Ube Chiffon"];

const flavorTextureMap = {
    "Choco Moist": "choco",
    "Vanilla Chiffon": "vanilla",
    "Ube Chiffon": "ube",
};

/* ── Cake size / tier catalogue ── */
export const CAKE_SIZES = [
    {
        tier: "1 Tier Cake",
        tierKey: "tier1",
        sizes: ["Bento Cake", "Tall Bento Cake", "Standard", "Tall Cake"],
    },
    {
        tier: "Mini 2 Tier",
        tierKey: "tier2",
        sizes: ["6×4 & 4×4", "6×6 Cake", "6×8 Cake", "8×5 Cake"],
    },
    {
        tier: "3 Tier Cake",
        tierKey: "tier3",
        sizes: ["4×5, 6×6 & 8×5"],
    },
    {
        tier: "4 Tier Cake",
        tierKey: "tier4",
        sizes: ["4×4 & 6×6, 8×5 & 10×4"],
    },
];

// Base prices per tier × flavor
const CAKE_PRICES = {
    tier1: {
        round:     { "Choco Moist": 1000, "Vanilla Chiffon": 900,  "Ube Chiffon": 900  },
        rectangle: { "Choco Moist": 1100, "Vanilla Chiffon": 1000, "Ube Chiffon": 1000 },
    },
    tier2: {
        round:     { "Choco Moist": 1800, "Vanilla Chiffon": 1600, "Ube Chiffon": 1600 },
        rectangle: { "Choco Moist": 1900, "Vanilla Chiffon": 1700, "Ube Chiffon": 1700 },
    },
    tier3: {
        round:     { "Choco Moist": 2800, "Vanilla Chiffon": 2500, "Ube Chiffon": 2500 },
        rectangle: { "Choco Moist": 2900, "Vanilla Chiffon": 2600, "Ube Chiffon": 2600 },
    },
    tier4: {
        round:     { "Choco Moist": 3800, "Vanilla Chiffon": 3400, "Ube Chiffon": 3400 },
        rectangle: { "Choco Moist": 3900, "Vanilla Chiffon": 3500, "Ube Chiffon": 3500 },
    },
};

const ADDON_PRICES = {
    candle: 100,
    chocolate: 200,
    balls: 100,
    nuts: 75,
};

const CustomizationContext = createContext({});

export const CustomizationProvider = (props) => {
    // Shape: 1 = round, 2 = rectangle
    const [form, setForm] = useState(1);

    // Tier & size
    const [selectedTierIndex, setSelectedTierIndex] = useState(0);
    const [selectedSize, setSelectedSize]           = useState(CAKE_SIZES[0].sizes[0]);

    // Decorations
    const [candle,    setCandle]    = useState(false);
    const [chocolate, setChocolate] = useState(false);
    const [balls,     setBalls]     = useState(false);
    const [nuts,      setNuts]      = useState(false);

    // Color & flavor
    const [cakeColor, setCakeColor] = useState(cakeColors[0]);
    const [flavor,    setFlavor]    = useState(flavors[0]);

    // Derived helper
    const tierKey   = CAKE_SIZES[selectedTierIndex]?.tierKey ?? "tier1";
    const shapeKey  = form === 1 ? "round" : "rectangle";

    const calculatePrice = () => {
        const basePrice =
            CAKE_PRICES[tierKey]?.[shapeKey]?.[flavor] ?? 1000;

        let addonsPrice = 0;
        if (candle)    addonsPrice += ADDON_PRICES.candle;
        if (chocolate) addonsPrice += ADDON_PRICES.chocolate;
        if (balls)     addonsPrice += ADDON_PRICES.balls;
        if (nuts)      addonsPrice += ADDON_PRICES.nuts;

        return basePrice + addonsPrice;
    };

    const handleTierChange = (idx) => {
        setSelectedTierIndex(idx);
        setSelectedSize(CAKE_SIZES[idx].sizes[0]);
    };

    const generateRandomCake = () => {
        const randomForm        = Math.random() < 0.5 ? 1 : 2;
        const randomTierIdx     = Math.floor(Math.random() * CAKE_SIZES.length);
        const randomCakeColor   = cakeColors[Math.floor(Math.random() * cakeColors.length)];
        const randomFlavor      = flavors[Math.floor(Math.random() * flavors.length)];
        const decorationOptions = ["candle", "chocolate", "balls", "nuts"];
        const randomDecoration  = decorationOptions[Math.floor(Math.random() * decorationOptions.length)];

        setForm(randomForm);
        setSelectedTierIndex(randomTierIdx);
        setSelectedSize(CAKE_SIZES[randomTierIdx].sizes[0]);
        setCakeColor(randomCakeColor);
        setFlavor(randomFlavor);

        setCandle(false); setChocolate(false); setBalls(false); setNuts(false);
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
                // Shape
                form, setForm,

                // Tier & size
                selectedTierIndex, setSelectedTierIndex: handleTierChange,
                selectedSize, setSelectedSize,

                // Colors
                cakeColors, cakeColor, setCakeColor,

                // Flavor
                flavors, flavor, setFlavor,
                flavorTextureMap,

                // Decorations
                candle, setCandle,
                chocolate, setChocolate,
                balls, setBalls,
                nuts, setNuts,

                // Helpers
                generateRandomCake,
                calculatePrice,
                CAKE_PRICES,
                ADDON_PRICES,
            }}
        >
            {props.children}
        </CustomizationContext.Provider>
    );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useCustomization = () => useContext(CustomizationContext);