
require("dotenv").config();

const session = require("express-session");
const bcrypt = require("bcryptjs");

const express = require("express");
const mongoose = require("mongoose");
const path = require("path");
const multer = require("multer");
const fs = require("fs");
const crypto = require("crypto");

const app = express();
const PORT = 3000;

app.use(express.json());

/* Admin Session Setup */

app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        sameSite: "lax",
        secure: false,
        maxAge: 60 * 60 * 1000
    }
}));

// Hash the admin password for verification
const adminPasswordHash = bcrypt.hashSync(
    process.env.ADMIN_PASSWORD,
    12
);


const uploadFolder = path.join(__dirname, "public", "uploads");

// Create folder for uploaded images
fs.mkdirSync(uploadFolder, { recursive: true });

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadFolder);
    },

    filename: (req, file, cb) => {
        const extension = {
            "image/jpeg": ".jpg",
            "image/png": ".png",
            "image/webp": ".webp"
        }[file.mimetype];

        cb(null, crypto.randomUUID() + extension);
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const allowed = [
            "image/jpeg",
            "image/png",
            "image/webp"
        ];

        if (allowed.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error("Only JPG, PNG and WebP images allowed"));
        }
    }
});

app.use(express.static(path.join(__dirname, "public")));

// Adoption Application Database Model
const adoptionSchema = new mongoose.Schema({
    fullName: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String, required: true },
    petName: {
        type: String,
        enum: ["Bruno", "Simba"],
        required: true
    },
    reason: { type: String, required: true },
    status: { type: String, default: "Pending" }
}, { timestamps: true });

const Adoption = mongoose.model("Adoption", adoptionSchema);

// Save adoption application
app.post("/api/adoptions", async (req, res) => {
    try {
        const application = new Adoption({
            fullName: req.body.fullName,
            email: req.body.email,
            phone: req.body.phone,
            petName: req.body.petName,
            reason: req.body.reason
        });

        await application.save();

        res.status(201).json({
            message: "Application submitted successfully!"
        });
    } catch (error) {
        res.status(error.name === "ValidationError" ? 400 : 500)
           .json({ message: "Could not save application." });
    }
});

/* Animal Rescue Database Model */

const rescueSchema = new mongoose.Schema({
    reporterName: { type: String, required: true },
    phone: { type: String, required: true },
    animalType: {
        type: String,
        enum: ["Dog", "Cat", "Other"],
        required: true
    },
    location: { type: String, required: true },
    condition: {
        type: String,
        enum: ["Injured", "Abandoned", "Sick", "Trapped"],
        required: true
    },
    
description: { type: String, required: true },
photo: { type: String, default: null },
status: {
    type: String,
    default: "Pending"
}

}, { timestamps: true });

const Rescue = mongoose.model("Rescue", rescueSchema);

/* Save Rescue Reports */

app.post("/api/rescues", upload.single("animalPhoto"), async (req, res) => {
    try {
        const report = new Rescue({
            reporterName: req.body.reporterName,
            phone: req.body.phone,
            animalType: req.body.animalType,
            location: req.body.location,
            condition: req.body.condition,
            description: req.body.description,
            photo: req.file ? req.file.filename : null
        });

        await report.save();

        
res.status(201).json({
    message: "Rescue report submitted successfully!",
    rescueId: report._id.toString()
});


    } catch (error) {
        if (req.file) {
            fs.unlink(req.file.path, () => {});
        }

        res.status(error.name === "ValidationError" ? 400 : 500)
            .json({
                message: "Failed to submit rescue report."
            });
    }
});


/* Check Rescue Status */

app.get("/api/rescues/:id/status", async (req, res) => {
    try {
        const rescueId = req.params.id;

        if (!mongoose.isValidObjectId(rescueId)) {
            return res.status(400).json({
                message: "Invalid Rescue ID"
            });
        }

        const rescue = await Rescue.findById(rescueId)
            .select("status");

        if (!rescue) {
            return res.status(404).json({
                message: "Rescue report not found"
            });
        }

        res.json({
            status: rescue.status
        });

    } catch (error) {
        res.status(500).json({
            message: "Unable to check rescue status"
        });
    }
});

/* Admin Login API */

