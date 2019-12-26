const express = require("express");
const router = express.Router();
const passport = require("passport");
const User = require("../models/user");

// Root Route
// Landing page
router.get("/",(req,res) => {
    // res.send("LANDING pAGE IN WORK");
    res.render("landing");
});

// -------AUTHENICATION ROUTES ---------------
// SHOW REGISTER FORM
router.get("/register",function(req,res){
    res.render("register");
});

router.post("/register",function(req,res){
    User.register(new User({username: req.body.username}), req.body.password, function(err,user){
        if(err){
            console.log("Hoppla \n", err);
            req.flash("error",err.message);
            return res.render("register");
        }
        passport.authenticate("local")(req,res,function(){
            req.flash("success","Hello " + user.username + " Welcome to cool Biketrails");
            res.redirect("biketrails");
        });
    });
});

// lOGIN ROUTES
router.get("/login",function(req,res){
    res.render("login");
});

// passport.authenicate is called middleware,i.e runs immediately after submitting post request
// but before callback
router.post("/login",passport.authenticate("local",{
    successRedirect: "/biketrails",
    failureRedirect: "/login"
}),function(req,res){   
    req.flash("success","Successful login for user:" + currentUser.username);
});

// LOGOUT ROUTES
router.get("/logout",function(req,res){
    req.logout();
    req.flash("success","Logged you out !!!");
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

module.exports = router;