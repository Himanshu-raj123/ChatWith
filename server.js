const express = require('express');
const app = express();
require('dotenv').config();

const mongoose = require('mongoose');
const http = require('http');
const cookieParser = require('cookie-parser')
const connectMongodb = require('./connection')
const homeRouter = require('./routes/home')
const userRouter = require('./routes/user')
const messageRouter = require('./routes/message')
const { Server } = require('socket.io')
const User = require('./models/users')
const { askGroq } = require('./aiService');
app.set('view engine', 'ejs')
app.set("views", __dirname + "/views")

app.use(express.static('./static'))
app.use(express.urlencoded({ extended: true }))
app.use(express.json())
app.use(cookieParser())

const cleanEnv = (val) => typeof val === 'string' ? val.replace(/^["']|["']$/g, '') : val;
const dbUrl = cleanEnv(process.env.MONGO_URL) || cleanEnv(process.env.MONGO_URI) || 'mongodb://127.0.0.1:27017/Chatwith';

connectMongodb(dbUrl)
   .then(async (res) => {
      console.log("Mongodb Server Connected Successfully");
      try {
         await User.updateMany({ messages: { $exists: false } }, { $set: { messages: [] } });
      } catch(err) { console.error(err) }
   })
   .catch((err) => { console.error("Error in connecting mongodb Server:", err) })

const server = http.createServer(app)
const io = new Server(server)

const activeUsers = {};
app.use((req, res, next) => {
   req.io = io;
   req.activeUsers = activeUsers; 
   next();
})


app.use('/', homeRouter);
app.use('/user', userRouter);
app.use('/message', messageRouter);

io.on('connection', (socket) => {
   socket.on("active", (email, name) => {
      activeUsers[email] = { socketId: socket.id, name: name };
      io.emit("ActiveUsers", activeUsers)
   })

   socket.on("privateMessage", async (message, sender, receiver, clientMsgId, callback) => {
      let ackCallback = typeof callback === 'function' ? callback : (typeof clientMsgId === 'function' ? clientMsgId : null);
      let passedMsgId = typeof clientMsgId === 'string' ? clientMsgId : null;

      const msgId = (passedMsgId && mongoose.Types.ObjectId.isValid(passedMsgId))
         ? new mongoose.Types.ObjectId(passedMsgId)
         : new mongoose.Types.ObjectId();

      const msgData = { _id: msgId, sender, receiver, message, seen: false, timestamp: new Date() };

      if (typeof ackCallback === 'function') {
         ackCallback({ status: 'ok', _id: msgId.toString(), timestamp: msgData.timestamp });
      }

      if (receiver === 'AI') {
         try {
            await User.updateOne({ Email: sender }, { $push: { messages: msgData } });
         } catch (err) {
            console.error("Failed to save user message to AI", err);
         }

         try {
            const aiResponseText = await askGroq(message);
            const aiMsgId = new mongoose.Types.ObjectId();
            const aiMsgData = { _id: aiMsgId, sender: 'AI', receiver: sender, message: aiResponseText, seen: false, timestamp: new Date() };
            
            await User.updateOne({ Email: sender }, { $push: { messages: aiMsgData } });

            socket.emit('privateMessage', aiMsgData);
         } catch (err) {
            console.error("AI chat error", err);
         }
         return; // Stop execution here so it doesn't try to find an 'AI' user in DB
      }
     
      try {
         await User.updateOne({ Email: sender }, { $push: { messages: msgData } });
         await User.updateOne({ Email: receiver }, { $push: { messages: msgData } });
      } catch (err) {
         console.error("Failed to save message to User DB", err);
      }

      const recSocketId = activeUsers[receiver]?.socketId;
      if (recSocketId) {
         io.to(recSocketId).emit('privateMessage', msgData);
      }
   })

   socket.on("deleteForMe", async ({ messageId, userEmail }, callback) => {
      try {
         if (!messageId || !userEmail) {
            if (typeof callback === 'function') callback({ success: false, error: 'Missing parameters' });
            return;
         }

         const queryId = mongoose.Types.ObjectId.isValid(messageId) ? new mongoose.Types.ObjectId(messageId) : messageId;

         await User.updateOne(
            { Email: userEmail },
            { $pull: { messages: { _id: queryId } } }
         );

         if (typeof callback === 'function') callback({ success: true, messageId: messageId.toString() });
      } catch (err) {
         console.error("Error deleting message for me:", err);
         if (typeof callback === 'function') callback({ success: false, error: err.message });
      }
   });

   socket.on("deleteForEveryone", async ({ messageId, sender, receiver }, callback) => {
      try {
         if (!messageId || !sender) {
            if (typeof callback === 'function') callback({ success: false, error: 'Missing parameters' });
            return;
         }

         const queryId = mongoose.Types.ObjectId.isValid(messageId) ? new mongoose.Types.ObjectId(messageId) : messageId;

         // Security check: Verify sender owns this message
         const senderUser = await User.findOne({ Email: sender });
         const targetMsg = senderUser?.messages?.find(m => m._id && m._id.toString() === messageId.toString());

         if (!targetMsg || targetMsg.sender !== sender) {
            if (typeof callback === 'function') {
               callback({ success: false, error: 'Unauthorized: Only sender can delete for everyone' });
            }
            return;
         }

         // 1. Remove from sender's messages
         await User.updateOne(
            { Email: sender },
            { $pull: { messages: { _id: queryId } } }
         );

         // 2. If receiver is not AI, remove from receiver's messages
         if (receiver && receiver !== 'AI') {
            await User.updateOne(
               { Email: receiver },
               {
                  $pull: {
                     messages: {
                        $or: [
                           { _id: queryId },
                           { sender: sender, receiver: receiver, timestamp: targetMsg.timestamp }
                        ]
                     }
                  }
               }
            );

            // Notify receiver in real-time
            const recSocketId = activeUsers[receiver]?.socketId;
            if (recSocketId) {
               io.to(recSocketId).emit('messageDeleted', {
                  messageId: messageId.toString(),
                  sender,
                  receiver
               });
            }
         }

         // Also emit messageDeleted back to sender (in case sender has multiple tabs)
         socket.emit('messageDeleted', {
            messageId: messageId.toString(),
            sender,
            receiver
         });

         if (typeof callback === 'function') callback({ success: true, messageId: messageId.toString() });
      } catch (err) {
         console.error("Error deleting message for everyone:", err);
         if (typeof callback === 'function') callback({ success: false, error: err.message });
      }
   });

   socket.on("markAsSeen", async ({ sender, receiver }) => {
      try {
         await User.updateOne(
            { Email: receiver },
            { $set: { "messages.$[elem].seen": true } },
            { arrayFilters: [{ "elem.sender": sender }] }
         );
         await User.updateOne(
            { Email: sender },
            { $set: { "messages.$[elem].seen": true } },
            { arrayFilters: [{ "elem.receiver": receiver }] }
         );
         
         const senderSocketId = activeUsers[sender]?.socketId;
         if (senderSocketId) {
            io.to(senderSocketId).emit('messagesSeen', receiver);
         }
      } catch (err) {
         console.error("Error marking messages as seen", err);
      }
   })

   socket.on("disconnect", () => {
      for (let email in activeUsers) {
         if (activeUsers[email].socketId === socket.id) {
            delete activeUsers[email];
         }
      }
      io.emit("ActiveUsers", activeUsers);
   })
})

const PORT = process.env.PORT || 4000;
server.listen(PORT, '0.0.0.0', (err) => {
   console.log(err ? "Error in starting the server" : `Server started at http://localhost:${PORT}/`)
})

module.exports = { io, activeUsers };