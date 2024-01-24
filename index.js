import express from "express";
import bodyParser from "body-parser";
import { Sequelize, DataTypes } from "sequelize";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";

const app = express();
const port = 3001;
const secretKey = "sriram-secret-key@123";

const sequelize = new Sequelize("database", "username", "password", {
    host: "localhost",
    dialect: "sqlite",
    storage: "database.sqlite",
});

const User = sequelize.define("User", {
    name: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    phoneNumber: {
        type: DataTypes.INTEGER,
        allowNull: false,
        unique: true,
    },
    email: {
        type: DataTypes.STRING,
    },
    password: {
        type: DataTypes.STRING,
        allowNull: false,
    },
});


const Spam = sequelize.define("Spam", {
    phoneNumber: {
        type: DataTypes.INTEGER,
        allowNull: false,
        unique: true,
    },
    spamReports: {
        type: DataTypes.INTEGER,
    },
});


const Contact = sequelize.define("Contact", {
    userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    contactPhoneNumber: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
});


User.hasMany(Contact, { foreignKey: "userId" });
Contact.belongsTo(User, { foreignKey: "userId" });


app.use(bodyParser.json());


app.post("/register", async (req, res) => {
    try {
        const { name, phoneNumber, email, password } = req.body;


        const existingUser = await User.findOne({
            where: {
                phoneNumber: phoneNumber,
            },
        });

        if (existingUser) {
            return res.status(400).json({ error: "Phone number already registered" });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const user = await User.create({
            name,
            phoneNumber,
            email,
            password: hashedPassword,
        });

        const token = jwt.sign({ userId: user.id }, secretKey, { expiresIn: "1h" });

        res.json({ user, token });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});


app.post("/login", async (req, res) => {
    try {
        const { phoneNumber, password } = req.body;


        const user = await User.findOne({
            where: {
                phoneNumber: phoneNumber,
            },
        });

        console.log("user found", user);

        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }


        const passwordMatch = await bcrypt.compare(password, user.password);

        if (!passwordMatch) {
            return res.status(401).json({ error: "Invalid credentials" });
        }


        const token = jwt.sign({ userId: user.id }, secretKey, { expiresIn: "1h" });

        res.json({ user, token });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

app.post("/mark-spam", async (req, res) => {
    try {
        const { phoneNumber } = req.body;
        const spam = await Spam.findOne({ where: { phoneNumber: phoneNumber } });
        if (!spam) {
            const spam = await Spam.create({ phoneNumber, spamReports: 1 });
            res.json(spam);
        }
        else {
            await spam.increment('spamReports');
            await spam.reload();
            res.json(spam);
        }




    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

app.get("/get-spam", async (req, res) => {
    try {
        const spam = await Spam.findAll();
        res.json(spam);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

app.get("/is-spam", async (req, res) => {
    try {
        const { phoneNumber } = req.body
        const spam = await Spam.findOne({ where: { phoneNumber: phoneNumber } });
        if (spam) res.json(spam);
        else { res.sendStatus(404); }
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Internal Server Error" });

    }
})


app.get("/search/name/:query", async (req, res) => {
    try {
        const query = req.params.query;
        const results = await User.findAll({
            where: {
                name: {
                    [Sequelize.Op.or]: [
                        { [Sequelize.Op.startsWith]: query },
                        { [Sequelize.Op.substring]: query },
                    ],
                },
            },
        });
        res.json(results);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});


app.get("/search/phone/:phoneNumber", async (req, res) => {
    try {
        const phoneNumber = req.params.phoneNumber;
        const results = await User.findAll({
            where: {
                phoneNumber: phoneNumber,
            },
            include: Contact,
        });
        res.json(results);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

app.get("/users", async (req, res) => {
    try {
        const users = await User.findAll();
        res.json(users);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

sequelize.sync().then(() => {
    app.listen(port, () => {
        console.log(`Server is running on http://localhost:${port}`);
    });
});
