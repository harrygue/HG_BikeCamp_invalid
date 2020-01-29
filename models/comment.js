const mongoose = require("mongoose");
//const moment = require("moment");

let commentSchema = new mongoose.Schema({
    text: String,
    // author: String,
    author:{
        id:{
            type: mongoose.Schema.Types.ObjectId,
            ref: "User"
        },
        userName: String
    },
    createdAt:{type:Date,default: Date.now()}
});

module.exports = mongoose.model("Comment",commentSchema);