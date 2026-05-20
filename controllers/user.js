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

      const token = jwt.sign({ id: user._id, email: user.Email, name: user.Name, role: user.Role }, process.env.JWT_SECRET || "HEllODEVELOPER",{expiresIn:'10d'})
      res.cookie('jwt',token,{maxAge: 10 * 24 * 60 * 60 * 1000, httpOnly: true})
      req.user = user;
      res.redirect('/user/dashboard')

   }catch(err){
      console.error("Login Error:", err);
      return res.render('login',{error:"Server Error",message:""})
   }
}

async function handleSignup(req, res) {
   const { name, email, password } = req.body;

   if (!name || !email || !password) {
      return res.render('signup', { error: "All fields are required", message: "" });
   }

   if (name.trim().length < 3) {
      return res.render('signup', { error: "Name must be at least 3 characters long", message: "" });
   }

   // Email format validation
   const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
   if (!emailRegex.test(email)) {
      return res.render('signup', { error: "Please enter a valid email address", message: "" });
   }

   // Password length validation (at least 6 characters)
   if (password.length < 6) {
      return res.render('signup', { error: "Password must be at least 6 characters long", message: "" });
   }

   try {
      const existingUser = await Users.findOne({ Email: email });
      if (existingUser) {
         return res.status(409).render('signup', { error: "Email is already registered", message: "" });
      }

      const hashedPassword = await bcrypt.hash(password, 12);
      await Users.create({ Name: name, Email: email, Password: hashedPassword });
      res.status(201).render('login', { error: "", message: "Signup successful, please login" });
   }
   catch (err) {
      if (err.code === 11000) {
         // Duplicate key error
         res.status(409).render('signup', { error: "User already exists", message: "" });
      } else {
         console.error("Signup Error:", err);
         res.status(500).render('signup', { error: "Internal Server Error", message: "" });
      }
   }

}

async function handleLogout(req,res){
   
      res.clearCookie('jwt');  
      res.redirect("/user/login");  
}

module.exports={
   handleLogin,
   handleSignup,
   handleLogout
}