require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const findOrCreate = require("mongoose-findorcreate");
const app = express();

app.use(bodyParser.urlencoded({ extended: true }));
app.set("view engine", "ejs");
app.use(express.static("public"));

app.use(
    session({
        secret: "Our little secret",
        resave: false,
        saveUninitialized: false,
    })
);

app.use(passport.initialize());
app.use(passport.session());

mongoose.connect(process.env.MONGO, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    useCreateIndex: true,
});
const userSchema = new mongoose.Schema({
    username: String,
    password: String,
    googleId:String,
    secrets:[String]
});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

const User = new mongoose.model("User", userSchema);

passport.use(User.createStrategy());

passport.serializeUser(function(user, done) {
    done(null, user.id);
  });
  
  passport.deserializeUser(function(id, done) {
    User.findById(id, function(err, user) {
      done(err, user);
    });
  });

passport.use(
    new GoogleStrategy(
        {
            clientID: process.env.CLIENT_ID,
            clientSecret: process.env.CLIENT_SECRET,
            callbackURL: "http://localhost:3000/auth/google/secrets",
        },
        function (accessToken, refreshToken, profile, cb) {
            // console.log(profile);
            User.findOrCreate({ googleId: profile.id }, function (err, user) {
                return cb(err, user);
            });
        }
    )
);

app.get("/", function (req, res) {
    res.render("home");
});
app.get(
    "/auth/google",
    passport.authenticate("google", { scope: ["email", "profile"] })
);
app.get("/auth/google/secrets", 
  passport.authenticate('google', { failureRedirect: '/login' }),
  function(req, res) {
    // Successful authentication, redirect to secrets page.
    res.redirect('/secrets');
  });

app.get("/login", function (req, res) {
    res.render("login");
});

app.get("/register", function (req, res) {
    res.render("register");
});

app.get("/secrets", function (req, res) {
   User.find({"secrets":{$ne:null}},function(err,foundUsers){
       if(err){
           console.log(err);
       }
       else{
           if(foundUsers){
              res.render("secrets",{usersWithSecrets:foundUsers});
           }
       }
   });
});

app.get("/submit",function(req,res){
    if(req.isAuthenticated()){
        res.render("submit");
    }else{
        res.redirect("/login");
    }
});
app.post("/submit", function (req,res){
    const secretSubmitted = req.body.secret;
    // console.log(req.user.id); //this will give the mongodb id of that user. You can access information of the current user with req.user
     User.findById(req.user.id,function(err,foundUser){
         if(err){
             console.log(err);
         }else{
             if(foundUser){
                 foundUser.secrets.push(secretSubmitted);
                 foundUser.save(function(){
                     res.redirect("/secrets");
                 });
             }
         }
     })
})
app.get("/logout", function (req, res) {
    req.logout();
    res.redirect("/");
});
app.post("/register", function (req, res) {
    User.register(
        { username: req.body.username },
        req.body.password,
        function (err, user) {
            if (err) {
                console.log(err);
                res.redirect("/register");
            } else {
                passport.authenticate("local")(req, res, function () {
                    res.redirect("/secrets");
                });
            }
        }
    );
});
app.post("/login", function (req, res) {
    const loginUser = new User({
        username: req.body.username,
        password: req.body.password,
    });
    req.login(loginUser, function (err) {
        if (err) {
            console.log(err);
            res.redirect("/register");
        } else {
            passport.authenticate("local", {
                successRedirect: "/secrets",
                failureRedirect: "/login",
            })(req, res);
        }
    });
});

app.listen(3000, function (req, res) {
    console.log("Server is running on port 3000");
});
