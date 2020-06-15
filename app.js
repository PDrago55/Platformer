//---------------------------------------------------A Platformer Game--------------------------------------//

//CREATING A LEVEL PLAN

var simpleLevelPlan = `
......................
..#................#..
..#..............=.#..
..#.........o.o....#..
..#.@......#####...#..
..#####............#..
......#++++++++++++#..
......##############..
......................`;

//CREATING A READABLE LEVEL

class Level {
  constructor(plan) {
    //Trim method used toremove whitespace, remaining string is split on "newLine Characters", each line is then placed in an array//
    let rows = plan
      .trim()
      .split("\n")
      .map((l) => [...l]);
    this.height = rows.length;
    this.width = rows[0].length;
    this.startActors = [];
    this.rows = rows.map((row, y) => {
      return row.map((ch, x) => {
        let type = levelChars[ch];
        if (typeof type == "string") return type;
        this.startActors.push(type.create(new Vec(x, y), ch));
        return "empty";
      });
    });
  }
}

// STATE class is used to track the state of a running Game////
// Status property will switch to lost or won when the game has ended///

class State {
  constructor(level, actors, status) {
    this.level = level;
    this.actors = actors;
    this.status = status;
  }

  static start(level) {
    return new State(level, level.startActors, "playing");
  }

  get player() {
    return this.actors.find((a) => a.type == "player");
  }
}

//type property contains a string that identifies the type of actor
// this will store our two-dimensional values which are position and size of actor
// times method scales a vector by a given number...

class Vec {
  constructor(x, y) {
    this.x = x;
    this.y = y;
  }
  plus(other) {
    return new Vec(this.x + other.x, this.y + other.y);
  }
  times(factor) {
    return new Vec(this.x * factor, this.y * factor);
  }
}

// Creating my Actors [player, coins and lava]///

//PLAYER -- contains a property of speed that stores its current speed to simulate momentum and gravity

class Player {
  constructor(pos, speed) {
    this.pos = pos;
    this.speed = speed;
  }
  get type() {
    return "player";
  }
  static create(pos) {
    return new Player(pos.plus(new Vec(0, -0.5)), new Vec(0, 0));
  }
}
Player.prototype.size = new Vec(0.8, 1.5);

//LAVA -- Lava actions need to 'drip' (reset to original position) and bounce (pos, speed) around inside its walls.

class Lava {
  constructor(pos, speed, reset) {
    this.pos = pos;
    this.speed = speed;
    this.reset = reset;
  }
  get type() {
    return "lava";
  }
  static create(pos, ch) {
    if (ch == "=") {
      // block of lava moving horizontally
      return new Lava(pos, new Vec(2, 0));
    } else if (ch == "|") {
      // vertically moving blobs of lava
      return new Lava(pos, new Vec(0, 2));
    } else if (ch == "v") {
      // dripping lava
      return new Lava(pos, new Vec(0, 3), pos);
    }
  }
}

Lava.prototype.size = new Vec(1, 1);

//Coins -- Coin actions will basically wobble, left and right, this motions will be stored in pos property.

class Coin {
  constructor(pos, basePos, wobble) {
    this.pos = pos;
    this.basePos = basePos;
    this.wobble = wobble;
  }
  get type() {
    return "coin";
  }
  static create(pos) {
    let basePos = pos.plus(new Vec(0.2, 0.1));
    // math.random allows our coins to move at different moments in their "wave"
    return new Coin(basePos, basePos, Math.random() * Math.PI * 2);
  }
}

Coin.prototype.size = new Vec(0.6, 0.6);

//Creating a Monster----//

const monsterSpeed = 4;

class Monster {
  constructor(pos) {
    this.pos = pos;
  }
  get type() {
    return "monster";
  }
  static create(pos) {
    return new Monster(pos.plus(new Vec(0, -1)));
  }
  update(time, state) {
    let player = state.player;
    let speed = (player.pos.x < this.pos.x ? -1 : 1) * time * monsterSpeed;
    let newPos = new Vec(this.pos.x + speed, this.pos.y);
    if (state.level.touches(newPos, this.size, "wall")) return this;
    else return new Monster(newPos);
  }
  collide(state) {
    let player = state.player;
    if (player.pos.y + player.size.y < this.pos.y + 0.05) {
      let filtered = state.actors.filter((a) => a != this);
      return new State(state.level, filtered, state.status);
    } else {
      return new State(state.level, state.actors, "lost");
    }
  }
}

Monster.prototype.size = new Vec(1.2, 2);
// creating our level characters that will sort them as either background grid items or actor classes

const levelChars = {
  ".": "empty",
  "#": "wall",
  "+": "lava",
  "@": Player,
  "o": Coin,
  "=": Lava,
  "|": Lava,
  "v": Lava,
  "M": Monster,
};

