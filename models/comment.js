const mongoose = require("mongoose");

let commentSchema = new mongoose.Schema({
    text: String,
    // author: String,
    author:{
        id:{
            type: mongoose.Schema.Types.ObjectId,
            ref: "User"
        },
        userName: String
    }
});

module.exports = mongoose.model("Comment",commentSchema);