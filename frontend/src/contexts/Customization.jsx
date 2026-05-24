import { createContext, useContext, useEffect, useState } from "react";

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

export const CAKE_SIZES = [
    {
        tier: "1 Tier Cake",
        tierKey: "tier1",
        sizes: ["Bento Cake", "Tall Bento Cake", "Standard", "Tall Cake"],
    },
    {
        tier: "Mini 2 Tier",
        tierKey: "tier2",
        sizes: ["6x4 & 4x4", "6x6 Cake", "6x8 Cake", "8x5 Cake"],
    },
    {
        tier: "3 Tier Cake",
        tierKey: "tier3",
        sizes: ["4x5, 6x6 & 8x5"],
    },
    {
        tier: "4 Tier Cake",
        tierKey: "tier4",
        sizes: ["4x4 & 6x6, 8x5 & 10x4"],
    },
];

const DEFAULT_CAKE_PRICES = {
    tier1: { "Choco Moist": 1000, "Vanilla Chiffon": 900, "Ube Chiffon": 900 },
    tier2: { "Choco Moist": 1800, "Vanilla Chiffon": 1600, "Ube Chiffon": 1600 },
    tier3: { "Choco Moist": 2800, "Vanilla Chiffon": 2500, "Ube Chiffon": 2500 },
    tier4: { "Choco Moist": 3800, "Vanilla Chiffon": 3400, "Ube Chiffon": 3400 },
};

const DEFAULT_ADDON_PRICES = {
    candle: 100,
    chocolate: 200,
    balls: 100,
    nuts: 75,
};

export const TOPPING_OPTIONS = [
    { key: "candle", label: "Candle", shortLabel: "C", color: "#f3b23f" },
    { key: "chocolate", label: "Chocolate", shortLabel: "Ch", color: "#5c2f1f" },
    { key: "balls", label: "Balls", shortLabel: "B", color: "#7f54d8" },
    { key: "nuts", label: "Nuts", shortLabel: "N", color: "#c99a5b" },
];

export const TOPPING_SIZES = {
    Small: 0.78,
    Medium: 1,
    Large: 1.28,
};

const DEFAULT_TOPPING_LAYOUT = {
    candle: { x: 50, y: 45, size: "Medium" },
    chocolate: { x: 49, y: 42, size: "Medium" },
    balls: { x: 61, y: 50, size: "Medium" },
    nuts: { x: 54, y: 66, size: "Medium" },
};

const CustomizationContext = createContext({});

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const clampToCakeShape = (x, y, form) => {
    const next = {
        x: clamp(x, 10, 90),
        y: clamp(y, 10, 90),
    };

    if (form === 1) {
        const centerX = 50;
        const centerY = 50;
        const radius = 40;
        const dx = next.x - centerX;
        const dy = next.y - centerY;
        const distance = Math.hypot(dx, dy);

        if (distance > radius) {
            const ratio = radius / distance;
            next.x = centerX + dx * ratio;
            next.y = centerY + dy * ratio;
        }
    }

    return next;
};