// let simpleLevel = new Level(simpleLevelPlan);
// console.log(`${simpleLevel.width} by ${simpleLevel.height}`);

/////////////////////////////////////////////////////////DESIGNING MY LEVEL LAYOUT///////////////////

//Helper Function -- succinct way to create an element and give it some attributes and child Nodes..

function elt(name, attrs, ...children) {
  let dom = document.createElement(name);
  for (let attr of Object.keys(attrs)) {
    dom.setAttribute(attr, attrs[attr]);
  }
  for (let child of children) {
    dom.appendChild(child);
  }
  return dom;
}

// Display class that will hold designs and each level...

class DOMDisplay {
  constructor(parent, level) {
    this.dom = elt("div", { class: "game" }, drawGrid(level));
    // actorLayer will be used to track the element that holds the actors so that they can be easily removed and replaced
    this.actorLayer = null;
    parent.appendChild(this.dom);
  }
  clear() {
    this.dom.remove();
  }
}

// Scaling our background -- we want the actors to travel between grid blocs but if each grid block is only one pixel, the game would be very small..
// We are creating a table with rows and columns and adjusting its size!

const scale = 20;

function drawGrid(level) {
  return elt(
    "table",
    {
      class: "background",
      style: `width: ${level.width * scale}px`,
    },
    ...level.rows.map((row) =>
      elt(
        "tr",
        { style: `height: ${scale}px` },
        ...row.map((type) => elt("td", { class: type }))
      )
    )
  );
}

//-------------Creating my actor Design-------------//

function drawActors(actors) {
  return elt(
    "div",
    {},
    ...actors.map((actor) => {
      let rect = elt("div", { class: `actor ${actor.type}` });
      rect.style.width = `${actor.size.x * scale}px`;
      rect.style.height = `${actor.size.y * scale}px`;
      rect.style.left = `${actor.pos.x * scale}px`;
      rect.style.top = `${actor.pos.y * scale}px`;
      return rect;
    })
  );
}

//--------------using SyncState to contantly redraw my actors----//
//scrollPlayerIntoView is a function that allows the game to always center around the player even when
//the screen is larger/smaller
DOMDisplay.prototype.syncState = function (state) {
  if (this.actorLayer) this.actorLayer.remove();
  this.actorLayer = drawActors(state.actors);
  this.dom.appendChild(this.actorLayer);
  this.dom.className = `game ${state.status}`;
  this.scrollPlayerIntoView(state);
};

DOMDisplay.prototype.scrollPlayerIntoView = function (state) {
  let width = this.dom.clientWidth;
  let height = this.dom.clientHeight;
  let margin = width / 3;

  //viewport//
  let left = this.dom.scrollLeft,
    right = left + width;
  let top = this.dom.scrollTop,
    bottom = top + height;

  let player = state.player;
  let center = player.pos.plus(player.size.times(0.5)).times(scale);
  if (center.x < left + margin) {
    this.dom.scrollLeft = center.x - margin;
  } else if (center.x > right - margin) {
    this.dom.scrollLeft = center.x + margin - width;
  }
  if (center.y < top + margin) {
    this.dom.scrollTop = center.y - margin;
  } else if (center.y > bottom - margin) {
    this.dom.scrollTop = center.y + margin - height;
  }
};

//--------------------Border Boxes and Border Walls--------------//
//math.ceil rounds the # to the highest whole number
// for loops are aimed at finding matching squares in our grid. Squares outside game are held by 'wall'

Level.prototype.touches = function (pos, size, type) {
  var xStart = Math.floor(pos.x);
  var xEnd = Math.ceil(pos.x + size.x);
  var yStart = Math.floor(pos.y);
  var yEnd = Math.ceil(pos.y + size.y);
  for (var y = yStart; y < yEnd; y++) {
    for (var x = xStart; x < xEnd; x++) {
      let isOutside = x < 0 || x >= this.width || y < 0 || y >= this.height;
      let here = isOutside ? "wall" : this.rows[y][x];
      if (here == type) return true;
    }
  }
  return false;
};

//--------------Touching Lava---------------//

//function continually updates an array of all actors in game (lava, player, coin)
// it tracks the keydowns of
State.prototype.update = function (time, keys) {
  let actors = this.actors.map((actor) => actor.update(time, this, keys));
  let newState = new State(this.level, actors, this.status);
  if (newState.status != "playing") return newState;

  let player = newState.player;
  if (this.level.touches(player.pos, player.size, "lava")) {
    return new State(this.level, actors, "lost");
  }
  for (let actor of actors) {
    if (actor != player && overlap(actor, player)) {
      newState = actor.collide(newState);
    }
  }
  return newState;
};

//----------Hitboxes and Overlapping Actors--------------//

