const express = require('express');
const app = express();
const http = require('http');
const cookieParser = require('cookie-parser')
const connectMongodb = require('./connection')
const homeRouter = require('./routes/home')
const userRouter = require('./routes/user')
const {Server} = require('socket.io')


app.set('view engine','ejs')
app.set("views", __dirname+"/views")

app.use(express.static('./static'))
app.use(express.urlencoded({extended:true}))
app.use(cookieParser())

connectMongodb('mongodb://127.0.0.1:27017/Chatwith')
.then((res)=>console.log("Mongodb Server Connected Successfully"))
.catch((err)=>{console.log("Error in connecting mongodb Server")})

const server = http.createServer(app)
const io = new Server(server)

const activeUsers = {};

app.use('/home',homeRouter);
app.use('/user',userRouter);

io.on('connection',(socket)=>{
   socket.on("active",(email)=>{
      activeUsers[email] = socket.id;
   })

   socket.on("privateMessage",(message,sender,receiver)=>{
      const recSocketId = activeUsers[receiver];
      if(recSocketId){
         io.to(recSocketId).emit('privateMessage',{
            sender,
            message
         })
      }
   })
})


server.listen(4000,(err)=>{
   console.log(err?"Error in starting the server":"Server started at http://localhost:4000/home")
})