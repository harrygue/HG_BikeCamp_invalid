const express = require("express");
const router = express.Router();
const passport = require("passport");
const Biketrail = require("../models/biketrail");
const Comment = require("../models/comment");
const Image = require("../models/image");
const middleware = require("../middleware/index");

// CLOUDINARY CONFIG
var cloudinary = require('cloudinary');
cloudinary.config({
    cloud_name: 'dlxmy2ytu',
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// Index page
router.get("/",(req,res) => {
    
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

router.post("/",middleware.isLoggedIn,(req,res) => {
    // let newBiketrail = {
    //     name:req.body.name,
    //     description:req.body.description,
    // }
    let newBiketrail = req.body.biketrail;
    newBiketrail.author = {id:req.user._id,userName:req.user.username};
    // create new biketrail and save to db
    Biketrail.create(newBiketrail,(err,newlyCreated) => {
        if(err){
            console.log(err);
        } else {
            console.log(newlyCreated);
            req.flash("success","Successfully created new biketrail: " + newBiketrail.name);
            res.redirect("/biketrails");
        }
    });
});

// NEW biketrail form
router.get("/new",middleware.isLoggedIn,(req,res) => {
    res.render("biketrails/new");
});

// SHOW Biketrail form
router.get("/:id",(req,res) => {
    Biketrail.findById(req.params.id).populate("comments").populate("images").exec((err,foundBiketrail) => {
        if(err){
            req.flash("error",err.message);
            console.log("Error at show: ",err.message);
        } else {
            console.log(foundBiketrail);
            if(req.isAuthenticated()){
                res.render("biketrails/show",{biketrail:foundBiketrail,user_id:req.user._id});
            }
            res.render("biketrails/show",{biketrail:foundBiketrail,user_id:undefined});
        }
    });
});

// Edit Biketrail
router.get("/:id/edit",middleware.checkBiketrailOwnership,(req,res) => {
    console.log("hit edit route");
    Biketrail.findById(req.params.id,(err,foundBiketrail) => {
        console.log("found Biketrail: ",foundBiketrail);
        res.render("biketrails/edit",{biketrail:foundBiketrail});
    });
})

// UPATE BIKETRAIL  
router.put("/:id",middleware.checkBiketrailOwnership,(req,res) => {
    let updatedBiketrail = req.body.biketrail;
    console.log(updatedBiketrail);
    Biketrail.findByIdAndUpdate(req.params.id,updatedBiketrail,(err,biketrail) => {
        if(err){
            console.log("Error in edit Biketrail: ",err);
            req.flash("error",err.message);
            res.redirect("/biketrails");
        } else {
            console.log(`req.body.id: ${req.body.id}, req.params.id: ${req.params.id}`);
            req.flash("success","Successfully updated biketrail: " +updatedBiketrail.name);
            res.redirect("/biketrails/"+req.params.id);
        }
    });
});

// Destroy Biketrail
router.delete("/:id",middleware.checkBiketrailOwnership,(req,res) => {
    // res.send("hit delete route");
    Biketrail.findByIdAndDelete(req.params.id,(err,biketrail) => {
        if(err){
            console.log("Error in delete Biketrail: ",err);
            req.flash("error",err.message);
            res.redirect("/biketrails");
        } else {
            const _id = req.params.id;
            console.log("Biketrail_id: ", req.params.id);
            console.log("_id: ",_id);

            Comment.deleteMany({_id: { $in: biketrail.comments}}, (err) =>{
                if(err){
                    console.log("Error in Comment.deleteMany: ",err);
                    req.flash("error",err.message);
                    res.redirect("/biketrails");
                } else {
                    console.log("Biketrail comments deleted!");
                    // loop through images and if last one has been deleted redirect
                    let i=0;
                    const len = biketrail.images.length;
                    console.log("number of images: ",len);
                    biketrail.images.map((image) => {
                        console.log("image inside biketrail delete: ",image);
                        Image.findByIdAndDelete(image,(err,foundImage) => {
                            if(err){
                                req.flash("error",err.message);
                                res.redirect("/biketrails");
                            }
                            cloudinary.v2.uploader.destroy(foundImage.image_id,(err,result) =>{
                                if(err){
                                    req.flash("error",err.message);
                                    res.redirect("/biketrails");
                                }
                                console.log("image" + foundImage.image_id + "deleted");
                                i++;
                                console.log(i);
                                if(i===len){
                                    console.log("all images deleted!");
                                    req.flash("success","all images deleted!");
                                    res.redirect('/biketrails');
                                }
                            });
                        });
                    });

                    // Image.deleteMany({_id: { $in: biketrail.images}},(err) =>{
                    //     if(err){
                    //         console.log("Error in Image.deleteMany: ",err);
                    //         req.flash("error",err);
                    //         res.redirect("/biketrails");
                    //     } else {
                    //         console.log("Biketrail images deleted!");
                    //         req.flash("success","Biketrail and all pertaining comments deleted!");
                    //         res.redirect("/biketrails")
                    //     }
                    // });
                }
            });
        }
    });
});

module.exports = router;