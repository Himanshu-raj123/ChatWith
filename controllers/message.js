const mongoose = require('mongoose');
const User = require('../models/users');

async function getChatHistory(req, res) {
   const { user1, user2 } = req.params; // user1 is logged in, user2 is the target
   
   try {
      // Find the logged-in user
      const user = await User.findOne({ Email: user1 });
      if (!user) {
         return res.status(200).json([]);
      }
      
      // Filter the user's embedded messages array to just the conversation with user2
      const history = user.messages.filter(msg => 
         (msg.sender === user1 && msg.receiver === user2) || 
         (msg.sender === user2 && msg.receiver === user1)
      );
      
      res.status(200).json(history);
   } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to fetch chat history" });
   }
}

async function handleDeleteMessage(req, res) {
   const { messageId, type, receiver } = req.body;
   const currentUserEmail = req.user?.email;

   if (!messageId || !currentUserEmail) {
      return res.status(400).json({ success: false, error: "Missing messageId or user session" });
   }

   try {
      const queryId = mongoose.Types.ObjectId.isValid(messageId) ? new mongoose.Types.ObjectId(messageId) : messageId;

      if (type === 'everyone') {
         const senderUser = await User.findOne({ Email: currentUserEmail });
         const targetMsg = senderUser?.messages?.find(m => m._id && m._id.toString() === messageId.toString());

         if (!targetMsg || targetMsg.sender !== currentUserEmail) {
            return res.status(403).json({ success: false, error: "Unauthorized to delete this message for everyone" });
         }

         await User.updateOne({ Email: currentUserEmail }, { $pull: { messages: { _id: queryId } } });

         if (receiver && receiver !== 'AI') {
            await User.updateOne(
               { Email: receiver },
               {
                  $pull: {
                     messages: {
                        $or: [
                           { _id: queryId },
                           { sender: currentUserEmail, receiver: receiver, timestamp: targetMsg.timestamp }
                        ]
                     }
                  }
               }
            );

            // Broadcast real-time if activeUsers and io are accessible
            const recSocketId = req.activeUsers?.[receiver]?.socketId;
            if (recSocketId && req.io) {
               req.io.to(recSocketId).emit('messageDeleted', { messageId, sender: currentUserEmail, receiver });
            }
         }

         if (req.io) {
            const senderSocketId = req.activeUsers?.[currentUserEmail]?.socketId;
            if (senderSocketId) {
               req.io.to(senderSocketId).emit('messageDeleted', { messageId, sender: currentUserEmail, receiver });
            }
         }

         return res.status(200).json({ success: true, messageId });
      } else {
         // Delete for me
         await User.updateOne({ Email: currentUserEmail }, { $pull: { messages: { _id: queryId } } });
         return res.status(200).json({ success: true, messageId });
      }
   } catch (err) {
      console.error("Failed to delete message via REST:", err);
      return res.status(500).json({ success: false, error: "Internal server error" });
   }
}

module.exports = { getChatHistory, handleDeleteMessage };
