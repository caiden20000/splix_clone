"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const ws_1 = require("ws");
const http_1 = __importDefault(require("http"));
const uuid_1 = require("uuid");
const fs = __importStar(require("node:fs/promises"));
function returnFile(res, contentType, path) {
    fs.readFile(__dirname + path)
        .then(contents => {
        res.setHeader("Content-Type", contentType);
        res.writeHead(200);
        res.end(contents); // Pass in the text/html here
    }).catch(err => {
        res.writeHead(500);
        res.end(err);
        return;
    });
}
function requestListener(req, res) {
    if (req.url == "/index") {
        returnFile(res, "text/html", "/index.html");
    }
    else if (req.url == "/script.js") {
        returnFile(res, "text/javascript", "/script.js");
    }
    else if (req.url == "/style.css") {
        returnFile(res, "text/css", "/style.css");
    }
    else {
        res.writeHead(404);
        res.end("Content not found.");
    }
}
const server = http_1.default.createServer(requestListener);
const wsServer = new ws_1.WebSocketServer({ server });
const port = 8000;
server.listen(port, () => {
    console.log(`WebSocket server is running on port ${port}`);
});
// Represent map with an array of PlayerAreas
// 0,0 is bottommost leftestmost, like quadrant 1 of cartesian plane
var map = [];
const mapWidth = 100;
const mapHeight = 100;
function rectify(area) {
    let point1 = area.bottomLeft;
    let point2 = area.topRight;
    let lowY, highY, lowX, highX;
    lowX = point1.x < point2.x ? point1.x : point2.x;
    lowY = point1.y < point2.y ? point1.y : point2.y;
    highX = point1.x > point2.x ? point1.x : point2.x;
    highY = point1.y > point2.y ? point1.y : point2.y;
    let bottomLeft = { x: lowX, y: lowY };
    let topRight = { x: highX, y: highY };
    return { bottomLeft: bottomLeft, topRight: topRight, uuid: area.uuid, color: area.color };
}
function getPointsFromArea(area) {
    let points = [];
    points.push({ x: area.bottomLeft.x, y: area.bottomLeft.y });
    points.push({ x: area.bottomLeft.x, y: area.topRight.y });
    points.push({ x: area.topRight.x, y: area.bottomLeft.y });
    points.push({ x: area.topRight.x, y: area.topRight.y });
    return points;
}
// Returns true if one area overlaps the other
function doAreasOverlap(area1, area2) {
    // There is certainly simpler code, but I figured that there will always be 
    // a corner of one area inside another area if the overlap, so I check that here.
    // TODO: fix this with the correct string of if statements so it's efficient.
    let area1Points = getPointsFromArea(area1);
    let area2Points = getPointsFromArea(area2);
    for (let point of area1Points) {
        if (isPointInArea(point, area2))
            return true;
    }
    for (let point of area2Points) {
        if (isPointInArea(point, area1))
            return true;
    }
    return false;
}
// Returns an array of areas that cover the same space as (positive - negative) area
function subtractAreaFromArea(positive, negative) {
    return []; // TODO
}
// Returns an array of areas that are consolodated to not have overlapping areas
function simplifyAreas(areas) {
    return []; // TODO
}
function isPointInArea(point, area) {
    if (area.bottomLeft.x <= point.x && area.bottomLeft.y <= point.y
        && area.topRight.x >= point.x && area.topRight.y >= point.y) {
        return true;
    }
    return false;
}
function getMapValueAt(point) {
    for (let area of map) {
        let result = isPointInArea(point, area);
        if (result == true)
            return area.uuid;
    }
    return null;
}
// Units per second
const playerSpeed = 2;
var players = new Map();
var clients = new Map();
function addClient(uuid, con) {
    clients.set(uuid, con);
}
function removeClient(uuid) {
    return clients.delete(uuid);
}
wsServer.on("connection", (ws) => {
    let userID = (0, uuid_1.v4)();
    addClient(userID, ws);
    console.log("Connection opened. User added. " + userID);
    ws.on("message", event => {
        try {
            let msg = JSON.parse(event.toString());
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
        }
        catch (err) {
            console.log("Received NON-JSON message: " + event);
        }
    });
    ws.on("error", event => {
        console.log("Error: " + event);
    });
    ws.on("close", event => {
        console.log("Connection closed. User removed. " + userID);
        removeClient(userID);
    });
});
function positionResponse(uuid) {
    let ws = clients.get(uuid);
    if (ws == undefined)
        return false;
    let playerList = [];
    for (let player of players.values()) {
        playerList.push({
            uuid: player.uuid,
            name: player.name,
            color: player.color,
            x: player.pos.x,
            y: player.pos.y,
        });
    }
    ws.send(JSON.stringify(playerList));
}
// Random int, inclusive
function r(min, max) {
    return Math.round(Math.random() * (max - min) + min);
}
// Won't give a position [buffer] units close to the edge of the map.
function randomPosInMap(buffer = 10) {
    return { x: r(buffer, mapWidth - buffer), y: r(buffer, mapHeight - buffer) };
}
function initGameForPlayer(uuid, name = "Player", color = "00FF00", facing = "right") {
    let player = {
        uuid: uuid,
        pos: randomPosInMap(10),
        name: name,
        color: color,
        facing: facing
    };
    let playerInitArea = {
        uuid: uuid,
        color: color,
        bottomLeft: { x: player.pos.x - 1, y: player.pos.y - 1 },
        topRight: { x: player.pos.x + 1, y: player.pos.y + 1 },
    };
    players.set(uuid, player);
    map.push(playerInitArea);
}
function updatePlayer(player, dt) {
    if (player.facing == "up")
        player.pos.y += playerSpeed * dt;
    if (player.facing == "down")
        player.pos.y -= playerSpeed * dt;
    if (player.facing == "right")
        player.pos.x += playerSpeed * dt;
    if (player.facing == "left")
        player.pos.x -= playerSpeed * dt;
}
var lastTime = Date.now();
function gameLoop() {
    let time = Date.now();
    let dt = time - lastTime;
    for (let player of players.values())
        updatePlayer(player, dt);
    lastTime = time;
}
setInterval(() => {
    gameLoop();
}, 20);
