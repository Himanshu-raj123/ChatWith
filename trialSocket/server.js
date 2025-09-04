const http = require('http');
const express = require('express')
const app = express();
const {Server} = require('socket.io')

const server = http.createServer(app)
const io = new Server(server)


const activeUsers = {};

// Socket
io.on('connection',(socket)=>{
  socket.on('userMessage',(data)=>{
    io.emit("message",data);
  })
})


app.get('/', (req, res) => {
  res.sendFile(__dirname + '/src/home.html')
})

server.listen(3000, () => {
  console.log('Server is listening on port 3000 : http://localhost:3000')
})