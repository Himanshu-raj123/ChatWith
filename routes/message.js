const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middlewares/auth');
const { getChatHistory } = require('../controllers/message');

router.get('/history/:user1/:user2', requireAuth, getChatHistory);

module.exports = router;
