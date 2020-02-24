const express = require("express");
const path = require('path');
const router = express.Router();
const passport = require("passport");
const Biketrail = require("../models/biketrail");
const Comment = require("../models/comment");
const Image = require("../models/image");
const middleware = require("../middleware/index");
// const moment = require("moment");
// const helper = require("../public/helperFunctions"); // added to app.locals
const fsExtra = require("fs-extra");
const fs = require("fs");
const parseString = require("xml2js").parseString;
const haversine = require('haversine-distance');
const DOMParser = require('xmldom').DOMParser;
const togeojson = require("@mapbox/togeojson");

var NodeGeocoder = require('node-geocoder');
 
var options = {
  provider: 'google',
  httpAdapter: 'https',
  apiKey: process.env.GEOCODER_API_KEY,
  formatter: null
};
 
var geocoder = NodeGeocoder(options);

// File upload configuration
var multer = require('multer');
var storage = multer.diskStorage({
    filename: function(req,file,callback){
        callback(null,Date.now() + file.originalname);
    }
});
var kmlFilter = function(req,file,cb){
    // accept kml files only
    if (!file.originalname.match(/\.(kml)$/i)){
        return cb(new Error('Only .kml files are allowed!'),false);
    }  
    cb(null, true)
};
var upload = multer({ storage: storage, kmlFilter: kmlFilter});

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
// upload.single('kml') must correspond to html attribute name = 'kml'
//router.post("/",middleware.isLoggedIn,upload.single('kml'),(req,res) => {
//    // upload kml tracks 
//     cloudinary.v2.uploader.upload(req.file.path, { resource_type: "auto" },(error, result) => {
//        if(error){
//            console.log(error.message);
//            res.redirect("/biketrails");
//        } else {
//            req.body.biketrail.kml_url = result.secure_url;
//            req.body.biketrail.kml_id = result.public_id;
//            req.body.biketrail.author = {id:req.user._id,userName:req.user.username};
//            console.log(req.file.path);
//            console.log(result);
//            console.log("upload kml-track: " + result.secure_url + " " + result.public_id);
//            
//            let newBiketrail = req.body.biketrail;
//            console.log("Location: ",req.body.location);
//            geocoder.geocode(req.body.location,(err,data) => {
//                if(err || !data.length){
//                    console.log("Error in create Biketrail: ",err.message);
//                    req.flash("error","Invalid address!");
//                    return res.redirect("back");
//                }
//                newBiketrail.lat = data[0].latitude;
//                newBiketrail.lng = data[0].longitude;
//                newBiketrail.location = data[0].formattedAddress;
//                
//                // create new biketrail and save to db
//                Biketrail.create(newBiketrail,(err,newlyCreated) => {
//                    if(err){
//                        console.log(err);
//                    } else {
//                        console.log(newlyCreated);
//                        req.flash("success","Successfully created new biketrail: " + newBiketrail.name);
//                        res.redirect("/biketrails");
//                    }
//                });
//            });
//        }
//    });
//});

// NEW biketrail form
router.get("/new",middleware.isLoggedIn,(req,res) => {
    res.render("biketrails/new");
});