export const CustomizationProvider = (props) => {
    const BASEURL = import.meta.env.VITE_DJANGO_BASE_URL;

    const [form, setForm] = useState(1);
    const [selectedTierIndex, setSelectedTierIndex] = useState(0);
    const [selectedSize, setSelectedSize] = useState(CAKE_SIZES[0].sizes[0]);
    const [candle, setCandle] = useState(false);
    const [chocolate, setChocolate] = useState(false);
    const [balls, setBalls] = useState(false);
    const [nuts, setNuts] = useState(false);
    const [cakeColor, setCakeColor] = useState(cakeColors[0]);
    const [flavor, setFlavor] = useState(flavors[0]);
    const [basePrices, setBasePrices] = useState([]);
    const [addonPrices, setAddonPrices] = useState([]);
    const [pricingLoading, setPricingLoading] = useState(true);
    const [pricingError, setPricingError] = useState("");
    const [toppingLayout, setToppingLayout] = useState(DEFAULT_TOPPING_LAYOUT);

    const tier = CAKE_SIZES[selectedTierIndex] ?? CAKE_SIZES[0];

    useEffect(() => {
        setToppingLayout((currentLayout) =>
            Object.fromEntries(
                Object.entries(currentLayout).map(([key, value]) => {
                    const nextPosition = clampToCakeShape(value.x, value.y, form);
                    return [key, { ...value, ...nextPosition }];
                })
            )
        );
    }, [form]);

    useEffect(() => {
        let isMounted = true;

        async function fetchPricing() {
            setPricingLoading(true);
            setPricingError("");

            try {
                const res = await fetch(`${BASEURL}/api/custom-pricing/`);
                if (!res.ok) throw new Error("Failed to load custom cake pricing");
                const data = await res.json();

                if (isMounted) {
                    setBasePrices(data.base_prices || []);
                    setAddonPrices(data.addon_prices || []);
                }
            } catch (error) {
                if (isMounted) {
                    setPricingError(error.message);
                }
            } finally {
                if (isMounted) {
                    setPricingLoading(false);
                }
            }
        }

        fetchPricing();

        return () => {
            isMounted = false;
        };
    }, [BASEURL]);

    const getBasePrice = () => {
        const configuredPrice = basePrices.find((item) =>
            item.tier === tier.tier &&
            item.size === selectedSize &&
            item.flavor === flavor
        );

        if (configuredPrice) return Number(configuredPrice.price);
        return DEFAULT_CAKE_PRICES[tier.tierKey]?.[flavor] ?? 1000;
    };

    const getAddonPrice = (key) => {
        const configuredAddon = addonPrices.find((item) => item.key === key);
        if (configuredAddon) return Number(configuredAddon.price);
        return DEFAULT_ADDON_PRICES[key] ?? 0;
    };

    const calculatePrice = () => {
        let addonsPrice = 0;
        if (candle) addonsPrice += getAddonPrice("candle");
        if (chocolate) addonsPrice += getAddonPrice("chocolate");
        if (balls) addonsPrice += getAddonPrice("balls");
        if (nuts) addonsPrice += getAddonPrice("nuts");

        return getBasePrice() + addonsPrice;
    };

    const handleTierChange = (idx) => {
        setSelectedTierIndex(idx);
        setSelectedSize(CAKE_SIZES[idx].sizes[0]);
    };

    const setToppingPosition = (key, x, y) => {
        setToppingLayout((currentLayout) => {
            const current = currentLayout[key] ?? DEFAULT_TOPPING_LAYOUT[key];
            const nextPosition = clampToCakeShape(x, y, form);
            return {
                ...currentLayout,
                [key]: {
                    ...current,
                    ...nextPosition,
                },
            };
        });
    };

    const setToppingSize = (key, size) => {
        if (!TOPPING_SIZES[size]) return;

        setToppingLayout((currentLayout) => {
            const current = currentLayout[key] ?? DEFAULT_TOPPING_LAYOUT[key];
            return {
                ...currentLayout,
                [key]: {
                    ...current,
                    size,
                },
            };
        });
    };

    const generateRandomCake = () => {
        const randomForm = Math.random() < 0.5 ? 1 : 2;
        const randomTierIdx = Math.floor(Math.random() * CAKE_SIZES.length);
        const randomCakeColor = cakeColors[Math.floor(Math.random() * cakeColors.length)];
        const randomFlavor = flavors[Math.floor(Math.random() * flavors.length)];
        const decorationOptions = ["candle", "chocolate", "balls", "nuts"];
        const randomDecoration = decorationOptions[Math.floor(Math.random() * decorationOptions.length)];

        setForm(randomForm);
        setSelectedTierIndex(randomTierIdx);
        setSelectedSize(CAKE_SIZES[randomTierIdx].sizes[0]);
        setCakeColor(randomCakeColor);
        setFlavor(randomFlavor);
        setToppingLayout(
            Object.fromEntries(
                Object.entries(DEFAULT_TOPPING_LAYOUT).map(([key, value]) => {
                    const nextPosition = clampToCakeShape(
                        clamp(value.x + (Math.random() * 18 - 9), 10, 90),
                        clamp(value.y + (Math.random() * 18 - 9), 10, 90),
                        randomForm
                    );
                    const sizeNames = Object.keys(TOPPING_SIZES);
                    return [
                        key,
                        {
                            ...value,
                            ...nextPosition,
                            size: sizeNames[Math.floor(Math.random() * sizeNames.length)],
                        },
                    ];
                })
            )
        );

        setCandle(false);
        setChocolate(false);
        setBalls(false);
        setNuts(false);
        switch (randomDecoration) {
            case "candle":
                setCandle(true);
                break;
            case "chocolate":
                setChocolate(true);
                break;
            case "balls":
                setBalls(true);
                break;
            case "nuts":
                setNuts(true);
                break;
            default:
                break;
        }
    };

    return (
        <CustomizationContext.Provider
            value={{
                form,
                setForm,
                selectedTierIndex,
                setSelectedTierIndex: handleTierChange,
                selectedSize,
                setSelectedSize,
                cakeColors,
                cakeColor,
                setCakeColor,
                flavors,
                flavor,
                setFlavor,
                flavorTextureMap,
                candle,
                setCandle,
                chocolate,
                setChocolate,
                balls,
                setBalls,
                nuts,
                setNuts,
                generateRandomCake,
                calculatePrice,
                pricingLoading,
                pricingError,
                basePrices,
                addonPrices,
                toppingLayout,
                setToppingPosition,
                setToppingSize,
            }}
        >
            {props.children}
        </CustomizationContext.Provider>
    );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useCustomization = () => useContext(CustomizationContext);
