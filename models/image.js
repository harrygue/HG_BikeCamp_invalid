const mongoose = require("mongoose");
const imageSchema = new mongoose.Schema({
    image:String,
    image_id:String,
    location:String
});

module.exports = mongoose.model("Image",imageSchema);