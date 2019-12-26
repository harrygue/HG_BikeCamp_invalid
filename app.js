const express = require("express");
const app = express();
const request = require('request');
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const methodOverride = require("method-override");
const Biketrail = require("./models/biketrail");
const Comment = require("./models/comment");
const Image = require("./models/image");
const seedDB = require("./seed");
const User = require("./models/user");
const passport = require("passport");
const LocalStrategy = require("passport-local");
const passportLocalMongoose = require("passport-local-mongoose");
const flash = require("connect-flash");

// connect do DB
const connectionString = process.env.DATABASEURL;
// mongoose.connect("mongodb://localhost/bike_camp",{useNewUrlParser:true,useUnifiedTopology: true});
mongoose.connect(connectionString || "mongodb://localhost/bike_camp",{
    useNewUrlParser: true, 
    useUnifiedTopology: true,
    useCreateIndex:true}).then(() => {
        console.log("connected to DB!");
    }).catch(err => {
        console.log("ERROR:",err.message);
    });

app.use(bodyParser.urlencoded({extended:true}))
app.set("view engine","ejs");
app.use(express.static(__dirname + "/public"));
app.use(methodOverride("_method"));
app.use(flash());

const biketrailRoutes = require("./routes/biketrails");
const commentRoutes = require("./routes/comments");
const imageRoutes = require("./routes/images");
const indexRoutes = require("./routes/index");
      

// ------PASSPORT CONFIGURATION ---------

app.use(require("express-session")({
    secret:"MySecret!!!",
    resave: false,
    saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

// middleware in order to pass current user to every ejs page
// need to be placed after all passport ingestions
app.use(function(req,res,next){
    res.locals.currentUser = req.user;
    res.locals.error = req.flash("error");
    res.locals.success = req.flash("success");
    next();
});

// seed Database
console.log("seedDB not active");
// seedDB();

app.use("/biketrails",biketrailRoutes);
app.use("/biketrails/:id/comments",commentRoutes);
app.use("/biketrails/:id/images",imageRoutes);
app.use("/",indexRoutes);

app.listen(3000,() => console.log("Server listen on port 3000"));