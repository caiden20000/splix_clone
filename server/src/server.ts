import { WebSocket, WebSocketServer } from 'ws';
import http, { ClientRequest, IncomingMessage, RequestListener, ServerResponse } from 'http';
import { v4 as uuidv4 } from 'uuid';
import * as fs from 'node:fs/promises';
import { json } from 'stream/consumers';

function returnFile(res: ServerResponse, contentType: string, path:  string) {
  fs.readFile(__dirname + path)
    .then(contents => {
    res.setHeader("Content-Type", contentType);
    res.writeHead(200);
    res.end(contents);  // Pass in the text/html here
  }).catch(err => {
    res.writeHead(500);
    res.end(err);
    return;
  });
}

function requestListener(req: IncomingMessage, res: ServerResponse) {
  if (req.url == "/index") {
    returnFile(res, "text/html", "/index.html");
  } 
  else if (req.url == "/index/script.js") {
    returnFile(res, "text/javascript", "/script.js");
  }
  else if (req.url == "/index/style.css") {
    returnFile(res, "text/css", "/style.css");
  }
  else {
    res.writeHead(404);
    res.end("Content not found.")
  }
}

const server = http.createServer(requestListener);
const wsServer = new WebSocketServer({ server });
const port = 8000;
server.listen(port, () => {
  console.log(`WebSocket server is running on port ${port}`);
});

type Client = {
  uuid: string,
  con: WebSocket
}

// Position requests: Asking for position of player.
// Turning requests: Trying to change direction of character.
// Map requests: Asks for a chunk of the map  to display.
type GameMessage = {
  requestType: "position";
} | {
  requestType: "turning";
  direction: string; //"left" | "right" | "straight";
} | {
  requestType: "map";
  pos: Point;
  // TODO
}

type Point = {
  x: number;
  y: number;
}

type Player = {
  uuid: string;
  pos: Point;
  color: string;
  name: string;
  facing: string; // "left" | "right" | "up" | "down";
}

type PlayerTrail = {
  uuid: string; // Player uuid
  trail: Point[]; // Every square the player traveled through outside their area.
}

type PlayerArea = {
  uuid: string; // Player uuid
  bottomLeft: Point;
  topRight: Point;
  color: string;
}

// Represent map with an array of PlayerAreas
// 0,0 is bottommost leftestmost, like quadrant 1 of cartesian plane
var map: PlayerArea[] = [];
const mapWidth = 100;
const mapHeight = 100;

function rectify(area: PlayerArea): PlayerArea {
  let point1 = area.bottomLeft;
  let point2 = area.topRight;
  let lowY, highY, lowX, highX;
  lowX = point1.x < point2.x ? point1.x : point2.x;
  lowY = point1.y < point2.y ? point1.y : point2.y;
  highX = point1.x > point2.x ? point1.x : point2.x;
  highY = point1.y > point2.y ? point1.y : point2.y;
  let bottomLeft: Point = {x: lowX, y: lowY};
  let topRight: Point = {x: highX, y: highY};
  return {bottomLeft: bottomLeft, topRight: topRight, uuid: area.uuid, color: area.color};
}

function getPointsFromArea(area: PlayerArea): Point[] {
  let points: Point[] = [];
  points.push({x: area.bottomLeft.x, y: area.bottomLeft.y});
  points.push({x: area.bottomLeft.x, y: area.topRight.y});
  points.push({x: area.topRight.x, y: area.bottomLeft.y});
  points.push({x: area.topRight.x, y: area.topRight.y});
  return points;
}

// Returns true if one area overlaps the other
function doAreasOverlap(area1: PlayerArea, area2: PlayerArea): boolean {
  // There is certainly simpler code, but I figured that there will always be 
  // a corner of one area inside another area if the overlap, so I check that here.
  // TODO: fix this with the correct string of if statements so it's efficient.
  let area1Points = getPointsFromArea(area1);
  let area2Points = getPointsFromArea(area2);
  for (let point of area1Points) {
    if (isPointInArea(point, area2)) return true;
  }

  for (let point of area2Points) {
    if (isPointInArea(point, area1)) return true;
  }

  return false;
}

