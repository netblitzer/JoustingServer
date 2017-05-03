class Player {

  constructor(_name, _hash) {
    this.name = _name;
    this.hash = _hash;

    this.curRoom = undefined;
    this.inMatch = false;

    this.pos = {
      x: 0,
      y: 0,
    };
    this.velocity = 0;
    this.acceleration = 0;
    this.direction = 'right';

    this.input = {
      boosting: false,
      charging: false,
      shield: false,
    };

    this.shieldUp = false;
    this.lanceDown = false;

    this.lanceDropProgress = 0;
    this.lanceProgress = 0;
    this.boostProgress = 0;
  }

  reset() {
    this.pos = {
      x: 0,
      y: 0,
    };
    this.velocity = 0;
    this.acceleration = 0;

    this.movement = {
      boosting: false,
      charging: false,
      shield: false,
    };

    this.shieldUp = false;
    this.lanceDown = false;

    this.lanceDropProgress = 0;
    this.lanceProgress = 0;
    this.boostProgress = 0;
  }

}

module.exports = Player;
