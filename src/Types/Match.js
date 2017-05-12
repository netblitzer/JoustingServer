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

    this.impact = false;
    this.postTime = 5;

    this.setupTimer = 0;
    this.maxSetupTimer = 3;
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

    socket.leave('lobby');
    socket.join(this.hash);
    socket.player.curRoom = this.hash;
    socket.player.reset();

    if (this.players.p1 !== undefined && this.players.p2 !== undefined) {
      this.state = 'preparing';
      this.setupTimer = 0;

      this.players.p1.emit('matchPreparing', new Message('matchPreparing', {
        maxTime: this.maxSetupTimer,
        p1: this.players.p1.player,
        p2: this.players.p2.player,
      }));

      this.players.p2.emit('matchPreparing', new Message('matchPreparing', {
        maxTime: this.maxSetupTimer,
        p1: this.players.p1.player,
        p2: this.players.p2.player,
      }));
    } else {
      socket.emit('matchWaiting', new Message('waitStart', new Date().getTime()));
    }
  }

  // function to remove a player from the match
  removePlayer(sock) {
    const socket = sock;

    let which;

    if (this.players.p1 === socket) {
      which = 'p1';
    } else if (this.players.p2 === socket) {
      which = 'p2';
    }

    if (which !== undefined) {
      this.players[which] = undefined;

      socket.leave(this.hash);
      socket.join('lobby');
      socket.player.curRoom = undefined;
    }

    if (this.state === 'preparing' || this.state === 'inGame') {
      this.state = 'userLeftGame';
    }
  }

  // funciton to update a player's input variables
  updateInput(_hash, _input) {
    if (this.players.p1.player.hash === _hash) {
      this.players.p1.player.input.boost = _input.space;
      this.players.p1.player.input.shield = _input.mouse2;
      this.players.p1.player.input.lance = _input.mouse1;
    }

    if (this.players.p2.player.hash === _hash) {
      this.players.p2.player.input.boost = _input.space;
      this.players.p2.player.input.shield = _input.mouse2;
      this.players.p2.player.input.lance = _input.mouse1;
    }
  }

  // function to update the match and run it
  updateMatch(_dt) {
    const p1 = this.players.p1;
    const p2 = this.players.p2;

    // case declarations
    let Ply1;
    let Ply2;
    let dist;

    if (p1) { Ply1 = p1.player; }
    if (p2) { Ply2 = p2.player; }

    let running = true;

    switch (this.state) {

      case 'inGame':

        // Input handling

        if (Ply1.input.boost) {
          Ply1.data.boosting = true;
        }

        if (Ply2.input.boost) {
          Ply2.data.boosting = true;
        }

        if (Ply1.input.lance) {
          if (!Ply1.data.lanceDown && !Ply1.lanceReady) {
            Ply1.data.lanceDown = true;
          }
        }

        if (Ply2.input.lance) {
          if (!Ply2.data.lanceDown && !Ply2.lanceReady) {
            Ply2.data.lanceDown = true;
          }
        }

        // adjust player 1 state

        // * LANCE * //
        if (Ply1.data.lanceDown && Ply1.data.lanceDropProgress < 1) {
          Ply1.data.lanceDropProgress += _dt;

          if (Ply1.data.lanceDropProgress > 1) {
            Ply1.data.lanceDropProgress = 1;
            Ply1.lanceReady = true;
            Ply1.lanceState = 'ready';
          }
        }

        if (Ply1.lanceReady && Ply1.input.lance) {
          Ply1.lanceState = 'charging';
          Ply1.data.lanceProgress -= _dt;

          if (Ply1.data.lanceProgress < -1) {
            Ply1.data.lanceProgress = -1;
          }
        } else if (Ply1.lanceReady && Ply1.lanceState === 'charging' && !Ply1.input.lance) {
          Ply1.lanceState = 'forward';
          Ply1.lanceCharge = -Ply1.data.lanceProgress;
        } else if (Ply1.lanceState === 'forward') {
          Ply1.data.lanceProgress += _dt * 10;

          if (Ply1.data.lanceProgress > Ply1.lanceCharge) {
            Ply1.data.lanceProgress = Ply1.lanceCharge;
            Ply1.lanceState = 'holding';
          }
        } else if (Ply1.lanceState === 'holding') {
          Ply1.lanceHoldTime += _dt;

          if (Ply1.lanceHoldTime > Ply1.lanceCharge / 2) {
            Ply1.lanceHoldTime = 0;
            Ply1.lanceState = 'returning';
          }
        } else if (Ply1.lanceState === 'returning') {
          Ply1.data.lanceProgress -= _dt * 2;

          if (Ply1.data.lanceProgress < 0) {
            Ply1.data.lanceProgress = 0;
            Ply1.lanceState = 'ready';
            Ply1.lanceCharge = 0;
          }
        }

        // * BOOST * //
        if (Ply1.data.boostProgress < 1) {
          Ply1.data.boostProgress += _dt;

          if (Ply1.data.boostProgress > 1) {
            Ply1.data.boostProgress = 1;
          }
        }

        if (Ply1.data.boosting) {
          if (Ply1.acceleratingTime < Ply1.acceleratingTotalTime) {
            Ply1.acceleratingTime += _dt;
            Ply1.data.velocity += (Ply1.data.boostProgress ** 2) * 20;
          } else {
            Ply1.acceleratingTime = 0;
            Ply1.data.boosting = false;
            Ply1.data.boostProgress = 0;
          }
        }

        if (Ply1.data.velocity > Ply1.minSpeed) {
          Ply1.data.velocity *= 0.997;

          if (Ply1.data.velocity < Ply1.minSpeed) {
            Ply1.data.velocity = Ply1.minSpeed;
          }
        } else if (Ply1.data.velocity < Ply1.minSpeed) {
          Ply1.data.velocity += _dt * 80;

          if (Ply1.data.velocity > Ply1.minSpeed) {
            Ply1.data.velocity = Ply1.minSpeed;
          }
        } else if (Ply1.data.velocity > Ply1.maxSpeed) {
          Ply1.data.velocity = Ply1.maxSpeed;
        }

        Ply1.data.cx = Ply1.data.bx;
        Ply1.data.bx = Ply1.data.ax;
        if (!this.impact) {
          Ply1.data.ax -= Ply1.data.velocity * _dt;
        } else {
          Ply1.data.ax -= Ply1.data.velocity * _dt * 0.05;
        }


        // adjust player 2 state

        // * LANCE * //
        if (Ply2.data.lanceDown && Ply2.data.lanceDropProgress < 1) {
          Ply2.data.lanceDropProgress += _dt;

          if (Ply2.data.lanceDropProgress > 1) {
            Ply2.data.lanceDropProgress = 1;
            Ply2.lanceReady = true;
            Ply2.lanceState = 'ready';
          }
        }

        if (Ply2.lanceReady && Ply2.input.lance) {
          Ply2.lanceState = 'charging';
          Ply2.data.lanceProgress -= _dt;

          if (Ply2.data.lanceProgress < -1) {
            Ply2.data.lanceProgress = -1;
          }
        } else if (Ply2.lanceReady && Ply2.lanceState === 'charging' && !Ply2.input.lance) {
          Ply2.lanceState = 'forward';
          Ply2.lanceCharge = -Ply2.data.lanceProgress;
        } else if (Ply2.lanceState === 'forward') {
          Ply2.data.lanceProgress += _dt * 10;

          if (Ply2.data.lanceProgress > Ply2.lanceCharge) {
            Ply2.data.lanceProgress = Ply2.lanceCharge;
            Ply2.lanceState = 'holding';
          }
        } else if (Ply2.lanceState === 'holding') {
          Ply2.lanceHoldTime += _dt;

          if (Ply2.lanceHoldTime > Ply2.lanceCharge / 2) {
            Ply2.lanceHoldTime = 0;
            Ply2.lanceState = 'returning';
          }
        } else if (Ply2.lanceState === 'returning') {
          Ply2.data.lanceProgress -= _dt * 2;

          if (Ply2.data.lanceProgress < 0) {
            Ply2.data.lanceProgress = 0;
            Ply2.lanceState = 'ready';
            Ply2.lanceCharge = 0;
          }
        }

        // * BOOST * //
        if (Ply2.data.boostProgress < 1) {
          Ply2.data.boostProgress += _dt;

          if (Ply2.data.boostProgress > 1) {
            Ply2.data.boostProgress = 1;
          }
        }

        if (Ply2.data.boosting) {
          if (Ply2.acceleratingTime < Ply2.acceleratingTotalTime) {
            Ply2.acceleratingTime += _dt;
            Ply2.data.velocity += (Ply2.data.boostProgress ** 2) * 20;
          } else {
            Ply2.acceleratingTime = 0;
            Ply2.data.boosting = false;
            Ply2.data.boostProgress = 0;
          }
        }

        if (Ply2.data.velocity > Ply2.minSpeed) {
          Ply2.data.velocity *= 0.997;

          if (Ply2.data.velocity < Ply2.minSpeed) {
            Ply2.data.velocity = Ply2.minSpeed;
          }
        } else if (Ply2.data.velocity < Ply2.minSpeed) {
          Ply2.data.velocity += _dt * 80;


          if (Ply2.data.velocity > Ply2.minSpeed) {
            Ply2.data.velocity = Ply2.minSpeed;
          }
        } else if (Ply2.data.velocity > Ply2.maxSpeed) {
          Ply2.data.velocity = Ply2.maxSpeed;
        }

        Ply2.data.cx = Ply2.data.bx;
        Ply2.data.bx = Ply2.data.ax;
        if (!this.impact) {
          Ply2.data.ax -= Ply2.data.velocity * _dt;
        } else {
          Ply2.data.ax -= Ply2.data.velocity * _dt * 0.05;
        }


        // * COLLISION CHECK AND HANDLING * //

        dist = (Ply1.data.ax + Ply2.data.ax) -
              (Ply1.data.lanceProgress * 20) - (Ply2.data.lanceProgress * 20);

        if (Ply1.lanceReady || Ply2.lanceReady) {
          dist -= 470;
        }

        if (dist < 0 && !this.impact) {
          // Collision

          this.impact = true;

          // calculate forces and victory

          let P1Power = Ply1.data.velocity + (Ply1.data.lanceProgress * 500);
          let P2Power = Ply2.data.velocity + (Ply2.data.lanceProgress * 500);

          p1.emit('impact', new Message('impactHit', { power: P1Power + P2Power, point: 0 }));
          p2.emit('impact', new Message('impactHit', { power: P1Power + P2Power, point: 0 }));

          if (!Ply1.lanceReady && !Ply2.lanceReady) {
            // Draw (no one did anything)

            p1.emit('matchResults', new Message('draw', 'normal'));
            p2.emit('matchResults', new Message('draw', 'normal'));
          } else {
            // if (Ply1.lanceReady) {
            // }

            // if (Ply2.lanceReady) {
            // }

            // Give a bonus to the ones with lances down
            if (Ply1.lanceReady && Ply2.lanceReady) {
              P1Power *= 1.2;
              P2Power *= 1.2;
            } else if (Ply1.lanceReady) {
              P1Power *= 1.2;
            } else if (Ply2.lanceReady) {
              P2Power *= 1.2;
            }

            // calculate winner
              // allow for some fudge in case things are almost a tie
            if (P1Power > P2Power + 20) {
              p1.emit('matchResults', new Message('win', { }));
              p2.emit('matchResults', new Message('loss', { }));

              console.log(`${p1.player.name} has won!`);
            } else if (P2Power > P1Power + 20) {
              p1.emit('matchResults', new Message('loss', { }));
              p2.emit('matchResults', new Message('win', { }));

              console.log(`${p2.player.name} has won!`);
            } else {
              p1.emit('matchResults', new Message('draw', 'equal'));
              p2.emit('matchResults', new Message('draw', 'equal'));

              console.log('The match was a draw.');
            }
          }
        } else if (!this.impact) {
          // Game still running

          p1.emit('matchGameUpdate', new Message('gameUpdate', { p1: Ply1.data, p2: Ply2.data }));
          p2.emit('matchGameUpdate', new Message('gameUpdate', { p1: Ply1.data, p2: Ply2.data }));
        } else {
          // Post game

          this.postTime -= _dt;

          p1.emit('postGameUpdate', new Message('postGameUpdate', { p1: Ply1.data, p2: Ply2.data }));
          p2.emit('postGameUpdate', new Message('postGameUpdate', { p1: Ply1.data, p2: Ply2.data }));

          if (this.postTime < 0) {
            p1.emit('matchEnded');
            p2.emit('matchEnded');

            p1.leave(this.hash);
            p2.leave(this.hash);

            p1.join('lobby');
            p2.join('lobby');

            running = false;
          }
        }


        break;

      case 'preparing':

        this.setupTimer += _dt;

        p1.emit('prepUpdate', new Message('setupTime', this.setupTimer));
        p2.emit('prepUpdate', new Message('setupTime', this.setupTimer));

        if (this.setupTimer > this.maxSetupTimer) {
          this.state = 'inGame';

          // announce match start
          p1.emit('matchStarted', new Message('matchStarted', new Date().getTime()));
          p2.emit('matchStarted', new Message('matchStarted', new Date().getTime()));
        }

        break;

      case 'userLeftGame':

        if (p1 !== undefined) {
          p1.emit('matchResults', new Message('draw', 'userLeft'));
          p1.leave(this.hash);
          p1.join('lobby');
        }
        if (p2 !== undefined) {
          p2.emit('matchResults', new Message('draw', 'userLeft'));
          p2.leave(this.hash);
          p2.join('lobby');
        }

        running = false;

        break;

      default:
      case 'waiting':

        break;

    }

    // return false to say the match hasn't ended
    return running;
  }

  // endMatch(winner, loser) {
//
  // }

}

module.exports = Match;
