var mongoose = require("mongoose");
const Biketrail = require("./models/biketrail");
const Comment = require("./models/comment");
const Image = require("./models/image").default;

const data = [
    {name:"Egelsee Trail",
    description:"nice trail"},
    {name:"Baldegg",
    description:"phantastic trail"}
];

const seedDB = () => {
    const images = ["https://cdn.pixabay.com/photo/2019/12/14/09/22/landscape-4694558__340.jpg",
    "https://cdn.pixabay.com/photo/2019/12/12/15/30/people-4690996__340.jpg","https://cdn.pixabay.com/photo/2019/12/01/09/39/landscape-4665051__340.jpg",
    "https://cdn.pixabay.com/photo/2019/12/14/09/22/desert-4694557__340.jpg"];

    Biketrail.remove({},(err) => {
        if(err){
            console.log(err);
        } else {
            console.log("all biketrails removed");
            // add a few biketrails
            data.forEach((biketrail) => {
                Biketrail.create(biketrail,(err,biketrail) => {
                    if(err){
                        console.log(err);
                    } else {
                        console.log("biketrail created!");
                        // Create a comment
                        Comment.create({
                            text:"CommentComment",
                            author:"Harry"
                        }),(err,comment) => {
                            if(err){
                                console.log("Error when seeding comment to biketrail");
                            } else {
                                biketrail.comments.push(comment);
                                biketrail.save();
                                console.log("created new comment");
                            }
                        }
                        // Create an image
                        const arbitraryImage = images[Math.floor(Math.random() * images.length)];
                        console.log("SEED: arbitrary image url:",arbitraryImage);
                        Image.create({
                            url:arbitraryImage,
                            location:"Bavarian Forest"
                        }),(err,image) => {
                            if(err){
                                console.log("Error when seeding comment to biketrail");
                            } else {
                                biketrail.comments.push(image);
                                biketrail.save();
                                console.log("created new comment");
                            }
                        }
                    }
                });
            })
        }
    });
};

module.exports = seedDB;