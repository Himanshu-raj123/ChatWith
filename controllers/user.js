const Users = require('../models/users')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')

async function handleLogin(req, res) {
   const { email, password } = req.body;
    
   if (!email || !password) {
      return res.render('login', { error: "All fields are required", message: "" });
   }

   try{
      const user = await Users.findOne({Email:email})
      if(!user){
         return res.render('login',{error:"User Not Found",message:""})
      }

      if(!(await bcrypt.compare(password,user.Password))){
         return res.render('login',{error:"Invalid credentials",message:""})
      }

      const token = jwt.sign({ id: user._id, email: user.Email, name: user.Name },"HEllODEVELOPER",{expiresIn:'10d'})
      res.cookie('jwt',token,{maxAge: 10 * 24 * 60 * 60 * 1000})
      req.user = user;
      res.redirect('/user/dashboard')

   }catch(err){
      return res.render('login',{error:"Server Error",message:""})
   }
}

async function handleSignup(req, res) {
   const { name, email, password } = req.body;

   if (!name || !email || !password) {
      return res.render('signup', { error: "All fields are required", message: "" });
   }

   try {
      const hashedPassword = await bcrypt.hash(password, 12);
      await Users.create({ Name: name, Email: email, Password: hashedPassword });
      res.status(201).render('login', { error: "", message: "Signup successful, please login" });
   }
   catch (err) {
      if (err.code === 11000) {
         // Duplicate key error
         res.status(409).render('signup', { error: "User already exists", message: "" });
      } else {
         res.status(500).render('signup', { error: "Internal Server Error", message: "" });
      }
   }

}

module.exports={
   handleLogin,
   handleSignup,
}