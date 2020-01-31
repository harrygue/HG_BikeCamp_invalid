const mongoose = require("mongoose");
//const moment = require("moment");

// Schema Setup
const biketrailSchema = new mongoose.Schema({
    name: String,
    description: String,
    location:String,
    lat:Number,
    lng:Number,
    kml_url:String,
    kml_id:String,
    createdAt: {type:Date,default: Date.now()},
    images: [
        {
            type:mongoose.Schema.Types.ObjectId,
            ref: "Image"
        }
    ],
    comments:[
        {
            type:mongoose.Schema.Types.ObjectId,
            ref: "Comment"
        }
    ],
    author:{
        id:{
            type: mongoose.Schema.Types.ObjectId,
            ref: "User"
        },
        userName: String
    },
    
});

module.exports = mongoose.model("Biketrail",biketrailSchema);