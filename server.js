const express = require('express');
const app = express();

const http = require('http');
const cookieParser = require('cookie-parser')
const connectMongodb = require('./connection')
const homeRouter = require('./routes/home')
const userRouter = require('./routes/user')
const messageRouter = require('./routes/message')
const { Server } = require('socket.io')
const User = require('./models/users')

app.set('view engine', 'ejs')
app.set("views", __dirname + "/views")

app.use(express.static('./static'))
app.use(express.urlencoded({ extended: true }))
app.use(cookieParser())

connectMongodb(process.env.MONGO_URL || process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/Chatwith')
   .then(async (res) => {
      console.log("Mongodb Server Connected Successfully");
      try {
         await User.updateMany({ messages: { $exists: false } }, { $set: { messages: [] } });
      } catch(err) { console.error(err) }
   })
   .catch((err) => { console.log("Error in connecting mongodb Server") })

const server = http.createServer(app)
const io = new Server(server)

const activeUsers = {}; // Define before app.use so it's populated

app.use((req, res, next) => {
   req.io = io;
   req.activeUsers = activeUsers; // attach to req to avoid circular imports
   next();
})


app.use('/', homeRouter);
app.use('/user', userRouter);
app.use('/message', messageRouter);

io.on('connection', (socket) => {
   socket.on("active", (email) => {
      activeUsers[email] = socket.id;
      io.emit("ActiveUsers", activeUsers)
   })

   socket.on("privateMessage", async (message, sender, receiver) => {
      const msgData = { sender, receiver, message, seen: false, timestamp: new Date() };
      // Save message directly into BOTH user accounts
      try {
         // 1. Add to Sender's account
         await User.updateOne({ Email: sender }, { $push: { messages: msgData } });
         // 2. Add to Receiver's account
         await User.updateOne({ Email: receiver }, { $push: { messages: msgData } });
      } catch (err) {
         console.error("Failed to save message to User DB", err);
      }

      const recSocketId = activeUsers[receiver];
      if (recSocketId) {
         io.to(recSocketId).emit('privateMessage', msgData)
      }
   })

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
         
         const senderSocketId = activeUsers[sender];
         if (senderSocketId) {
            io.to(senderSocketId).emit('messagesSeen', receiver);
         }
      } catch (err) {
         console.error("Error marking messages as seen", err);
      }
   })

   socket.on("disconnect", () => {
      for (email in activeUsers) {
         if (activeUsers[email] === socket.id) {
            delete activeUsers[email];
         }
      }
      io.emit("ActiveUsers", activeUsers);
   })
})


const PORT = process.env.PORT || 4000;
server.listen(PORT, (err) => {
   console.log(err ? "Error in starting the server" : `Server started at http://localhost:${PORT}/`)
})

module.exports = { io, activeUsers };