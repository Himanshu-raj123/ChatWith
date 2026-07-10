const mongoose = require('mongoose')

const userSchema = new mongoose.Schema({
   Name:{
      type:String,
      required:true
   },
   Email:{
      type:String,
      required:true,
      unique: true
   },
   Password:{
      type:String,
      required:true,
   },
   Role:{
      type:String,
      default: "USER"
   },
   messages: [
      {
         sender: String,
         receiver: String,
         message: String,
         seen: { type: Boolean, default: false },
         timestamp: { type: Date, default: Date.now }
      }
   ]
})

const user = mongoose.model("users", userSchema, "Chatwith")

module.exports = user;