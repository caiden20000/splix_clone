The server is where the game takes place. The only options players have is when to turn their character.

Currently there will be no lag/ping compensation, but that may change.

# Client to Server Requests
The requests between client and server will be simple:
### Position Request
- Client requests to verify the position of the current player.
- Server responds with a Position Response.
### Turn Request
- Client requests to turn either left or right.
- The server responds with a Position Response with an updated direction.
### Map Request
- Client is loading parts of the map and needs to request it.
- Server replies with a Map response.

# Server to Client Responses
### Position Response
- Server responds with the position and direction of the client's player, and all other players in the area.
- Server will respond with the position and direction of every player in a certain radius around the player.
### Map Response
- Server responds with an array of rects, each with a player assigned, for that designated requested area.
### Lose Response
- Server notifies the client that the player has lost.