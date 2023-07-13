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