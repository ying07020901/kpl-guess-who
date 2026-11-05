const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static('public'));
const rooms = {};

io.on('connection', (socket) => {
  socket.on('createRoom', () => {
    const roomId = Math.random().toString(36).slice(2, 8);
    socket.join(roomId);
    rooms[roomId] = { players: [socket.id], target: {}, turn: 0 };
    socket.emit('roomCreated', roomId);
  })

  socket.on('joinRoom', (roomId) => {
    if (!rooms[roomId]) return socket.emit('err', '房间不存在');
    if (rooms[roomId].players.length >= 2) return socket.emit('err', '房间满了');
    socket.join(roomId);
    rooms[roomId].players.push(socket.id);
    io.to(roomId).emit('startGame');
  })

  socket.on('setTarget', ({roomId, pid})=>{
    rooms[roomId].target[socket.id] = pid;
    io.to(roomId).emit('syncTarget', rooms[roomId].target);
  })

  socket.on('sendQuestion', ({roomId, text})=>{
    socket.to(roomId).emit('recvQuestion', {from:socket.id, text});
  })
  socket.on('sendAnswer', ({roomId, ans})=>{
    socket.to(roomId).emit('recvAnswer', ans);
  })
  socket.on('switchTurn', (roomId)=>{
    rooms[roomId].turn ^=1;
    io.to(roomId).emit('turn', rooms[roomId].turn);
  })
  socket.on('guessMan', ({roomId, name, success})=>{
    io.to(roomId).emit('guessResult', {name, success});
  })

  socket.on('disconnect', ()=>{
    for(let r in rooms){
      if(rooms[r].players.includes(socket.id)){
        io.to(r).emit('leave');
        delete rooms[r];
      }
    }
  })
})

const PORT = process.env.PORT || 3000;
server.listen(PORT, ()=> console.log(`run on ${PORT}`));
