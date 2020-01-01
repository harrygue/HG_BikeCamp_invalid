const express = require("express");
const router = express.Router({mergeParams:true});
const passport = require("passport");
const Biketrail = require("../models/biketrail");
const Image = require("../models/image");
const middleware = require("../middleware");

// File upload configuration
var multer = require('multer');
var storage = multer.diskStorage({
    filename: function(req,file,callback){
        callback(null,Date.now() + file.originalname);
    }
});
var imageFilter = function(req,file,cb){
    // accept image files only
    if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/i)){
        return cb(new Error('Only image files are allowed!'),false);
    }  
    cb(null, true)
};
var upload = multer({ storage: storage, fileFilter: imageFilter});

// CLOUDINARY CONFIG
var cloudinary = require('cloudinary');
cloudinary.config({
    cloud_name: 'dlxmy2ytu',
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

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
router.post("/",middleware.checkBiketrailOwnership,upload.single('image'),(req,res) => {
    cloudinary.uploader.upload(req.file.path, (result) => {
        req.body.image.image = result.secure_url;
        req.body.image.image_id = result.public_id;
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
});

// Destroy Image
router.delete("/:image_id",middleware.checkBiketrailOwnership,(req,res) => {
    console.log("hit delete route");

    Image.findByIdAndDelete(req.params.image_id,(err,image) => {
        if(err){
            req.flash("error",err.message);
            return res.redirect('back');
        }
        console.log("image_id: ",image.image_id); 
        cloudinary.v2.uploader.destroy(image.image_id, (err,result) => {
            if(err){
                req.flash("error",err.message);
                return res.redirect('back');
            }
            req.flash("success","Image deleted!");
            return res.redirect("back");
        });
    });
});

module.exports = router;