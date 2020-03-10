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
// var kmlFilter = function(req,file,cb){
//     // accept kml files only
//     if (!file.originalname.match(/\.(kml)$/i)){
//         return cb(new Error('Only .kml files are allowed!'),false);
//     }  
//     cb(null, true)
// };
// var upload = multer({ storage: storage, kmlFilter: kmlFilter});

var gpxFilter = function(req,file,cb){
    // accept gpx files only
    console.log("gpxFilter called");
    const ext = path.extname(file.originalname).toLowerCase();
    console.log("gpxFilter called", ext);
    if (!file.originalname.match(/\.(gpx)$/i)){
        // cb(new Error('Only .gpx files are allowed!'));
        return cb(new Error('Only .gpx files are allowed!'),false);
    }  
    cb(null, true)
};
var gpxUpload = multer({ 
    storage: storage, 
    fileFilter: gpxFilter
});

// CLOUDINARY CONFIG
var cloudinary = require('cloudinary');
cloudinary.config({
    cloud_name: 'dlxmy2ytu',
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// Index page with fuzzy search
router.get("/",async(req,res) => {
    console.log(req.query);
    try {
        if(req.query.search && req.query.search != ""){
            const regex = new RegExp(escapeRegex(req.query.search), 'gi');
            let filteredBiketrails = await Biketrail.find({name:regex}).populate("images").exec();
            res.render("biketrails/index",{biketrails:filteredBiketrails});
        } else {
            let allBiketrails = await Biketrail.find({}).populate("images").exec();
            res.render("biketrails/index",{biketrails:allBiketrails});
        }

    } catch(error) {
        console.log("Error at Index route: ",err.message);
        req.flash("error","ERROR: cannot get biketrails!");
    }
});

// NEW biketrail form
router.get("/new",middleware.isLoggedIn,(req,res) => {
    res.render("biketrails/new");
});

// ASYNC/AWAIT
// SHOW Biketrail form
router.get("/:id",async(req,res) => {
    try {
        let user_id = undefined;
        let foundBiketrail = await Biketrail.findById(req.params.id).populate("comments").populate("images").exec();
        
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
                    console.log("Error when parsing xml string"); //,error.message);
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
                let totalDistRound = parseFloat(totalDist).toFixed(1);
                res.render("biketrails/show",{biketrail:foundBiketrail,user_id:user_id, sumDist:sumDist, totalDist:totalDistRound, alt:alt,positionAvg:positionAvg,jsonObj:jsonObj, geoJSONgpx:geoJSONgpx,file:fileName});
            });
        } else {
            let alt = {pos:"unkown",neg:"unkown"};
            res.render("biketrails/show",{biketrail:foundBiketrail,user_id:user_id, sumDist:"unkown", totalDist:"unkown", alt:alt,positionAvg:null,jsonObj:null, geoJSONgpx:null,file:"unkown"});
        }

    } catch (error){
        console.log("Error at show route: "); //,err.message);
        req.flash("error","ERROR: cannot show biketrail!");
    }
});

// Edit Biketrail
router.get("/:id/edit",middleware.checkBiketrailOwnership,async(req,res) => {
    console.log("hit edit route");
    try {
        let foundBiketrail = await Biketrail.findById(req.params.id);
        res.render("biketrails/edit",{biketrail:foundBiketrail});
    } catch (error) {
        console.log("ERROR: cannot get edit view!",error);
        req.flash("error","ERROR: cannot get edit view!");
    }
})

