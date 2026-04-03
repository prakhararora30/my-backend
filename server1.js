require("dotenv").config();   // MUST be at top

const express = require("express");
const cors = require("cors");

const app = express();

// ✅ Middlewares
app.use(cors());
app.use(express.json());

console.log("✅ SERVER FILE RUNNING");

// ✅ OpenRouter setup (FREE)
const OpenAI = require("openai");

const client = new OpenAI({
    apiKey: process.env.OPENROUTER_API_KEY,   // 🔥 use this key
    baseURL: "https://openrouter.ai/api/v1"
});

// ✅ Test route
app.get("/test", (req, res) => {
    res.send("TEST WORKING");
});

// ✅ Chat route
app.post("/chat", async (req, res) => {
    console.log("🔥 /chat route hit");

    try {
        const userMessage = req.body.message;

        if (!userMessage) {
            return res.status(400).json({ error: "Message is required" });
        }

        const response = await client.chat.completions.create({
            model: "openai/gpt-3.5-turbo",   // 🔥 FREE model
            messages: [
                { role: "user", content: userMessage }
            ]
        });

        res.json({
            reply: response.choices[0].message.content
        });

    } catch (err) {
        console.error("❌ ERROR:", err.message);
        res.status(500).json({ error: err.message });
    }
});

// ✅ Start server
app.listen(5000, () => {
    console.log("🚀 Server running on http://localhost:5000");
});
