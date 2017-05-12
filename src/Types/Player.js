class Player {

  constructor(_name, _hash) {
    this.name = _name;
    this.hash = _hash;

    this.curRoom = undefined;
    this.inMatch = false;

    this.data = {
      ax: 5000,
      bx: 5000,
      cx: 5000,
      velocity: 0,

      lanceDropProgress: 0,
      lanceProgress: 0,
      boostProgress: 0,
      boosting: false,

      animation: 'standing',
      falling: false,
      shieldUp: false,
      lanceDown: false,

    };

    this.lanceReady = false;
    this.lanceState = 'ready';
    this.lanceCharge = 0;
    this.lanceHoldTime = 0;


    this.maxSpeed = 1000;
    this.minSpeed = 250;

    this.acceleratingTime = 0;
    this.acceleratingTotalTime = 0.5;

    this.input = {
      boost: false,
      lance: false,
      shield: false,
    };
  }

  reset() {
    this.data = {
      ax: 5000,
      bx: 5000,
      cx: 5000,
      velocity: 0,
      lanceDropProgress: 0,
      lanceProgress: 0,
      boostProgress: 0,
      animation: 'standing',
      falling: false,
      shieldUp: false,
      lanceDown: false,
    };

    this.lanceReady = false;
    this.lanceState = 'ready';
    this.lanceCharge = 0;
    this.lanceHoldTime = 0;


    this.acceleratingTime = 1;

    this.movement = {
      boost: false,
      lance: false,
      shield: false,
    };
  }

}

module.exports = Player;
