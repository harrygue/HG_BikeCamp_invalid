const express = require("express");
const router = express.Router({mergeParams:true});
const passport = require("passport");
const Biketrail = require("../models/biketrail");
const Comment = require("../models/comment");
const middleware = require("../middleware");
const moment = require("moment");

// Comments - New Form

router.get("/new",middleware.isLoggedIn,async(req,res) => {
    try {
        let biketrail = await Biketrail.findById(req.params.id);
        res.render("comments/new",{biketrail:biketrail,});
    } catch(error){
        console.log("Error at new comments:",error);
        req.flash("error","ERROR: cannot get comment form!");
        res.redirect("/biketrails");
    }
});

router.post("/",middleware.isLoggedIn,async(req,res) => {
    try {
        let newComment = req.body.comment;
        newComment.creation_date = moment().format();
        newComment.author = {id:req.user._id,userName:req.user.username};
        let foundBiketrail = await Biketrail.findById(req.params.id);
        let comment = await Comment.create(newComment);
        foundBiketrail.comments.push(comment);
        foundBiketrail.save();
        console.log("created new comment for biketrail: \n",foundBiketrail.name);
        req.flash("success","Successfully created comment!");
        res.redirect("/biketrails/" + req.params.id);
    } catch (error){
        console.log("Error at post new comment route in find biketrail: ",error);
        req.flash("error","ERROR: cannot create comment!");
        res.redirect("/biketrails");
    }
});

// Edit comment - get
router.get("/:comment_id/edit",middleware.checkCommentOwnership,async(req,res) => {
    try{
        // console.log(req.params.id);
        // console.log(req.params.comment_id);

        let comment  = await Comment.findById(req.params.comment_id);

        // console.log("load comment edit form");
        // console.log("update comment: ",comment);

        res.render("comments/edit",{comment:comment, biketrail_id:req.params.id});

    } catch (error) {
        console.log("ERROR: cannot get edit view!",error);
        req.flash("error","ERROR: cannot get edit view!");
        res.redirect("/biketrails");
    }
});

// Update comment - put
router.put("/:comment_id",middleware.checkCommentOwnership,async(req,res) => {
    try {
        console.log("hit update route");
        let updatedComment = req.body.comment;
        let comment = await Comment.findByIdAndUpdate(req.params.comment_id,updatedComment);
        console.log("Comment updated");
        req.flash("success","successfully updated comment!");
        res.redirect("/biketrails/"+req.params.id);
    } catch (error) {
        console.log("ERROR: cannot update comment! ",error);
        req.flash("error","ERROR: cannot update comment!");
        res.redirect("/biketrails");
    }
});

// Delete comment - delete
router.delete("/:comment_id",middleware.checkCommentOwnership,async(req,res) => {
    try {
        console.log("hit delete route");
        await Comment.findByIdAndDelete(req.params.comment_id);
        console.log("Comment deleted");
        req.flash("success","comment deleted!");
        res.redirect("back");
    } catch (error) {
        console.log("ERROR: cannot delete comment! ",error);
        req.flash("error","ERROR: cannot delete comment!");
        res.redirect("/biketrails");
    }
});

module.exports = router;