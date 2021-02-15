require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const app = express();
const mongoose = require("mongoose");
// const encrypt = require("mongoose-encryption"); FOR ENCRYPTING PASSWORD BUT WE ARE NOT USING IT 
const md5 = require("md5");


mongoose.connect(process.env.MONGO, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
});
const userSchema = new mongoose.Schema({
    email: String,
    password: String,
});

// userSchema.plugin(encrypt, {
//     secret: process.env.SECRET,
//     encryptedFields: ["password"],
// });

const User = new mongoose.model("User", userSchema);
app.use(bodyParser.urlencoded({ extended: true }));
app.set("view engine", "ejs");
app.use(express.static("public"));

app.get("/", function (req, res) {
    res.render("home");
});

app.get("/login", function (req, res) {
    res.render("login");
});

app.get("/register", function (req, res) {
    res.render("register");
});

app.post("/register", function (req, res) {
    const newuser = new User({
        email: req.body.username,
        password: md5(req.body.password),
    });
    newuser.save(function (err) {
        if (err) {
            console.log(err);
        } else {
            res.render("secrets");
        }
    });
});
app.post("/login", function (req, res) {
    const username = req.body.username;
    const password = md5(req.body.password);
    User.findOne({ email: username }, function (err, foundUser) {
        if (err) {
            console.log(err);
        } else {
            if (foundUser) {
                if (foundUser.password === password) res.render("secrets");
                else res.send("Wrong password");
            } else {
                res.send("No such user exist");
            }
        }
    });
});

app.listen(3000, function (req, res) {
    console.log("Server is running on port 3000");
});
