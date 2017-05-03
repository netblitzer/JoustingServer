const http = require('http');
const socketio = require('socket.io');
const main = require('./main.js');

const port = process.env.PORT || process.env.NODE_PORT || 3000;

const handler = () => { };

const app = http.createServer(handler).listen(port);

console.log(`Listening on localhost:${port}`);

const io = socketio(app);

main.startServer(io);