// actors are objects and collision is based on position (x,y) and size(x, y)
// if any objects touch, they update the state, could be won or lost from above
function overlap(actor1, actor2) {
  return (
    actor1.pos.x + actor1.size.x > actor2.pos.x &&
    actor1.pos.x < actor2.pos.x + actor2.size.x &&
    actor1.pos.y + actor1.size.y > actor2.pos.y &&
    actor1.pos.y < actor2.pos.y + actor2.size.y
  );
}

Lava.prototype.collide = function (state) {
  return new State(state.level, state.actors, "lost");
};

Coin.prototype.collide = function (state) {
  let filtered = state.actors.filter((a) => a != this);
  let status = state.status;
  if (!filtered.some((a) => a.type == "coin")) status = "won";
  return new State(state.level, filtered, status);
};

//---------------------Lava, Actor Updates------------------//
// if no object blocks the lavas path, it will go there
//dripping laval has a reset value while bouncing lava moves back and
//forth in opposite directions (this.speed.times(-1))
Lava.prototype.update = function (time, state) {
  let newPos = this.pos.plus(this.speed.times(time));
  if (!state.level.touches(newPos, this.size, "wall")) {
    return new Lava(newPos, this.speed, this.reset);
  } else if (this.reset) {
    return new Lava(this.reset, this.speed, this.reset);
  } else {
    return new Lava(this.pos, this.speed.times(-1));
  }
};

//---------------------Coins, Actor Updates-----------------//
// coins need not move, they wobble wobble

const wobbleSpeed = 8,
  wobbleDist = 0.07;

Coin.prototype.update = function (time) {
  let wobble = this.wobble + time * wobbleSpeed;
  let wobblePos = Math.sin(wobble) * wobbleDist;
  return new Coin(
    this.basePos.plus(new Vec(0, wobblePos)),
    this.basePos,
    wobble
  );
};

//---------------------Player, Actor Updates-----------------//

const playerXSpeed = 7;
const gravity = 30;
const jumpSpeed = 17;

Player.prototype.update = function (time, state, keys) {
  let xSpeed = 0;
  if (keys.ArrowLeft) xSpeed -= playerXSpeed;
  if (keys.ArrowRight) xSpeed += playerXSpeed;
  let pos = this.pos;
  let movedX = pos.plus(new Vec(xSpeed * time, 0));
  //move in all cases where we do not touch a wall...
  if (!state.level.touches(movedX, this.size, "wall")) {
    pos = movedX;
  }
  let ySpeed = this.speed.y + time * gravity;
  let movedY = pos.plus(new Vec(0, ySpeed * time));
  if (!state.level.touches(movedY, this.size, "wall")) {
    pos = movedY;
  } else if (keys.ArrowUp && ySpeed > 0) {
    ySpeed = -jumpSpeed;
  } else {
    ySpeed = 0;
  }
  return new Player(pos, new Vec(xSpeed, ySpeed));
};

//---------------------Tracking Keys-----------------//
// this function accepts key names in an array and tracks their positions
// it monitors if any keys are pressed down, if true, it tracks
function trackKeys(keys) {
  let down = Object.create(null);
  function track(event) {
    if (keys.includes(event.key)) {
      down[event.key] = event.type == "keydown";
      event.preventDefault();
    }
  }
  window.addEventListener("keydown", track);
  window.addEventListener("keyup", track);
  return down;
}

const arrowKeys = trackKeys(["ArrowLeft", "ArrowRight", "ArrowUp"]);

//---------------------Running The Game, Helper Function-----------------//
// requestAnimationFrame animates the game, but it would need to be called every second, for every frame..
// with this helper, we call requestAnimationFrame once and draws a single frame

function runAnimation(frameFunc) {
  let lastTime = null;
  function frame(time) {
    if (lastTime != null) {
      let timeStep = Math.min(time - lastTime, 100) / 1000;
      //when frame return the value false, the animation stops..
      if (frameFunc(timeStep) === false) return;
    }
    lastTime = time;
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

//---------------------Running The Game, runLevel Function-----------------//

function runLevel(level, Display) {
  let display = new Display(document.body, level);
  let state = State.start(level);
  let ending = 1;
  return new Promise((resolve) => {
    runAnimation((time) => {
      state = state.update(time, arrowKeys);
      display.syncState(state);
      if (state.status == "playing") {
        return true;
      } else if (ending > 0) {
        ending -= time;
        return true;
      } else {
        display.clear();
        resolve(state.status);
        return false;
      }
    });
  });
}

//added a lives count

async function runGame(plans, Display) {
  let lives = 3; 
  for (let level = 0; level < plans.length && lives > 0;) {
    let status = await runLevel(new Level(plans[level]), Display);
    if (status == "won") level++
    else lives--
  }
  if (lives > 0) {
    console.log("you win!")
  } else {
    console.log("game over")
  }
}