// CREATE NEW BIKETRAIL AND UPLOAD GPX TRACKS (ASYNC/AWAIT)
// -------------------------------------------------------------------------
router.post("/",middleware.isLoggedIn,gpxUpload.single('gpx'),async(req,res) => {
    // upload gpx tracks 
    try {
        if(req.file){
            const file = fsExtra.readFileSync(req.file.path,'utf-8'); 
            req.body.biketrail.gpxFile = file;
            req.body.biketrail.gpxFileName = req.file.path;
        }

        req.body.biketrail.author = {id:req.user._id,userName:req.user.username};
        let newBiketrail = req.body.biketrail;

        let geoData = await geocoder.geocode(req.body.location);
        if(!geoData){
            console.log("no geodata");
            req.flash("error","Invalid address!");
            return res.redirect("back");
        } else {
            console.log("geocode data found!");
            newBiketrail.lat = geoData[0].latitude;
            newBiketrail.lng = geoData[0].longitude;
            newBiketrail.location = geoData[0].formattedAddress;
        }

        let biketrail = await Biketrail.create(newBiketrail);

        req.flash("success","Successfully created new biketrail: " + biketrail.name);
        res.redirect("/biketrails");

    } catch (error){
        console.log("ERROR IN CREATE NEW BIKETRAIL: ",error.message);
        req.flash("error","Cannot create biketrail due to error!");
    }  
});

// UPATE BIKETRAIL  with GPX files (ASYNC / AWAIT)
router.put("/:id",middleware.checkBiketrailOwnership,gpxUpload.single('gpx'),async(req,res) => {
    try {
        if(req.file){
            const file = fsExtra.readFileSync(req.file.path,'utf-8'); 
            req.body.biketrail.gpxFile = file;
            req.body.biketrail.gpxFileName = req.file.path;
        }

        let geoData = await geocoder.geocode(req.body.location);
        if(!geoData.length){
            console.log("no geodata");
            req.flash("error","Invalid address!");
            return res.redirect("back");
        } else {
            console.log("geocode data found!");
            req.body.biketrail.lat = geoData[0].latitude;
            req.body.biketrail.lng = geoData[0].longitude;
            req.body.biketrail.location = geoData[0].formattedAddress;
        }

        let biketrail = await Biketrail.findByIdAndUpdate(req.params.id,req.body.biketrail);

        // console.log(`req.body.id: ${req.body.id}, req.params.id: ${req.params.id}`);
        req.flash("success","Successfully updated biketrail: " +req.body.biketrail.name);
        res.redirect("/biketrails/"+req.params.id);

    } catch (error) {
        console.log("Error in edit Biketrail: ",error);
        req.flash("error","ERROR: cannot update biketrail!");
        res.redirect("/biketrails");
    }
});

// -------------------------------------------------------------------------
// Destroy Biketrail with GPX files (ASYNC / AWAIT)
router.delete("/:id",middleware.checkBiketrailOwnership,async(req,res) => {
    try {
        let biketrail = await Biketrail.findById(req.params.id);
        await Comment.deleteMany({_id: { $in: biketrail.comments}});
        console.log("Biketrail comments deleted!");

        // loop through images and if last one has been deleted redirect
        let i=0;
        const len = biketrail.images.length;
        console.log("number of images: ",len);
        if(len ===0){
            await Biketrail.findByIdAndDelete(req.params.id);
            console.log("there were no images!");
            req.flash("success","Biketrail and comments deleted, no images found!");
            return res.redirect("/biketrails");
        } 

        biketrail.images.map(async (image) => {
            console.log("image inside biketrail delete: ",image);
            let foundImage = await Image.findById(image);
            if(foundImage != null){
                await cloudinary.v2.uploader.destroy(foundImage.image_id);
                console.log("image" + foundImage.image_id + "deleted in cloudinary");
            }

            i++;
            console.log(i);
            if(i===len){
                await Image.deleteMany({_id: { $in: biketrail.images}});
                await Biketrail.findByIdAndDelete(req.params.id);
                console.log("Biketrail, comments and all images deleted!");
                req.flash("success","Biketrail, comments and all images deleted!");
                return res.redirect('/biketrails');
            }
        });

    } catch (error){
        console.log("Error in delete Biketrail: ",error);
        req.flash("error","ERROR: cannot delete biketrail!");
        res.redirect("/biketrails");
    }
});

// https://stackoverflow.com/questions/38421664/fuzzy-searching-with-mongodb
function escapeRegex(text) {
    return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
};

module.exports = router;