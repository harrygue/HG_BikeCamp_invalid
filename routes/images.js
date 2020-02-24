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
            // console.log("immage/new - route: ",biketrail);
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
                        // console.log("created new image for Biketrail ",foundBiketrail.name);
                        req.flash("success","Image added");
                        res.redirect("/biketrails/"+req.params.id);
                    }
                }); 
            }
        });
    });
});
// Show Images
router.get("/",middleware.checkBiketrailOwnership,(req,res) => {
    console.log("hit Show images route");
    // don't forget populate("images").exec otherwise pictures are not displayed in ejs view !!!
    Biketrail.findById(req.params.id).populate("images").exec((err,foundBiketrail) => {
        // console.log("found Biketrail: ",foundBiketrail);
        if(err){
            console.log("Error",err.message);
            req.flash("error",err.message);
        }
        if(req.isAuthenticated()){
            console.log("is Authenticated !");
            user_id = req.user._id;
        }
        return res.render("images/image_show",{biketrail:foundBiketrail, user_id:user_id});
    });
});

// Edit Images - not used for the moment
router.get("/:image_id/edit",middleware.checkBiketrailOwnership,(req,res) => {
    console.log("hit images/edit route!!!");
    console.log("Edit images - req.params.id: ",req.params.id);
    console.log("Edit images - req.params.image_id: ",req.params.image_id);
    Image.findById(req.params.image_id,(err,image) => {
        if(err){
            console.log("Error in edit image route",err);
            req.flash("error",err.message);
            res.redirect("/biketrails");
        }
        console.log("load image edit form");
        console.log("update image: ",image);
        res.render("images/edit",{image:image, biketrail_id:req.params.id});
    });
});

// Update image location
router.put("/:image_id",middleware.checkBiketrailOwnership,(req,res) => {
    console.log("hit update route");
    let updatedImage = req.body.image;
    Image.findByIdAndUpdate(req.params.image_id,updatedImage,(err,image) => {
        if(err){
            console.log("Error in update image: ",err);
            req.flash("error",err);
            res.redirect("/biketrails");
        }
        console.log("Image Title updated");
        console.log(req.body.image);
        console.log(req.params.image_id);
        req.flash("success","successfully updated Image Title!");
        res.redirect("/biketrails/"+req.params.id);
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
        console.log(req.params);
        console.log(`image: ${image}`);
        console.log(`image.image_id: ${image.image_id}, \nreq.params.image_id: ${req.params.image_id} \nreq.params.id: ${req.params.id}`); 
        cloudinary.v2.uploader.destroy(image.image_id, (err,result) => {
            if(err){
                req.flash("error",err.message);
                return res.redirect('back');
            }
            // make sure that req.params.image_id in biketrail image array is deleted

            req.flash("success","Image deleted!");
            return res.redirect("back");
        });
    });
});

module.exports = router;