const express = require('express')
const path = require('path')
const router = express.Router();
const checkLogin =  require('../Auth/logged')
const checkAuth = require('../Auth/checkAuth')
const {handleLogin,handleSignup} = require('../controllers/user')
const Users = require('../models/users')

async function FindAllUsers(){
    return (await Users.find());
}

router.get('/signup',(req,res)=>{
   res.render('signup',{error:"",message:""})
})

router.get('/login',checkLogin,(req,res)=>{
   res.render('login',{error:"",message:""})
})
router.post('/login',handleLogin)

router.post('/signup',handleSignup)

router.get('/dashboard',checkAuth, async(req,res)=>{
   let allUsers = await FindAllUsers();
   res.render('dashboard',{active:allUsers,user:req.user})
})

router.get('/logout',(req,res)=>{
   res.clearCookie('jwt'); 
   res.redirect('/user/login')
})

module.exports = router;