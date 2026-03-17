import { createContext, useContext, useState } from "react";

const cakeColors = [
    {
        color: "#683434",
        name: "brown",
    },
    {
        color: "#70fd9d",
        name: "mint",
    },
    {
        color: "#52e7d4",
        name: "blue",
    },
    {
        color: "#ffa500",
        name: "orange",
    },
    {
        color: "#ff0000",
        name: "red",
    },
    {
        color: "#222222",
        name: "black",
    },
    {
        color: "#ececec",
        name: "white",
    },
    {
        color: "#a56bff",
        name: "lavender",
    },
    {
        color: "#896599",
        name: "mauve",
    },
    {
        color: "#32cd32",
        name: "lime green",
    },
    {
        color: "#ffe4b5",
        name: "peach",
    },
    {
        color: "#ff69b4",
        name: "hot pink",
    },
];

const creamColors = [
    {
        color: "#3a3939",
        name: "black",
    },
    {
        color: "#4e0707",
        name: "wine",
    },
    {
        color: "#659994",
        name: "blue",
    },
    {
        color: "#ff9100",
        name: "orange",
    },
    {
        color: "#ececec",
        name: "white",
    },
    {
        color: "#ff6347",
        name: "tomato",
    },
    {
        color: "#8a2be2",
        name: "blue violet",
    },
    {
        color: "#ff8c00",
        name: "dark orange",
    },
    {
        color: "#32cd32",
        name: "lime green",
    },
    {
        color: "#9932cc",
        name: "dark orchid",
    },
    {
        color: "#ffd700",
        name: "gold",
    },
    {
        color: "#00bfff",
        name: "deep sky blue",
    },
];

const materials = [
    "abstract",
    "abstractT",
    "surface",
    "wood",
    "bark_pine",
    "candy",
    "stylized_fur",
    "milkshake",
    "lava",
    "coffee",
];

// Новые данные для начинки и теста
const fillings = [
    "Chocolate",
    "Strawberry",
    "Cherry",
    "Raspberry",
    "Caramel",
    "Mango-Passionfruit",
];

const doughTypes = ["Classic", "Gluten-Free", "Vegan", "Sugar-Free"];

const CustomizationContext = createContext({});

export const CustomizationProvider = (props) => {
    const [material, setMaterial] = useState(materials[0]);
    const [form, setForm] = useState(1);
    const [candle, setCandle] = useState(false);
    const [chocolate, setChocolate] = useState(false);
    const [balls, setBalls] = useState(false);
    const [nuts, setNuts] = useState(false);
    const [cakeColor, setCakeColor] = useState(cakeColors[0]);
    const [creamColor, setCreamColor] = useState(creamColors[0]);
    const [filling, setFilling] = useState(fillings[0]);
    const [dough, setDough] = useState(doughTypes[0]);

    const generateRandomCake = () => {
        // Случайный выбор материала
        const randomMaterial = materials[Math.floor(Math.random() * materials.length)];

        // Случайный выбор формы
        const randomForm = Math.random() < 0.5 ? 1 : 2;

        // Случайный выбор цвета торта
        const randomCakeColor = cakeColors[Math.floor(Math.random() * cakeColors.length)];

        // Случайный выбор цвета крема
        const randomCreamColor = creamColors[Math.floor(Math.random() * creamColors.length)];

        // Случайный выбор начинки
        const randomFilling = fillings[Math.floor(Math.random() * fillings.length)];

        // Случайный выбор декорации (только одна)
        const decorationOptions = ['candle', 'chocolate', 'balls', 'nuts'];
        const randomDecoration = decorationOptions[Math.floor(Math.random() * decorationOptions.length)];

        // Установка состояний
        setMaterial(randomMaterial);
        setForm(randomForm);
        setCakeColor(randomCakeColor);
        setCreamColor(randomCreamColor);
        setFilling(randomFilling);

        // Установка декорации: только одна активна
        setCandle(false);
        setChocolate(false);
        setBalls(false);
        setNuts(false);
        switch (randomDecoration) {
            case 'candle':
                setCandle(true);
                break;
            case 'chocolate':
                setChocolate(true);
                break;
            case 'balls':
                setBalls(true);
                break;
            case 'nuts':
                setNuts(true);
                break;
            default:
                break;
        }

        // Установка теста по умолчанию
        setDough("Classic");
    };
    return (
        <CustomizationContext.Provider
            value={{
                material,
                materials,
                setMaterial,
                form,
                setForm,
                cakeColors,
                cakeColor,
                setCakeColor,
                creamColors,
                creamColor,
                setCreamColor,
                setCandle,
                candle,
                setBalls,
                balls,
                setChocolate,
                chocolate,
                setNuts,
                nuts,
                fillings,
                filling,
                setFilling,
                doughTypes,
                dough,
                setDough,
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