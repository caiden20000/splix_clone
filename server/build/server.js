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
function requestListener(req, res) {
    if (req.url == "/index") {
        fs.readFile(__dirname + "/index.html")
            .then(contents => {
            res.setHeader("Content-Type", "text/html");
            res.writeHead(200);
            res.end(contents); // Pass in the text/html here
        }).catch(err => {
            res.writeHead(500);
            res.end(err);
            return;
        });
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
var clients = new Map();
function addClient(uuid, con) {
    clients.set(uuid, con);
}
function removeClient(uuid) {
    return clients.delete(uuid);
}
wsServer.on("connection", (ws) => {
    let userID = (0, uuid_1.v4)();
    console.log("Received connection.");
    ws.on("open", () => {
        addClient(userID, ws);
        console.log("Connection opened. User added. " + userID);
    });
    ws.on("message", event => {
        console.log("Received message: " + event);
    });
    ws.on("error", event => {
        console.log("Error: " + event);
    });
    ws.on("close", event => {
        console.log("Connection closed. User removed. " + userID);
        removeClient(userID);
    });
});
