import { WebSocket, WebSocketServer } from 'ws';
import http, { ClientRequest, IncomingMessage, RequestListener, ServerResponse } from 'http';
import { v4 as uuidv4 } from 'uuid';
import * as fs from 'node:fs/promises';

function requestListener(req: IncomingMessage, res: ServerResponse) {
  if (req.url == "/index") {
    fs.readFile(__dirname + "/index.html")
      .then(contents => {
      res.setHeader("Content-Type", "text/html");
      res.writeHead(200);
      res.end(contents);  // Pass in the text/html here
    }).catch(err => {
      res.writeHead(500);
      res.end(err);
      return;
    });
  } else {
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
  direction: "left" | "right";
} | {
  requestType: "map";
  xPos: number;
  yPos: number;
}

type Player = {
  uuid: string;
  xPos: number;
  yPos: number;
  facing: "left" | "right" | "up" | "down";
}

type PlayerTrail = {
  playerUuid: string;
  trail: {xPos: number, yPos: number}[];
}

// Represent map by every individual square containing UUID of player who owns it.
// Alternate method: Represent by many rects, consolodate redundant rects.
// First one is easier to understand at first tho so that one's first.
var map: string[][] = [];
const mapWidth = 100;
const mapHeight = 100;
function initMap() {
  fillRect(0, 0, mapWidth, mapHeight, "0");
}

function fillRect(xPos: number, yPos: number, width: number, height: number, uuid: string) {
  for (let x = xPos; x<xPos+width; x++) {
    for (let y = yPos; y<yPos+height; y++) {
      map[x][y] = uuid;
    }
  }
}

function getMapSquareAt(xPos: number, yPos: number): string {
  return map[xPos][yPos];
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
    console.log("Received message: " + event)
  })

  ws.on("error", event => {
    console.log("Error: " + event);
  })

  ws.on("close", event => {
    console.log("Connection closed. User removed. " + userID);
    removeClient(userID);
  })
})