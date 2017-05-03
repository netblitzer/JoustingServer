const Message = require('./Message.js');

class Match {

  constructor(_io, _hash) {
    this.io = _io;
    this.hash = _hash;

    this.players = {
      p1: undefined,
      p2: undefined,
    };

    this.state = 'waiting';

    this.setupTimer = 0;
    this.maxSetupTimer = 15;
  }

  destructor() {
    if (this.players.p1 !== undefined) {
      const socket = this.players.p1;

      socket.leave(this.hash);
      socket.player.curRoom = undefined;

      this.players.p1 = undefined;
    }

    if (this.players.p2 !== undefined) {
      const socket = this.players.p2;

      socket.leave(this.hash);
      socket.player.curRoom = undefined;

      this.players.p2 = undefined;
    }
  }

  // check to see if the match can add a player
  count() {
    let c = 0;

    if (this.players.p1 !== undefined) {
      c++;
    }
    if (this.players.p2 !== undefined) {
      c++;
    }

    return c;
  }

  // function to add a new player to the match
  addPlayer(sock) {
    const socket = sock;

    // prevent adding the player twice
    if (socket.player.curRoom === this.hash) {
      return;
    }

    if (this.players.p1 === undefined) {
      this.players.p1 = socket;
    } else if (this.players.p2 === undefined) {
      this.players.p2 = socket;
    }

    socket.join(this.hash);
    socket.player.curRoom = this.hash;

    if (this.players.p1 !== undefined && this.players.p2 !== undefined) {
      this.players.p1.emit('matchPreparing');
      this.players.p2.emit('matchPreparing');

      this.state = 'preparing';
    } else {
      socket.emit('matchWaiting', new Message('waitStart', new Date().getTime()));
    }
  }

  // function to remove a player from the match
  removePlayer(sock) {
    const socket = sock;

    let which = undefined;

    if (this.players.p1 === socket) {
      which = 'p1';
    } else if (this.players.p2 === socket) {
      which = 'p2';
    }

    if (which !== undefined) {
      this.players[which] = undefined;

      socket.leave(this.hash);
      socket.player.curRoom = undefined;
    }
  }

  // function to update the match and run it
  updateMatch(_dt) {
    const p1 = this.players.p1;
    const p2 = this.players.p2;

    switch (this.state) {

      case 'inGame':


        break;

      case 'preparing':

        this.setupTimer += _dt;

        p1.emit('prepUpdate', new Message('setupTime', this.setupTimer));
        p2.emit('prepUpdate', new Message('setupTime', this.setupTimer));

        break;

      default:
      case 'waiting':

        break;

    }

    // return false to say the match hasn't ended
    return false;
  }

  // endMatch(winner, loser) {
//
  // }

}

module.exports = Match;
