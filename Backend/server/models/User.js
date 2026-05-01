const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
    name:{
        type:String,
        required:true
    },
    email:{
        type:String,
        required:true,
        unique:true
    },
    password:{
        type:String,
        required:true
    },
    role:{
        type:String,
        enum:["student","teacher","admin"],
        default:"student"
    },
    status: {
        type: String,
        enum: ["active", "pending", "rejected"],
        default: "active"
    },
    subject: String,
    experience: String
},{
    timestamps:true
});

const User = mongoose.model("User",userSchema);

module.exports = User;