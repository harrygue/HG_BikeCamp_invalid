const mongoose = require("mongoose");
const imageSchema = new mongoose.Schema({
    url:String,
    location:String
});

module.exports = mongoose.model("Image",imageSchema);