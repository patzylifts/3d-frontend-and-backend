// Configurator.jsx
import React from "react";
import {
    Box, Typography, Button, Card, CardContent, IconButton, Tooltip,
} from "@mui/material";
import CasinoIcon from "@mui/icons-material/Casino";
import { useCustomization } from "../../hooks/useCustomization";
import { cakeColors, flavors, flavorTextureMap } from "../contexts/cakeConstants";

// Small preview label for each flavor showing which texture it maps to
const flavorLabel = (f) => {
    const icons = {
        "Chocolate": "🍫",
        "Strawberry": "🍓",
        "Cherry": "🍒",
        "Raspberry": "🫐",
        "Caramel": "🍯",
        "Mango-Passionfruit": "🥭",
    };
    return `${icons[f] ?? ""} ${f}`;
};

const Configurator = () => {
    const {
        form, setForm,
        cakeColor, setCakeColor,
        flavor, setFlavor,
        candle, setCandle,
        balls, setBalls,
        chocolate, setChocolate,
        nuts, setNuts,
        generateRandomCake,
    } = useCustomization();

    // Shared active-button style helper
    const btnSx = (active) => ({
        bgcolor: active ? "white" : "transparent",
        color: active ? "#4a306d" : "white",
        fontWeight: active ? "bold" : "normal",
        border: active ? "2px solid white" : "1px solid #aaa",
        borderRadius: 1,
        textTransform: "none",
        flex: "1 0 45%",
        "&:hover": { bgcolor: active ? "#e0e0e0" : "rgba(255,255,255,0.08)" },
    });

    const decorations = [
        { label: "🥜 Nuts", value: nuts, set: setNuts },
        { label: "🍫 Chocolate", value: chocolate, set: setChocolate },
        { label: "🔮 Balls", value: balls, set: setBalls },
        { label: "🕯️ Candle", value: candle, set: setCandle },
    ];

    return (
        <Card
            sx={{
                position: "fixed",
                right: 24,
                top: 10,
                bottom: 10,
                width: 360,
                overflowY: "auto",
                bgcolor: "#1a1a1a",
                borderRadius: 2,
                boxShadow: 3,
                display: "flex",
                flexDirection: "column",
                padding: 2,
            }}
            className="custom-scrollbar"
        >
            {/* ── Random button ── */}
            <Box sx={{ display: "flex", justifyContent: "flex-end", mb: -3 }}>
                <Tooltip title="Randomize cake">
                    <IconButton
                        onClick={generateRandomCake}
                        size="small"
                        sx={{ color: "#fff", bgcolor: "#4a306d", "&:hover": { bgcolor: "#3a205d" } }}
                        aria-label="Randomize cake"
                    >
                        <CasinoIcon />
                    </IconButton>
                </Tooltip>
            </Box>

            <CardContent sx={{ flexGrow: 1 }}>

                {/* ── Shape ── */}
                <Box sx={{ mb: 3 }}>
                    <Typography variant="h6" color="white" gutterBottom>
                        Shape
                    </Typography>
                    <Box sx={{ display: "flex", gap: 1 }}>
                        <Button onClick={() => setForm(1)} sx={btnSx(form === 1)}>
                            ❤️ Round
                        </Button>
                        <Button onClick={() => setForm(2)} sx={btnSx(form === 2)}>
                            ⬛ Rectangle
                        </Button>
                    </Box>
                </Box>

                {/* ── Cake Color ── */}
                <Box sx={{ mb: 3 }}>
                    <Typography variant="h6" color="white" gutterBottom>
                        Cake Color
                    </Typography>
                    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                        {cakeColors.map((item) => (
                            <Button
                                key={item.name}
                                onClick={() => setCakeColor(item)}
                                title={item.name}
                                sx={{
                                    borderRadius: "50%",
                                    width: 40,
                                    height: 40,
                                    minWidth: 40,
                                    padding: 0,
                                    bgcolor: item.color,
                                    border: item.name === cakeColor.name
                                        ? "3px solid white"
                                        : "2px solid transparent",
                                    outline: item.name === cakeColor.name
                                        ? "2px solid #4a306d"
                                        : "none",
                                    "&:hover": { opacity: 0.85 },
                                }}
                            />
                        ))}
                    </Box>
                </Box>

                {/* ── Flavor (drives texture) ── */}
                <Box sx={{ mb: 3 }}>
                    <Typography variant="h6" color="white" gutterBottom>
                        Flavor
                    </Typography>
                    <Typography variant="caption" color="#aaa" sx={{ display: "block", mb: 1 }}>
                        Each flavor changes the cake texture
                    </Typography>
                    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                        {flavors.map((f) => (
                            <Button
                                key={f}
                                onClick={() => setFlavor(f)}
                                sx={btnSx(flavor === f)}
                            >
                                {flavorLabel(f)}
                            </Button>
                        ))}
                    </Box>
                </Box>

                {/* ── Decorations ── */}
                <Box sx={{ mb: 3 }}>
                    <Typography variant="h6" color="white" gutterBottom>
                        Decorations
                    </Typography>
                    <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                        {decorations.map(({ label, value, set }) => (
                            <Box key={label} sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                                {/* Custom circular checkbox */}
                                <Box
                                    onClick={() => set(!value)}
                                    sx={{
                                        width: 24,
                                        height: 24,
                                        borderRadius: "50%",
                                        border: "2px solid #fff",
                                        cursor: "pointer",
                                        bgcolor: value ? "#4a306d" : "transparent",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        flexShrink: 0,
                                        transition: "background-color 0.2s",
                                    }}
                                >
                                    {value && (
                                        <Box sx={{ width: 10, height: 10, bgcolor: "#fff", borderRadius: "50%" }} />
                                    )}
                                </Box>
                                <Typography
                                    variant="body1"
                                    color="white"
                                    sx={{ cursor: "pointer", userSelect: "none" }}
                                    onClick={() => set(!value)}
                                >
                                    {label}
                                </Typography>
                            </Box>
                        ))}
                    </Box>
                </Box>
            </CardContent>

            {/* ── Order button ── */}
            <Box sx={{ p: 2, borderTop: "1px solid #444" }}>
                <Button
                    variant="contained"
                    fullWidth
                    sx={{
                        bgcolor: "#4a306d",
                        color: "#fff",
                        fontWeight: "bold",
                        textTransform: "uppercase",
                        borderRadius: 1,
                        paddingY: 1.5,
                        "&:hover": { bgcolor: "#3a205d" },
                    }}
                    onClick={() => console.log("Order placed!")}
                >
                    ORDER
                </Button>
            </Box>
        </Card>
    );
};

export default Configurator;