app.post("/api/admin/login", async (req, res) => {
    try {
        const { username, password } = req.body;

        if (
            typeof username !== "string" ||
            typeof password !== "string"
        ) {
            return res.status(400).json({
                message: "Username and password required"
            });
        }

        const validUsername =
            username === process.env.ADMIN_USERNAME;

        const validPassword = await bcrypt.compare(
            password,
            adminPasswordHash
        );

        if (!validUsername || !validPassword) {
            return res.status(401).json({
                message: "Invalid username or password"
            });
        }

        req.session.regenerate((error) => {
            if (error) {
                return res.status(500).json({
                    message: "Login failed"
                });
            }

            req.session.isAdmin = true;

            req.session.save((saveError) => {
                if (saveError) {
                    return res.status(500).json({
                        message: "Login failed"
                    });
                }

                res.json({
                    message: "Admin Login Successful!"
                });
            });
        });

    } catch (error) {
        res.status(500).json({
            message: "Login failed"
        });
    }
});

/* Check Admin Login */

app.get("/api/admin/check", (req, res) => {
    res.json({
        loggedIn: req.session.isAdmin === true
    });
});

/* Protect Admin Routes */

function requireAdmin(req, res, next) {
    if (!req.session || req.session.isAdmin !== true) {
        return res.status(401).json({
            message: "Admin login required"
        });
    }

    next();
}

/* Get Admin Dashboard Data */

app.get("/api/admin/dashboard-data", requireAdmin, async (req, res) => {
    try {
        const adoptions = await Adoption.find()
            .sort({ createdAt: -1 })
            .limit(100);

        const rescues = await Rescue.find()
            .sort({ createdAt: -1 })
            .limit(100);

        res.json({
            adoptions: adoptions,
            rescues: rescues
        });

    } catch (error) {
        res.status(500).json({
            message: "Unable to load dashboard data"
        });
    }
});

/* Admin Logout */

app.post("/api/admin/logout", requireAdmin, (req, res) => {
    req.session.destroy((error) => {
        if (error) {
            return res.status(500).json({
                message: "Logout failed"
            });
        }

        res.clearCookie("connect.sid");

        res.json({
            message: "Logged out successfully!"
        });
    });
});

/* Admin Update Rescue Status */

app.patch("/api/admin/rescues/:id/status", requireAdmin, async (req, res) => {
    try {
        const rescueId = req.params.id;
        const { status } = req.body;

        const allowedStatuses = [
            "Pending",
            "In Progress",
            "Rescued"
        ];

        if (!mongoose.isValidObjectId(rescueId)) {
            return res.status(400).json({
                message: "Invalid Rescue ID"
            });
        }

        if (!allowedStatuses.includes(status)) {
            return res.status(400).json({
                message: "Invalid rescue status"
            });
        }

        const rescue = await Rescue.findByIdAndUpdate(
            rescueId,
            { status: status },
            { new: true, runValidators: true }
        );

        if (!rescue) {
            return res.status(404).json({
                message: "Rescue report not found"
            });
        }

        res.json({
            message: "Rescue status updated successfully!",
            status: rescue.status
        });

    } catch (error) {
        res.status(500).json({
            message: "Unable to update rescue status"
        });
    }
});

/* Contact Us Database Model */

const contactSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        trim: true
    },
    subject: {
        type: String,
        required: true,
        trim: true
    },
    message: {
        type: String,
        required: true,
        trim: true
    },
    status: {
        type: String,
        default: "New"
    }
}, { timestamps: true });

const Contact = mongoose.model("Contact", contactSchema);

/* Save Contact Us Messages */

app.post("/api/contacts", async (req, res) => {
    try {
        const { name, email, subject, message } = req.body;

        if (
            typeof name !== "string" ||
            typeof email !== "string" ||
            typeof subject !== "string" ||
            typeof message !== "string" ||
            !name.trim() ||
            !email.trim() ||
            !subject.trim() ||
            !message.trim()
        ) {
            return res.status(400).json({
                message: "Please fill in all fields."
            });
        }

        const contact = new Contact({
            name: name.trim(),
            email: email.trim(),
            subject: subject.trim(),
            message: message.trim()
        });

        await contact.save();

        res.status(201).json({
            message: "Message sent successfully!"
        });

    } catch (error) {
        res.status(500).json({
            message: "Unable to save your message."
        });
    }
});

/* Admin - View Contact Messages */

app.get("/api/admin/contacts", requireAdmin, async (req, res) => {
    try {
        const contacts = await Contact.find()
            .sort({ createdAt: -1 })
            .limit(100);

        res.json({ contacts });

    } catch (error) {
        res.status(500).json({
            message: "Unable to load contact messages"
        });
    }
});

// Connect to MongoDB
mongoose.connect("mongodb://127.0.0.1:27017/pet_adoption")
    .then(() => {
        console.log("MongoDB Connected Successfully!");

        app.listen(PORT, "127.0.0.1", () => {
            console.log(`Server running at http://localhost:${PORT}`);
        });
    })
    .catch(error => {
        console.log("MongoDB Error:", error.message);
    });
