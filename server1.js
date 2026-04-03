const express = require("express");
const app = express();
app.use(express.json());

const OpenAI = require("openai");
const client = new OpenAI({
    apiKey: "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"
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