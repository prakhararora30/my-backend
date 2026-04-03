const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dns = require("dns");

const app = express();

app.use(cors());
app.use(express.json());

// ✅ Fix DNS issue (since your system needs it)
dns.setServers(['1.1.1.1', '8.8.8.8']);

// ❗ Disable buffering (prevents timeout error)
mongoose.set("bufferCommands", false);

// 🔥 Debug logs (very helpful)
mongoose.connection.on("connected", () => {
    console.log("🔥 Mongoose actually connected");
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

// ✅ Use correct collection name from your DB
const User = mongoose.model("user", userSchema, "collection");

// 🔍 Search API
app.get("/search", async (req, res) => {
    try {
        const query = req.query.name; // using ?name=

        if (!query) {
            return res.json([]);
        }

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
        console.error("❌ Search Error:", err);
        res.status(500).json({ error: err.message });
    }
});

// 🚀 Start server AFTER DB connection
const startServer = async () => {
    try {
        await mongoose.connect(
            "mongodb+srv://prakhararora2877_db_user:19xmbZKLgOwvioii@connectcluster.mky9ow4.mongodb.net/users?retryWrites=true&w=majority",
            {
                serverSelectionTimeoutMS: 10000
            }
        );

        console.log("✅ DB Connected");

        app.listen(3000, '0.0.0.0', () => {
            console.log("🚀 Server running on port 3000");
        });

    } catch (err) {
        console.error("❌ DB Connection Error:", err);
    }
};

startServer();