// SHOW Biketrail form
router.get("/:id",(req,res) => {
    let user_id = undefined;

    Biketrail.findById(req.params.id).populate("comments").populate("images").exec((err,foundBiketrail) => {
        if(err){
            req.flash("error",err.message);
             console.log("Error at show route: ",err.message);
        } else {
            // console.log("Inside Show Route: ",foundBiketrail);
            if(req.isAuthenticated()){
                console.log("is Authenticated !");
                // res.render("biketrails/show",{biketrail:foundBiketrail,user_id:req.user._id});
                user_id = req.user._id;
            }

            // get GPX file:
            if(foundBiketrail.gpxFile){
                let file = foundBiketrail.gpxFile;// result.finalFile.file; //buff.toString('ascii');
                let fileName = foundBiketrail.gpxFileName;
                let filestr = file.toString('utf-8');
                
                var gpxFile = new DOMParser().parseFromString(file);    // resultFile.file);
                var geoJSONgpx = togeojson.gpx(gpxFile);
    
                parseString(filestr,(error,result) => {
                    if(error){
                        console.log("Error when parsing xml string",error.message);
                    }
                    //console.log(result);
                    let json = JSON.stringify(result,null,4);
                    let jsonObj = result;
                        
                    let elevations = [];
                    let coordinates = [];
                    let coordinatesDict = [];
                    let distances = [];
    
                    trkPts = jsonObj.gpx.trk[0].trkseg[0].trkpt;
                    let latavg = 0;
                    let lngavg = 0;
                    trkPts.forEach((tp) => {
                        elevations.push(tp.ele[0]);
                        coordinates.push([tp.$.lat,tp.$.lon]);
                        coordinatesDict.push(tp.$);
                        // calculate sum of latitude and longitude
                        latavg += tp.$.lat;
                        lngavg += tp.$.lon;
                    });
                    latavg = latavg/coordinatesDict.length;
                    lngavg = lngavg/coordinatesDict.length;

                    // calculate average of latitude and longitude
                    positionAvg = {lat: latavg,lng: lngavg};
                    // console.log(positionAvg);

                    // Calculate Distances:
                    for (var i=1;i<coordinatesDict.length;i++){
                        var a = coordinatesDict[i];
                        var b = coordinatesDict[i-1];
                        distances.push(haversine(a,b));
                    }
        
                    let sumDist = [distances[0]/1000];
                    for (var i=0;i<distances.length;i++){
                        sumDist.push(sumDist[i]+distances[i]/1000);
                    }
        
                    // console.log(sumDist);
                    let totalDist = 0;
                    distances.map((dist) => {
                        totalDist+=dist;
                    });
                    // console.log(totalDist);
                    let negAlt = 0;
                    let posAlt = 0;
                    for(var i=1;i<elevations.length;i++){
                        let alt = elevations[i]-elevations[i-1];
                        if (alt>0){
                            posAlt+=alt;
                        } else {
                            negAlt+=alt;
                        }
                    }
                    let alt = {pos:posAlt.toFixed(0),neg:negAlt.toFixed(0)};
                    let totalDistRound = totalDist.toFixed(1);
                    res.render("biketrails/show",{biketrail:foundBiketrail,user_id:user_id, sumDist:sumDist, totalDist:totalDistRound, alt:alt,positionAvg:positionAvg,jsonObj:jsonObj, geoJSONgpx:geoJSONgpx,file:fileName});
                });
            } else {
                let alt = {pos:"unkown",neg:"unkown"};
                res.render("biketrails/show",{biketrail:foundBiketrail,user_id:user_id, sumDist:"unkown", totalDist:"unkown", alt:alt,positionAvg:null,jsonObj:null, geoJSONgpx:null,file:"unkown"});
            }
            
        
            // res.render("biketrails/show",{biketrail:foundBiketrail,user_id:user_id});
        }
    });
});

// Edit Biketrail
router.get("/:id/edit",middleware.checkBiketrailOwnership,(req,res) => {
    console.log("hit edit route");
    Biketrail.findById(req.params.id,(err,foundBiketrail) => {
        // console.log("found Biketrail: ",foundBiketrail);
        res.render("biketrails/edit",{biketrail:foundBiketrail});
    });
})

// UPATE BIKETRAIL  
//router.put("/:id",middleware.checkBiketrailOwnership,upload.single('kml'),(req,res) => {
//    
//    // let updatedBiketrail = req.body.biketrail;
//    console.log(req.body.biketrail);
//    geocoder.geocode(req.body.location,(err,data) => {
//        if(err || !data.length){
//            req.flash("error","Invalid address!");
//            return res.redirect("back");
//        }
//        req.body.biketrail.lat = data[0].latitude;
//        req.body.biketrail.lng = data[0].longitude;
//        req.body.biketrail.location = data[0].formattedAddress;
//
//        if(req.file){
//            Biketrail.findById(req.params.id,(err,biketrail) => {
//                if(err){
//                    console.log("error in biketrail update: ",err.message);
//                    res.flash("error",err.message);
//                    return res.redirect('back');
//                } 
//                // if(!biketrail.kml_id){
//                //     biketrail.kml_id = path.basename(biketrail.kml_url).split(".")[0];
//                //     console.log("kml_id: ",biketrail.kml_id);
//                // }
//                if(!biketrail.kml_url || biketrail.kml_url === null){
//                    console.log('kml file does not exist!');
//                    cloudinary.v2.uploader.upload(req.file.path, { resource_type: "auto" },(error,result) => {
//                        if(error){
//                            req.flash("error",err.message);
//                            return res.redirect('/biketrails');
//                        }
//                        req.body.biketrail.kml_url = result.secure_url;
//                        req.body.biketrail.kml_id = result.public_id;
//                        console.log(result.secure_url);
//                        console.log(req.file.path);
//                        Biketrail.findByIdAndUpdate(req.params.id,req.body.biketrail,(err,biketrail) => {
//                            if(err){
//                                req.flash("error",err.message);
//                                return res.redirect('/biketrails');
//                            }
//                            console.log("Biketrail updated ",req.params.id);
//                            req.flash("success","Successfully updated Biketrail " + biketrail.name);
//                            return res.redirect("/biketrails/"+biketrail.id);
//                        });
//                    });
//                } else {
//                    console.log('kml file exists!');
//                    cloudinary.v2.uploader.destroy(biketrail.kml_id,{ resource_type: "raw" },(error,result) => {
//                        if(error){
//                            req.flash("error",err.message);
//                            return res.redirect('back');
//                        }
//                        console.log("destroyed: ",biketrail.kml_id);
//                        cloudinary.v2.uploader.upload(req.file.path, { resource_type: "auto" },(error,result) => {
//                            if(err){
//                                req.flash("error",err.message);
//                                return res.redirect('/biketrails');
//                            }
//                            req.body.biketrail.kml_url = result.secure_url;
//                            req.body.biketrail.kml_id = result.public_id;
//                            console.log(result.secure_url);
//                            console.log(req.file.path);
//                            Biketrail.findByIdAndUpdate(req.params.id,req.body.biketrail,(err,biketrail) => {
//                                if(err){
//                                    req.flash("error",err.message);
//                                    return res.redirect('/biketrails');
//                                }
//                                console.log("Biketrail updated ",req.params.id);
//                                req.flash("success","Successfully updated Biketrail " + biketrail.name);
//                                return res.redirect("/biketrails/"+biketrail.id);
//                            });
//                        });
//                    });
//                }
//            });
//        } else {
//            Biketrail.findByIdAndUpdate(req.params.id,req.body.biketrail,(err,biketrail) => {
//                if(err){
//                    console.log("Error in edit Biketrail: ",err);
//                    req.flash("error",err.message);
//                    res.redirect("/biketrails");
//                } else {
//                    console.log(`req.body.id: ${req.body.id}, req.params.id: ${req.params.id}`);
//                    req.flash("success","Successfully updated biketrail: " +req.body.biketrail.name);
//                    res.redirect("/biketrails/"+req.params.id);
//                }
//            });
//        }
//    });
//});

