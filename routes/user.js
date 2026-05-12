const express = require('express')
const path = require('path')
const router = express.Router();
const { requireAuth, requireGuest, authorizeRoles } = require('../middlewares/auth')
const {handleLogin,handleSignup,handleLogout} = require('../controllers/user')
const Users = require('../models/users')

async function FindAllUsers(){
    return (await Users.find());
}
router.get('/signup',requireGuest,(req,res)=>{
   res.render('signup',{error:"",message:""})
})
router.get('/login',requireGuest,(req,res)=>{
   res.render('login',{error:"",message:""})
})
router.post('/login',requireGuest,handleLogin)

router.post('/signup',requireGuest,handleSignup)

router.get('/dashboard',requireAuth, async(req,res)=>{
   let allUsers = await FindAllUsers();
   res.render('dashboard',{all:allUsers,user:req.user,activeUsers: req.activeUsers})
})

router.get('/logout/',requireAuth,handleLogout)

module.exports = router;