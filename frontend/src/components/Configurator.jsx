// Configurator.jsx
import React from "react";
import { Box, Typography, Button, Card, CardContent, IconButton, Tooltip } from "@mui/material";
import { useCustomization } from "../contexts/Customization";
import AppsIcon from '@mui/icons-material/Apps'; // Импортируем иконку кубика

const Configurator = () => {
    const {
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
    } = useCustomization();

    const handleOrder = () => {
        console.log("Order placed!");
    };

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
            <Box sx={{ display: "flex", justifyContent: "flex-end", mb: -3 }}>
                <Tooltip title="Random bento">
                    <IconButton
                        onClick={generateRandomCake}
                        size="small"
                        sx={{ color: "#fff", bgcolor: "#4a306d", '&:hover': { bgcolor: "#3a205d" } }}
                        aria-label="Random bento"
                    >
                        <AppsIcon />
                    </IconButton>
                </Tooltip>
            </Box>

            <CardContent sx={{ flexGrow: 1 }}>
                {/* Section: Form */}
                <Box sx={{ mb: 3 }}>
                    <Typography variant="h6" color="white" gutterBottom>
                        Form
                    </Typography>
                    <Box sx={{ display: "flex", gap: 1 }}>
                        <Button
                            onClick={() => setForm(1)}
                            sx={{
                                bgcolor: form === 1 ? "white" : "transparent",
                                color: form === 1 ? "#4a306d" : "white",
                                fontWeight: form === 1 ? "bold" : "normal",
                                border: form === 1 ? "2px solid white" : "1px solid #aaa",
                                borderRadius: 1,
                                flex: 1,
                            }}
                        >
                            Round
                        </Button>
                        <Button
                            onClick={() => setForm(2)}
                            sx={{
                                bgcolor: form === 2 ? "white" : "transparent",
                                color: form === 2 ? "#4a306d" : "white",
                                fontWeight: form === 2 ? "bold" : "normal",
                                border: form === 2 ? "2px solid white" : "1px solid #aaa",
                                borderRadius: 1,
                                flex: 1,
                            }}
                        >
                            Heart
                        </Button>
                    </Box>
                </Box>

                {/* Section: Cake Material */}
                <Box sx={{ mb: 3 }}>
                    <Typography variant="h6" color="white" gutterBottom>
                        Cake Material
                    </Typography>
                    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                        {materials.map((item) => (
                            <Button
                                key={item}
                                onClick={() => setMaterial(item)}
                                sx={{
                                    bgcolor: material === item ? "white" : "transparent",
                                    color: material === item ? "#4a306d" : "white",
                                    fontWeight: material === item ? "bold" : "normal",
                                    border: material === item ? "2px solid white" : "1px solid #aaa",
                                    textTransform: "capitalize",
                                    borderRadius: 1,
                                    flex: "1 0 45%", // Две кнопки в ряд
                                }}
                            >
                                {item.replace("_", " ")}
                            </Button>
                        ))}
                    </Box>
                </Box>

                {/* Section: Cake Color */}
                <Box sx={{ mb: 3 }}>
                    <Typography variant="h6" color="white" gutterBottom>
                        Cake Color
                    </Typography>
                    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                        {cakeColors.map((item, index) => (
                            <Button
                                key={index}
                                onClick={() => setCakeColor(item)}
                                sx={{
                                    bgcolor: item.color === cakeColor.color ? "white" : "transparent",
                                    color: item.color === cakeColor.color ? "#4a306d" : "white",
                                    fontWeight: item.color === cakeColor.color ? "bold" : "normal",
                                    borderRadius: "50%",
                                    width: 40,
                                    height: 40,
                                    border: `2px solid ${item.color}`,
                                    minWidth: 40,
                                    padding: 0,
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                }}
                            >
                                {/* Опционально можно добавить значок или текст */}
                            </Button>
                        ))}
                    </Box>
                </Box>

                {/* Section: Cream Color (Отображается только при форме Heart) */}
                {form === 2 && (
                    <Box sx={{ mb: 3 }}>
                        <Typography variant="h6" color="white" gutterBottom>
                            Cream Color
                        </Typography>
                        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                            {creamColors.map((item, index) => (
                                <Button
                                    key={index}
                                    onClick={() => setCreamColor(item)}
                                    sx={{
                                        bgcolor: item.color === creamColor.color ? "white" : "transparent",
                                        color: item.color === creamColor.color ? "#4a306d" : "white",
                                        fontWeight: item.color === creamColor.color ? "bold" : "normal",
                                        borderRadius: "50%",
                                        width: 40,
                                        height: 40,
                                        border: `2px solid ${item.color}`,
                                        minWidth: 40,
                                        padding: 0,
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                    }}
                                >
                                    {/* Опционально можно добавить значок или текст */}
                                </Button>
                            ))}
                        </Box>
                    </Box>
                )}

                {/* Section: Filling */}
                <Box sx={{ mb: 3 }}>
                    <Typography variant="h6" color="white" gutterBottom>
                        Filling
                    </Typography>
                    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                        {fillings.map((item) => (
                            <Button
                                key={item}
                                onClick={() => setFilling(item)}
                                sx={{
                                    bgcolor: filling === item ? "white" : "transparent",
                                    color: filling === item ? "#4a306d" : "white",
                                    fontWeight: filling === item ? "bold" : "normal",
                                    border: filling === item ? "2px solid white" : "1px solid #aaa",
                                    textTransform: "capitalize",
                                    borderRadius: 1,
                                    flex: "1 0 45%", // Две кнопки в ряд
                                }}
                            >
                                {item}
                            </Button>
                        ))}
                    </Box>
                </Box>

                {/* Section: Dough Type */}
                <Box sx={{ mb: 3 }}>
                    <Typography variant="h6" color="white" gutterBottom>
                        Dough Type
                    </Typography>
                    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                        {doughTypes.map((item) => (
                            <Button
                                key={item}
                                onClick={() => setDough(item)}
                                sx={{
                                    bgcolor: dough === item ? "white" : "transparent",
                                    color: dough === item ? "#4a306d" : "white",
                                    fontWeight: dough === item ? "bold" : "normal",
                                    border: dough === item ? "2px solid white" : "1px solid #aaa",
                                    textTransform: "capitalize",
                                    borderRadius: 1,
                                    flex: "1 0 45%", // Две кнопки в ряд
                                }}
                            >
                                {item}
                            </Button>
                        ))}
                    </Box>
                </Box>

                {/* Section: Decorations */}
                <Box sx={{ mb: 3 }}>
                    <Typography variant="h6" color="white" gutterBottom>
                        Decorations
                    </Typography>
                    <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                        {/* Nuts */}
                        <Box sx={{ display: "flex", alignItems: "center" }}>
                            <label className="checkBox" style={{ marginRight: 8 }}>
                                <input
                                    id="ch_nuts"
                                    type="checkbox"
                                    checked={nuts}
                                    onChange={(event) => setNuts(event.target.checked)}
                                    style={{ display: "none" }}
                                />
                                <Box
                                    sx={{
                                        width: 24,
                                        height: 24,
                                        borderRadius: "50%",
                                        border: "2px solid #fff",
                                        position: "relative",
                                        cursor: "pointer",
                                        bgcolor: nuts ? "#4a306d" : "transparent",
                                        transition: "background-color 0.3s",
                                    }}
                                >
                                    {nuts && (
                                        <Box
                                            sx={{
                                                position: "absolute",
                                                top: "50%",
                                                left: "50%",
                                                transform: "translate(-50%, -50%)",
                                                width: 12,
                                                height: 12,
                                                bgcolor: "#fff",
                                                borderRadius: "50%",
                                            }}
                                        />
                                    )}
                                </Box>
                            </label>
                            <Typography variant="body1" color="white">
                                Nuts
                            </Typography>
                        </Box>

                        {/* Chocolate */}
                        <Box sx={{ display: "flex", alignItems: "center" }}>
                            <label className="checkBox" style={{ marginRight: 8 }}>
                                <input
                                    id="ch_chocolate"
                                    type="checkbox"
                                    checked={chocolate}
                                    onChange={(event) => setChocolate(event.target.checked)}
                                    style={{ display: "none" }}
                                />
                                <Box
                                    sx={{
                                        width: 24,
                                        height: 24,
                                        borderRadius: "50%",
                                        border: "2px solid #fff",
                                        position: "relative",
                                        cursor: "pointer",
                                        bgcolor: chocolate ? "#4a306d" : "transparent",
                                        transition: "background-color 0.3s",
                                    }}
                                >
                                    {chocolate && (
                                        <Box
                                            sx={{
                                                position: "absolute",
                                                top: "50%",
                                                left: "50%",
                                                transform: "translate(-50%, -50%)",
                                                width: 12,
                                                height: 12,
                                                bgcolor: "#fff",
                                                borderRadius: "50%",
                                            }}
                                        />
                                    )}
                                </Box>
                            </label>
                            <Typography variant="body1" color="white">
                                Chocolate
                            </Typography>
                        </Box>

                        {/* Balls */}
                        <Box sx={{ display: "flex", alignItems: "center" }}>
                            <label className="checkBox" style={{ marginRight: 8 }}>
                                <input
                                    id="ch_balls"
                                    type="checkbox"
                                    checked={balls}
                                    onChange={(event) => setBalls(event.target.checked)}
                                    style={{ display: "none" }}
                                />
                                <Box
                                    sx={{
                                        width: 24,
                                        height: 24,
                                        borderRadius: "50%",
                                        border: "2px solid #fff",
                                        position: "relative",
                                        cursor: "pointer",
                                        bgcolor: balls ? "#4a306d" : "transparent",
                                        transition: "background-color 0.3s",
                                    }}
                                >
                                    {balls && (
                                        <Box
                                            sx={{
                                                position: "absolute",
                                                top: "50%",
                                                left: "50%",
                                                transform: "translate(-50%, -50%)",
                                                width: 12,
                                                height: 12,
                                                bgcolor: "#fff",
                                                borderRadius: "50%",
                                            }}
                                        />
                                    )}
                                </Box>
                            </label>
                            <Typography variant="body1" color="white">
                                Balls
                            </Typography>
                        </Box>

                        {/* Candle */}
                        <Box sx={{ display: "flex", alignItems: "center" }}>
                            <label className="checkBox" style={{ marginRight: 8 }}>
                                <input
                                    id="ch_candle"
                                    type="checkbox"
                                    checked={candle}
                                    onChange={(event) => setCandle(event.target.checked)}
                                    style={{ display: "none" }}
                                />
                                <Box
                                    sx={{
                                        width: 24,
                                        height: 24,
                                        borderRadius: "50%",
                                        border: "2px solid #fff",
                                        position: "relative",
                                        cursor: "pointer",
                                        bgcolor: candle ? "#4a306d" : "transparent",
                                        transition: "background-color 0.3s",
                                    }}
                                >
                                    {candle && (
                                        <Box
                                            sx={{
                                                position: "absolute",
                                                top: "50%",
                                                left: "50%",
                                                transform: "translate(-50%, -50%)",
                                                width: 12,
                                                height: 12,
                                                bgcolor: "#fff",
                                                borderRadius: "50%",
                                            }}
                                        />
                                    )}
                                </Box>
                            </label>
                            <Typography variant="body1" color="white">
                                Candle
                            </Typography>
                        </Box>
                    </Box>
                </Box>
            </CardContent>

            {/* Section: Order Button */}
            <Box sx={{ p: 2, borderTop: "1px solid #444" }}>
                <Button
                    variant="contained"
                    color="primary"
                    fullWidth
                    onClick={handleOrder}
                    sx={{
                        bgcolor: "#4a306d",
                        color: "#fff",
                        fontWeight: "bold",
                        textTransform: "uppercase",
                        borderRadius: 1,
                        paddingY: 1.5,
                        "&:hover": {
                            bgcolor: "#3a205d",
                        },
                    }}
                >
                    ORDER
                </Button>
            </Box>
        </Card>
    );
};

export default Configurator;