//// Destroy Biketrail
//router.delete("/:id",middleware.checkBiketrailOwnership,(req,res) => {
//    // res.send("hit delete route");
//    Biketrail.findByIdAndDelete(req.params.id,(err,biketrail) => {
//        if(err){
//            console.log("Error in delete Biketrail: ",err);
//            req.flash("error",err.message);
//            res.redirect("/biketrails");
//        } else {
//            const _id = req.params.id;
//            console.log("Biketrail_id: ", req.params.id);
//            console.log("_id: ",_id);
//            
//            Comment.deleteMany({_id: { $in: biketrail.comments}}, (err) =>{
//                if(err){
//                    console.log("Error in Comment.deleteMany: ",err);
//                    req.flash("error",err.message);
//                    res.redirect("/biketrails");
//                } else {
//                    console.log("Biketrail comments deleted!");
//                    
//                    if(biketrail.kml_url){
//                        cloudinary.v2.uploader.destroy(biketrail.kml_id,{ resource_type: "raw" },(error) =>{
//                            if(error){
//                                console.log("error when deleting kml",error.message);
//                                req.flash("error",error.message);
//                                return res.redirect("/back");
//                            }
//                            console.log("kml track successfully deleted");
//
//                            // loop through images and if last one has been deleted redirect
//                            let i=0;
//                            const len = biketrail.images.length;
//                            console.log("number of images: ",len);
//                            if(len ===0){
//                                console.log("all images deleted!");
//                                req.flash("success","all images deleted!");
//                                return res.redirect("/biketrails");
//                            } 
//                            biketrail.images.map((image) => {
//                                console.log("image inside biketrail delete: ",image);
//                                Image.findByIdAndDelete(image,(err,foundImage) => {
//                                    if(err){
//                                        req.flash("error",err.message);
//                                        return res.redirect("/biketrails");
//                                    }
//                                    cloudinary.v2.uploader.destroy(foundImage.image_id,(err,result) =>{
//                                        if(err){
//                                            req.flash("error",err.message);
//                                            return res.redirect("/biketrails");
//                                        }
//                                        console.log("image" + foundImage.image_id + "deleted");
//                                        i++;
//                                        console.log(i);
//                                        if(i===len){
//                                            console.log("all images deleted!");
//                                            req.flash("success","all images deleted!");
//                                            return res.redirect('/biketrails');
//                                        }
//                                    });
//                                });
//                            });
//                        });
//                    } else {
//                        // loop through images and if last one has been deleted redirect
//                        let i=0;
//                        const len = biketrail.images.length;
//                        console.log("number of images: ",len);
//                        if(len ===0){
//                            console.log("all images deleted!");
//                            req.flash("success","all images deleted!");
//                            return res.redirect("/biketrails");
//                        } 
//                        biketrail.images.map((image) => {
//                            console.log("image inside biketrail delete: ",image);
//                            Image.findByIdAndDelete(image,(err,foundImage) => {
//                                if(err){
//                                    req.flash("error",err.message);
//                                    return res.redirect("/biketrails");
//                                }
//                                cloudinary.v2.uploader.destroy(foundImage.image_id,(err,result) =>{
//                                    if(err){
//                                        req.flash("error",err.message);
//                                        return res.redirect("/biketrails");
//                                    }
//                                    console.log("image" + foundImage.image_id + "deleted");
//                                    i++;
//                                    console.log(i);
//                                    if(i===len){
//                                        console.log("all images deleted!");
//                                        req.flash("success","all images deleted!");
//                                        return res.redirect('/biketrails');
//                                    }
//                                });
//                            });
//                        });
//                    }
//                }
//            });
//        }
//    });
//});

