const express = require("express");
const router = express.Router({mergeParams:true});
const passport = require("passport");
const Biketrail = require("../models/biketrail");
const Image = require("../models/image");
const middleware = require("../middleware");

// Image - New Form
router.get("/new",middleware.checkBiketrailOwnership,(req,res) => {
    Biketrail.findById(req.params.id,(err,biketrail) => {
        if(err){
            console.log("Error in Image new Form - find Biketrail",err);
            res.redirect("/biketrails");
        } else {
            console.log("immage/new - route: ",biketrail);
            res.render("images/new",{biketrail:biketrail});
        }
    })
});

// Image - create
router.post("/",middleware.checkBiketrailOwnership,(req,res) => {
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
                    req.flash("error","sorry, something went wront, try again or contact system administrator!");
                    res.redirect("/biketrails");
                } else {
                    foundBiketrail.images.push(image);
                    foundBiketrail.save();
                    console.log("created new image for Biketrail ",foundBiketrail.name);
                    req.flash("success","Image added");
                    res.redirect("/biketrails/"+req.params.id);
                }
            }); 
        }
    });
});

// Destroy Image
router.delete("/:image_id",middleware.checkBiketrailOwnership,(req,res) => {
    console.log("hit delete route");
    Image.findByIdAndDelete(req.params.image_id,(err) => {
        if(err){
            console.log("Error in delete image: ",err);
            req.flash("error","something went wrong");
            res.redirect("/biketrails");
        }
        console.log("Image deleted");
        req.flash("success","image deleted!");
        res.redirect("back");
    })
})

module.exports = router;