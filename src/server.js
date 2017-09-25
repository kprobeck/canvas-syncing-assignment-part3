const http = require('http');
const fs = require('fs');
const socketio = require('socket.io');

const port = process.env.PORT || process.env.NODE_PORT || 3000;

const index = fs.readFileSync(`${__dirname}/../client/index.html`);

const onRequest = (req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/html ' });
  res.write(index);
  res.end();
};

const app = http.createServer(onRequest).listen(port);

console.log(`Listening on 127.0.0.1 ${port}`);

// pass in the http server into socketio and grab websocket as io
const io = socketio(app);

const draws = [{ x: 0, y: 0, width: 100, height: 100 }];

// function to generate a new square when a new user joins
const generateSquare = (user) => {
  const randomX = Math.floor(Math.random() * 600);
  const randomY = Math.floor(Math.random() * 400);

  const time = new Date().getTime();
  draws[user] = { lastUpdate: time, x: randomX, y: randomY, width: 100, height: 100 };

  const coords = { lastUpdate: time, x: randomX, y: randomY, width: 100, height: 100 };

  console.log('square generated!');

  io.sockets.in('room1').emit('addToDraw', { user, time, coords });
};

const onJoined = (sock) => {
  const socket = sock;

  socket.on('join', (data) => {
    const joined = data.joined;

    const drawnData = {
      drawData: draws,
    };

    socket.emit('initialData', drawnData);

    if (joined) {
      socket.join('room1');
      generateSquare(data.user);
    }
  });
};

const onMsg = (sock) => {
  const socket = sock;

  socket.on('updateSquare', (data) => {
    if (!draws[data.user]) { // new user
      draws[data.user] = data.coords;
    } else if (data.coords.lastUpdate > draws[data.user].lastUpdate) { // old user, new info
      draws[data.user] = data.coords;
    }

    io.sockets.in('room1').emit('updateUserInfo', { user: data.user, coords: data.coords });
  });
};

const onDisconnect = (sock) => {
  const socket = sock;

  socket.leave('room1');
};

io.sockets.on('connection', (socket) => {
  console.log('started');

  onJoined(socket);
  onMsg(socket);
  onDisconnect(socket);
});

console.log('Websocket server started');
