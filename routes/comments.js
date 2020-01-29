const express = require("express");
const router = express.Router({mergeParams:true});
const passport = require("passport");
const Biketrail = require("../models/biketrail");
const Comment = require("../models/comment");
const middleware = require("../middleware");
const moment = require("moment");

// Comments - New Form

router.get("/new",middleware.isLoggedIn,(req,res) => {
    Biketrail.findById(req.params.id,(err,biketrail) => {
        if(err){
            console.log("Error at new comments:",err);
            req.flash("error",err);
        } else {
            res.render("comments/new",{biketrail:biketrail,});
        }
    });
});

router.post("/",middleware.isLoggedIn,(req,res) => {
    let newComment = req.body.comment;
    newComment.creation_date = moment().format();
    newComment.author = {id:req.user._id,userName:req.user.username};
    Biketrail.findById(req.params.id,(err,foundBiketrail) => {
        if(err){
            console.log("Error at post new comment route in find biketrail: ",err);
            res.redirect("biketrails");
        } else {
            Comment.create(newComment,(err,comment) => {
                if(err){
                    console.log("Error in post route Biketrail Comment at create comment: ",err);
                    req.flash("error",err);
                    res.redirect("/biketrails");
                } else {
                    foundBiketrail.comments.push(comment);
                    foundBiketrail.save();
                    console.log("created new comment for biketrail: \n",foundBiketrail.name);
                    req.flash("success","Successfully created comment!");
                    res.redirect("/biketrails/" + req.params.id);
                }

            });
        }
    });
});

// Edit comment - get
router.get("/:comment_id/edit",middleware.checkCommentOwnership,(req,res) => {
    // console.log(req);
    console.log(req.params.id);
    console.log(req.params.comment_id);
    Comment.findById(req.params.comment_id,(err,comment) => {
        if(err){
            console.log("Error in edit comment route",err);
            req.flash("error",err);
            res.redirect("/biketrails");
        }
        console.log("load comment edit form");
        console.log("update comment: ",comment);
        res.render("comments/edit",{comment:comment, biketrail_id:req.params.id});
    });
});

// Update comment - put
router.put("/:comment_id",middleware.checkCommentOwnership,(req,res) => {
    console.log("hit update route");
    let updatedComment = req.body.comment;
    Comment.findByIdAndUpdate(req.params.comment_id,updatedComment,(err,comment) => {
        if(err){
            console.log("Error in update comment: ",err);
            req.flash("error",err);
            res.redirect("/biketrails");
        }
        console.log("Comment updated");
        req.flash("success","successfully updated comment!");
        res.redirect("/biketrails/"+req.params.id);
    });
});

// Delete comment - delete
router.delete("/:comment_id",middleware.checkCommentOwnership,(req,res) => {
    console.log("hit delete route");
    Comment.findByIdAndDelete(req.params.comment_id,(err) => {
        if(err){
            console.log("Error in delete comment: ",err);
            req.flash("error",err);
            res.redirect("/biketrails");
        }
        console.log("Comment deleted");
        req.flash("success","comment deleted!");
        res.redirect("back");
    });
})

module.exports = router;