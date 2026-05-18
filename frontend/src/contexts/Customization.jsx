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

const CustomizationContext = createContext({});

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

    const tier = CAKE_SIZES[selectedTierIndex] ?? CAKE_SIZES[0];

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
            }}
        >
            {props.children}
        </CustomizationContext.Provider>
    );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useCustomization = () => useContext(CustomizationContext);