// -------------------------------------------------------------------------
// UPLOAD GPX TRACKS
router.post("/",middleware.isLoggedIn,upload.single('gpx'),(req,res) => {
    // upload gpx tracks 
    const file = fsExtra.readFileSync(req.file.path,'utf-8'); 
    req.body.biketrail.gpxFile = file;
    req.body.biketrail.gpxFileName = req.file.path;
    req.body.biketrail.author = {id:req.user._id,userName:req.user.username};
    // console.log("GPX File: ",req.file.path);
        
    let newBiketrail = req.body.biketrail;
    // console.log("Location: ",req.body.location);
    geocoder.geocode(req.body.location,(err,data) => {
        if(err || !data.length){
            console.log("Error in create Biketrail: ",err.message);
            req.flash("error","Invalid address!");
            return res.redirect("back");
        }
        newBiketrail.lat = data[0].latitude;
        newBiketrail.lng = data[0].longitude;
        newBiketrail.location = data[0].formattedAddress;
        
        // create new biketrail and save to db
        Biketrail.create(newBiketrail,(err,newlyCreated) => {
            if(err){
                console.log(err);
            } else {
                // console.log(newlyCreated);
                req.flash("success","Successfully created new biketrail: " + newBiketrail.name);
                res.redirect("/biketrails");
            }
        });
    });
});

// UPATE BIKETRAIL  with GPX files
router.put("/:id",middleware.checkBiketrailOwnership,upload.single('gpx'),(req,res) => {
    if(req.file){
        const file = fsExtra.readFileSync(req.file.path,'utf-8'); 
        req.body.biketrail.gpxFile = file;
        req.body.biketrail.gpxFileName = req.file.path;
    }

    // console.log(req.body.biketrail);
    geocoder.geocode(req.body.location,(err,data) => {
        if(err || !data.length){
            req.flash("error","Invalid address!");
            return res.redirect("back");
        }
        req.body.biketrail.lat = data[0].latitude;
        req.body.biketrail.lng = data[0].longitude;
        req.body.biketrail.location = data[0].formattedAddress;

        Biketrail.findByIdAndUpdate(req.params.id,req.body.biketrail,(err,biketrail) => {
            if(err){
                console.log("Error in edit Biketrail: ",err);
                req.flash("error",err.message);
                res.redirect("/biketrails");
            } else {
                // console.log(`req.body.id: ${req.body.id}, req.params.id: ${req.params.id}`);
                req.flash("success","Successfully updated biketrail: " +req.body.biketrail.name);
                res.redirect("/biketrails/"+req.params.id);
            }
        });

    });
});

// Destroy Biketrail with GPX files
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
                    if(len ===0){
                        console.log("there were no images!");
                        req.flash("success","all images deleted!");
                        return res.redirect("/biketrails");
                    } 
                    biketrail.images.map((image) => {
                        console.log("image inside biketrail delete: ",image);
                        Image.findById(image,(err,foundImage) => {
                            if(err){
                                req.flash("error",err.message);
                                return res.redirect("/biketrails");
                            }
                            if(foundImage && foundImage != null){
                                cloudinary.v2.uploader.destroy(foundImage.image_id,(err,result) =>{
                                    if(err){
                                        req.flash("error",err.message);
                                        return res.redirect("/biketrails");
                                    }
                                    console.log("image" + foundImage.image_id + "deleted in cloudinary");
                                });
                            }
                        });
                        i++;
                        console.log(i);
                        if(i===len){
                            Image.deleteMany({_id: { $in: biketrail.images}}, err => {
                                if(err){
                                    console.log("Error in image delete many: ",err.message);
                                    req.flash("error",err.massage);
                                    return res.redirect("/biketrails");
                                }
                                console.log("Image.deleteMany - all images deleted!");
                            });
                            console.log("all images deleted!");
                            req.flash("success","all images deleted!");
                            return res.redirect('/biketrails');
                        }
                    });
                }
            });
        }
    });
});

module.exports = router;