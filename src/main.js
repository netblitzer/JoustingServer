const xxh = require('xxhashjs');

const Message = require('./Types/Message.js');
const Player = require('./Types/Player.js');
const Match = require('./Types/Match.js');

let io;

const users = { };

const matches = { };

const matchMaking = (type, sock) => {
  const socket = sock;


  console.log(`User${socket.hash} has joined matchmaking: type ${type}.`);

  switch (type) {

    default:
    case 'random': {
      let inMatch = false;
      const matchKeys = Object.keys(matches);

      for (let i = 0; i < matchKeys.length; i++) {
        const M = matches[matchKeys[i]];
        const c = M.count();

        if (c < 2) {
          M.addPlayer(socket);
          console.log(`Adding ${socket.player.name} to Match${M.hash}.`);

          inMatch = true;
          break;
        }
      }

      if (!inMatch) {
        const h = xxh.h32(`${new Date().getTime()}`, 0xCAFEBABE).toString(16);
        const M = new Match(io, h);
        console.log(`Adding Match${M.hash}.`);
        console.log(`Adding ${socket.player.name} to Match${M.hash}.`);

        matches[h] = M;
        M.addPlayer(socket);
      }
      break;
    }
  }
};

const onJoined = (sock) => {
  const socket = sock;

  socket.on('join', () => {
    const hash = xxh.h32(`${socket.id}${new Date().getTime()}`, 0xCAFEBABE).toString(16);
    socket.hash = hash;

    const ply = new Player(`User${hash}`, hash);
    socket.player = ply;

    socket.emit('joined', new Message('player', ply));

    console.log(`User${hash} has joined the server.`);

    users[hash] = socket;
  });
};

const onLeave = (sock) => {
  const socket = sock;

  socket.on('leave', () => {
    if (matches[socket.player.curRoom]) {
      const M = matches[socket.player.curRoom];

      M.removePlayer(socket);

      console.log(`User${socket.hash} has left matchmaking.`);

      if (M.count() === 0) {
        M.destructor();
        console.log(`Deleting Match${M.hash}.`);

        delete matches[M.hash];
      }
    }
  });
};

const onDisconnect = (sock) => {
  const socket = sock;

  socket.on('disconnect', () => {
    if (socket.player && matches[socket.player.curRoom]) {
      const M = matches[socket.player.curRoom];

      M.removePlayer(socket);

      console.log(`User${socket.hash} has left matchmaking.`);

      if (M.count() === 0) {
        M.destructor();
        console.log(`Deleting Match${M.hash}.`);

        delete matches[M.hash];
      }
    }

    delete users[socket.hash];
  });
};


// const onEnter = (sock) => {
//  const socket = sock;
//
//  socket.on('enterShop', (m) => {
//
//
//  });
// };
//
// const onDeal = (sock) => {
//  const socket = sock;
//
//  socket.on('deal', (m) => {
//
//
//  });
// };


const onMatch = (sock) => {
  const socket = sock;

  socket.on('match', (m) => {
    switch (m.type) {
      case 'random':
        matchMaking(m.type, socket);
        break;

      default:
        console.log('ERROR: Unknown match type.');
        break;
    }
  });
};

const onLeaveMatch = (sock) => {
  const socket = sock;

  socket.on('leaveMatch', () => {
    if (matches[socket.player.curRoom]) {
      const M = matches[socket.player.curRoom];

      M.removePlayer(socket);

      console.log(`User${socket.hash} has left matchmaking.`);

      if (M.count() === 0) {
        M.destructor();
        console.log(`Deleting Match${M.hash}.`);

        delete matches[M.hash];
      }
    }
  });
};

const onInput = (sock) => {
  const socket = sock;

  socket.on('inputSent', (m) => {
    if (socket.player.curRoom) {
      // console.dir(m.data);
      matches[socket.player.curRoom].updateInput(socket.player.hash, m.data);
    }
  });
};


let lastTime = new Date().getTime();
let dT = lastTime;


// Main server loop
const update = () => {
  const curTime = new Date().getTime();
  dT = (curTime - lastTime) * 0.001;
  lastTime = curTime;

  const matchKeys = Object.keys(matches);

  for (let i = 0; i < matchKeys.length; i++) {
    const M = matches[matchKeys[i]];
    const matchRunning = M.updateMatch(dT);

    if (!matchRunning) {
      M.destructor();

      delete matches[matchKeys[i]];
    }
  }
};

// Main server init
const startServer = (ioServer) => {
  io = ioServer;


  //  *  Socket connection handler  *  //
  io.on('connection', (sock) => {
    const socket = sock;

    // when the player connects to the server from the main menu
      // this gets called immediately when the game is loaded in
    onJoined(socket);
    // when the player 'quits' the game and goes back to the main menu
    onLeave(socket);

    onDisconnect(socket);


    // onEnter(socket);
    // onDeal(socket);


    onMatch(socket);
    onLeaveMatch(socket);
    onInput(socket);

    console.log('User connected');
  });


  setInterval(update, 16);
};

module.exports = {
  startServer,
};
