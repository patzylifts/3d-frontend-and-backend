// cakeConstants.js — shared constants, no React imports

export const cakeColors = [
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

export const flavorTextureMap = {
    "Chocolate": "coffee",
    "Strawberry": "milkshake",
    "Cherry": "abstract",
    "Raspberry": "lava",
    "Caramel": "bark_pine",
    "Mango-Passionfruit": "abstractT",
};

export const flavors = Object.keys(flavorTextureMap);