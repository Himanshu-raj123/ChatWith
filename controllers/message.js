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

module.exports = { getChatHistory };