// Returns an array of areas that cover the same space as (positive - negative) area
function subtractAreaFromArea(positive: PlayerArea, negative: PlayerArea): PlayerArea[] {
  return []; // TODO
}

// Returns an array of areas that are consolodated to not have overlapping areas
function simplifyAreas(areas: PlayerArea[]): PlayerArea[] {
  return []; // TODO
}

function isPointInArea(point: Point, area: PlayerArea): boolean {
  if (area.bottomLeft.x <= point.x && area.bottomLeft.y <= point.y 
    && area.topRight.x >= point.x && area.topRight.y >= point.y) {
      return true;
    }
  return false;
}

function getMapValueAt(point: Point): string | null {
  for (let area of map) {
    let result = isPointInArea(point, area);
    if (result == true) return area.uuid;
  }
  return null;
}

// Units per second
const playerSpeed = 2;
var players = new Map<string, Player>();
var clients = new Map<string, WebSocket>();


function addClient(uuid: string, con: WebSocket): void {
  clients.set(uuid, con);
}

function removeClient(uuid: string): boolean {
  return clients.delete(uuid);
}

wsServer.on("connection", (ws: WebSocket) => {
  let userID = uuidv4();
  addClient(userID, ws);
  console.log("Connection opened. User added. " + userID)

  ws.on("message", event => {
    try {
      let msg: GameMessage = JSON.parse(event.toString());
      if (msg.requestType == "position") {
        positionResponse(userID);
      }
      else if (msg.requestType == "turning") {
        // TODO: Determine if allowed to turn
        // then EDIT the player data before returning positions.
        positionResponse(userID);
      }
      else if (msg.requestType == "map") {
        // Map response here
      }
    } catch (err) {
      console.log("Received NON-JSON message: " + event)
    }
  })

  ws.on("error", event => {
    console.log("Error: " + event);
  })

  ws.on("close", event => {
    console.log("Connection closed. User removed. " + userID);
    removeClient(userID);
  })
})

function positionResponse(uuid: string) {
  let ws = clients.get(uuid);
  if (ws == undefined) return false;

  let playerList = [];
  for (let player of players.values()) {
    playerList.push({
      uuid: player.uuid,
      name: player.name,
      color: player.color,
      x: player.pos.x,
      y: player.pos.y,
    })
  }
  ws.send(JSON.stringify(playerList));
}

// Random int, inclusive
function r(min: number, max: number): number {
  return Math.round(Math.random()*(max-min)+min);
}

// Won't give a position [buffer] units close to the edge of the map.
function randomPosInMap(buffer: number = 10): Point {
  return {x: r(buffer, mapWidth - buffer), y: r(buffer, mapHeight - buffer)};
}

function initGameForPlayer(uuid: string, name="Player", color: string = "00FF00", facing: string = "right") {
  let player = {
    uuid: uuid,
    pos: randomPosInMap(10),
    name: name,
    color: color,
    facing: facing
  };
  let playerInitArea: PlayerArea = {
    uuid: uuid,
    color: color,
    bottomLeft: {x: player.pos.x - 1, y: player.pos.y - 1},
    topRight: {x: player.pos.x + 1, y: player.pos.y + 1},
  }
  players.set(uuid, player);
  map.push(playerInitArea);
}

function updatePlayer(player: Player, dt: number) {
  if (player.facing == "up") player.pos.y += playerSpeed * dt;
  if (player.facing == "down") player.pos.y -= playerSpeed * dt;
  if (player.facing == "right") player.pos.x += playerSpeed * dt;
  if (player.facing == "left") player.pos.x -= playerSpeed * dt;
}

var lastTime = Date.now();

function gameLoop() {
  let time = Date.now();
  let dt = time - lastTime;

  for (let player of players.values()) updatePlayer(player, dt);

  lastTime = time;
}

setInterval(() => {
  gameLoop();
}, 20);