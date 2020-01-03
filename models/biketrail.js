const mongoose = require("mongoose");

// Schema Setup
const biketrailSchema = new mongoose.Schema({
    name: String,
    description: String,
    location:String,
    lat:Number,
    lng:Number,
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
    }
});

module.exports = mongoose.model("Biketrail",biketrailSchema);