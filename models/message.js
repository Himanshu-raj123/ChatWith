const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
   sender: {
      type: String, // email
      required: true
   },
   receiver: {
      type: String, // email
      required: true
   },
   message: {
      type: String,
      required: true
   },
   timestamp: {
      type: Date,
      default: Date.now
   }
});

const Message = mongoose.model("Message", messageSchema);
module.exports = Message;
