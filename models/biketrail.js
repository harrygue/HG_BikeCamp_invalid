const mongoose = require("mongoose");

// Schema Setup
const biketrailSchema = new mongoose.Schema({
    name: String,
    description: String,
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
    ]
});

module.exports = mongoose.model("Biketrail",biketrailSchema);