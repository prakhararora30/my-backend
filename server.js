require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dns = require("dns");

const app = express();

// ✅ Middlewares
app.use(cors());
app.use(express.json());

console.log("✅ SERVER RUNNING");

// ✅ Fix DNS
dns.setServers(['1.1.1.1', '8.8.8.8']);

// =======================
// 🔥 MONGODB SETUP
// =======================

mongoose.set("bufferCommands", false);

mongoose.connection.on("connected", () => {
    console.log("🔥 Mongoose connected");
});

mongoose.connection.on("error", (err) => {
    console.log("❌ Mongoose error:", err);
});

// 📄 Schema
const userSchema = new mongoose.Schema({
    name: String,
    company: String,
    branch: String,
    mail_Id: String,
    domain: String,
    job_profile: String,
    city: String,
    country: String,
    joining_year: Number,
    passing_year: Number,
    degree: String
});

// ✅ Collection
const User = mongoose.model("user", userSchema, "collection");

// =======================
// 🔍 SEARCH API
// =======================

app.get("/search", async (req, res) => {
    try {
        const query = req.query.name;

        if (!query) return res.json([]);

        const users = await User.find({
            $or: [
                { name: { $regex: query, $options: "i" } },
                { company: { $regex: query, $options: "i" } },
                { branch: { $regex: query, $options: "i" } }
            ]
        })
        .limit(10)
        .select("name company branch")
        .lean();

        res.json(users);

    } catch (err) {
        console.error("❌ Search Error:", err.message);
        res.status(500).json({ error: err.message });
    }
});

// =======================
// 🤖 CHATBOT SETUP
// =======================

const OpenAI = require("openai");

const client = new OpenAI({
    apiKey: process.env.OPENROUTER_API_KEY,
    baseURL: "https://openrouter.ai/api/v1"
});

// =======================
// 🧪 TEST API
// =======================

app.get("/test", (req, res) => {
    res.send("TEST WORKING");
});

// =======================
// 🤖 CHAT + DB INTEGRATION
// =======================

app.post("/chat", async (req, res) => {
    console.log("🔥 /chat route hit");

    try {
        const userMessage = req.body.message;

        if (!userMessage) {
            return res.status(400).json({ error: "Message is required" });
        }

        // =======================
        // 🔍 STEP 1: SEARCH DATABASE
        // =======================

        const keyword = userMessage.toLowerCase();

        const users = await User.find({
            $or: [
                { name: { $regex: keyword, $options: "i" } },
                { company: { $regex: keyword, $options: "i" } },
                { branch: { $regex: keyword, $options: "i" } },
                { domain: { $regex: keyword, $options: "i" } }
            ]
        })
        .limit(5)
        .select("name company branch")
        .lean();

        // =======================
        // 🎯 STEP 2: IF USERS FOUND
        // =======================

        if (users.length > 0) {
            return res.json({
                reply: "Here are some people I found:",
                users: users
            });
        }

        // =======================
        // 🤖 STEP 3: AI RESPONSE
        // =======================

        const response = await client.chat.completions.create({
            model: "openai/gpt-3.5-turbo",
            messages: [
                {
                    role: "system",
                    content: "You are a helpful assistant for a student networking app."
                },
                {
                    role: "user",
                    content: userMessage
                }
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

// =======================
// 🚀 START SERVER (RENDER SAFE)
// =======================

const PORT = process.env.PORT || 5000;

const startServer = async () => {
    try {
        await mongoose.connect(
            "mongodb+srv://prakhararora2877_db_user:19xmbZKLgOwvioii@connectcluster.mky9ow4.mongodb.net/users?retryWrites=true&w=majority",
            {
                serverSelectionTimeoutMS: 10000
            }
        );

        console.log("✅ DB Connected");

        app.listen(PORT, () => {
            console.log(`🚀 Server running on port ${PORT}`);
        });

    } catch (err) {
        console.error("❌ DB Error:", err);
    }
};

startServer();
