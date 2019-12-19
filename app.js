const express = require("express");
const app = express();
const request = require('request');
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const Biketrail = require("./models/biketrail");
const Comment = require("./models/comment");
const Image = require("./models/image");
const seedDB = require("./seed");
const User = require("./models/user");
const passport = require("passport");
var LocalStrategy = require("passport-local");
var passportLocalMongoose = require("passport-local-mongoose");

// connect do DB
mongoose.connect("mongodb://localhost/bike_camp",{useNewUrlParser:true,useUnifiedTopology: true});

app.use(bodyParser.urlencoded({extended:true}))
app.set("view engine","ejs");
app.use(express.static(__dirname + "/public"));

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
    next();
});

// seed Database
console.log("seedDB not active");
// seedDB();

// -------------------------------------------------------------
// ------------ROUTES -----------------------------------------
// ------------------------------------------------------------

// Landing page
app.get("/",(req,res) => {
    // res.send("LANDING pAGE IN WORK");
    res.render("landing");
});

// Index page
app.get("/biketrails",(req,res) => {
    // res.render("biketrails",{biketrails:biketrails})
    // get biketrails from db
    // Biketrail.find({},(err,allBiketrails) => {
    // need to populate images like below if related model in table
    Biketrail.find({}).populate("images").exec((err,allBiketrails) => {
        if(err){
            console.log(err);
        } else {
            res.render("biketrails/index",{biketrails:allBiketrails});
        }
    });
});

app.post("/biketrails",isLoggedIn,(req,res) => {
    let newBiketrail = {
        name:req.body.name,
        description:req.body.description,
        // images:[req.body.url1,req.body.url2]
    }
    // create new biketrail and save to db
    Biketrail.create(newBiketrail,(err,newlyCreated) => {
        if(err){
            console.log(err);
        } else {
            console.log(newlyCreated);
            res.redirect("/biketrails");
        }
    });
});

// show new biketrail form
app.get("/biketrails/new",isLoggedIn,(req,res) => {
    res.render("biketrails/new");
});

// Show selected Biketrail
app.get("/biketrails/:id",(req,res) => {
    Biketrail.findById(req.params.id).populate("comments").populate("images").exec((err,foundBiketrail) => {
        if(err){
            console.log("Error at show: ",err);
        } else {
            res.render("biketrails/show",{biketrail:foundBiketrail});
        }
    });
});

// Comments - New Form

app.get("/biketrails/:id/comments/new",isLoggedIn,(req,res) => {
    Biketrail.findById(req.params.id,(err,biketrail) => {
        if(err){
            console.log("Error at new comments:",err);
        } else {
            res.render("comments/new",{biketrail:biketrail});
        }
    });
});

app.post("/biketrails/:id/comments",isLoggedIn,(req,res) => {
    let newComment = req.body.comment;
    Biketrail.findById(req.params.id,(err,foundBiketrail) => {
        if(err){
            console.log("Error at post new comment route in find biketrail: ",err);
            res.redirect("biketrails");
        } else {
            Comment.create(newComment,(err,comment) => {
                if(err){
                    console.log("Error in post route Biketrail Comment at create comment: ",err);
                    res.redirect("/biketrails");
                } else {
                    foundBiketrail.comments.push(comment);
                    foundBiketrail.save();
                    console.log("created new comment for biketrail: \n",foundBiketrail.name);
                    res.redirect("/biketrails/" + req.params.id);
                }

            });
        }
    });
});

// Image - New Form
app.get("/biketrails/:id/images/new",isLoggedIn,(req,res) => {
    Biketrail.findById(req.params.id,(err,biketrail) => {
        if(err){
            console.log("Error in Image new Form - find Biketrail",err);
            res.redirect("/biketrails");
        } else {
            res.render("images/new",{biketrail:biketrail});
        }
    })
});

// Image - create
app.post("/biketrails/:id/images",isLoggedIn,(req,res) => {
    let newImage = req.body.image;
    console.log("newImage: ",newImage);
    Biketrail.findById(req.params.id,(err,foundBiketrail) => {
        if(err){
            console.log("Error at creating new image, find Biketrail: ",err);
            res.redirect("/biketrails");
        } else {
            Image.create(newImage,(err,image) => {
                if(err){
                    console.log("Error at creating image: ",err);
                    res.redirect("/biketrails");
                } else {
                    foundBiketrail.images.push(image);
                    foundBiketrail.save();
                    console.log("created new image for Biketrail ",foundBiketrail.name);
                    res.redirect("/biketrails/"+req.params.id);
                }
            }); 
        }
    });
});

// -------AUTHENICATION ROUTES ---------------
// SHOW REGISTER FORM
app.get("/register",function(req,res){
    res.render("register");
});

app.post("/register",function(req,res){
    User.register(new User({username: req.body.username}), req.body.password, function(err,user){
        if(err){
            console.log("Hoppla \n", err);
            return res.render("register");
        }
        passport.authenticate("local")(req,res,function(){
            res.redirect("biketrails");
        });
    });
});

// lOGIN ROUTES
app.get("/login",function(req,res){
    res.render("login");
});

// passport.authenicate is called middleware,i.e runs immediately after submitting post request
// but before callback
app.post("/login",passport.authenticate("local",{
    successRedirect: "/biketrails",
    failureRedirect: "/login"
}),function(req,res){   
    // empty
});

// LOGOUT ROUTES
app.get("/logout",function(req,res){
    req.logout();
    res.redirect("/biketrails");
});

// middleware to test if user is logged in otherwise he can go to secret page via search line
function isLoggedIn(req,res,next){
    console.log("isLoggedIn called!");
    if(req.isAuthenticated()){
        console.log("user " + req.body.username + " is authenicated!")
        return next();
    }
    res.redirect("/login");
}

app.listen(3000,() => console.log("Server listen on port 3000"));