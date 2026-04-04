require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dns = require("dns");
const nodemailer = require("nodemailer");
const OpenAI = require("openai");

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

const User = mongoose.model("user", userSchema, "collection");

// =======================
// 🧪 DEBUG ROUTE
// =======================

app.get("/debug", async (req, res) => {
    try {
        const count = await User.countDocuments();
        const sample = await User.find({}).limit(3).lean();
        res.json({
            dbState: mongoose.connection.readyState,
            totalDocs: count,
            sample: sample
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

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
// 📧 EMAIL + OTP SETUP
// =======================

const otpStore = {};

// ✅ Fixed transporter — forces IPv4, avoids Render IPv6 issue
const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    family: 4,
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    },
    tls: {
        rejectUnauthorized: false
    }
});

// ✅ Verify transporter on startup
transporter.verify((error, success) => {
    if (error) {
        console.log("❌ Email transporter error:", error);
    } else {
        console.log("✅ Email transporter ready");
    }
});

// ✅ SEND OTP
app.post("/send-otp", async (req, res) => {
    console.log("🔥 /send-otp hit");

    try {
        if (!req.body || !req.body.email) {
            return res.status(400).json({ error: "Email required" });
        }

        const email = req.body.email;
        console.log("📧 Email:", email);

        const otp = Math.floor(100000 + Math.random() * 900000);
        console.log("🔑 OTP:", otp);

        otpStore[email] = otp;

        await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: email,
            subject: "Your OTP Code",
            text: `Your OTP is ${otp}`
        });

        res.json({ message: "OTP sent" });

    } catch (err) {
        console.error("❌ EMAIL ERROR:", err);
        res.status(500).json({ error: err.message });
    }
});

// ✅ VERIFY OTP
app.post("/verify-otp", (req, res) => {
    try {
        if (!req.body || !req.body.email || !req.body.otp) {
            return res.status(400).json({ error: "Email and OTP required" });
        }

        const { email, otp } = req.body;

        if (otpStore[email] == otp) {
            delete otpStore[email];
            return res.json({ success: true });
        }

        res.status(400).json({ success: false, message: "Invalid OTP" });

    } catch (err) {
        console.error("❌ VERIFY ERROR:", err);
        res.status(500).json({ error: err.message });
    }
});

// =======================
// 🤖 CHATBOT SETUP
// =======================

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
// 🤖 CHAT + DB
// =======================

app.post("/chat", async (req, res) => {
    console.log("🔥 /chat route hit");

    try {
        if (!req.body || !req.body.message) {
            return res.status(400).json({ error: "Message is required" });
        }

        const userMessage = req.body.message;

        // 🧠 Clean sentence
        const stopWords = [
            "i","want","people","working","in","the","a","an","who",
            "is","are","for","with","me","to","of"
        ];

        const words = userMessage
            .toLowerCase()
            .split(" ")
            .filter(word => !stopWords.includes(word));

        // fallback if no keywords
        const regex = words.length > 0
            ? new RegExp(words.join("|"), "i")
            : /.*/;

        // 🔍 Search DB
        const users = await User.find({
            $or: [
                { name: regex },
                { company: regex },
                { branch: regex },
                { domain: regex }
            ]
        })
        .limit(5)
        .select("name company branch")
        .lean();

        // ✅ If users found
        if (users.length > 0) {
            return res.json({
                reply: "Here are some people I found:",
                users: users
            });
        }

        // 🤖 AI fallback
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
        console.error("❌ CHAT ERROR:", err);
        res.status(500).json({ error: err.message });
    }
});

// =======================
// 🚀 START SERVER
// =======================

const PORT = process.env.PORT || 5000;

const startServer = async () => {
    try {
        if (!process.env.MONGO_URI) {
            throw new Error("MONGO_URI missing in .env");
        }

        await mongoose.connect(process.env.MONGO_URI, {
            serverSelectionTimeoutMS: 10000
        });

        console.log("✅ DB Connected");

        app.listen(PORT, () => {
            console.log(`🚀 Server running on port ${PORT}`);
        });

    } catch (err) {
        console.error("❌ DB Error:", err.message);
    }
};

startServer();
