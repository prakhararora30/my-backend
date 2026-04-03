const express = require("express");
const app = express();
app.use(express.json());

require("dotenv").config();

const OpenAI = require("openai");
const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

app.post("/chat", async (req, res) => {
    try {
        const userMessage = req.body.message;

        const response = await client.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                { role: "user", content: userMessage }
            ]
        });

        res.json({
            reply: response.choices[0].message.content
        });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.listen(3000, () => console.log("Server running"));
