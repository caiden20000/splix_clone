let hostname = window.location.hostname;
const ws = new WebSocket("wss://" + hostname)
ws.addEventListener("open", (event) => {
    ws.send("Messaeaage");
})

const canvasElement = <HTMLCanvasElement>document.getElementById("canvas");
const ctx = <CanvasRenderingContext2D>canvasElement.getContext("2d");

const canvasWidth = 400;
const canvasHeight = 400;
canvasElement.setAttribute('width', `${canvasWidth}`);
canvasElement.setAttribute('height', `${canvasHeight}`);

class Point {
    x;
    y;
    constructor(x: number, y: number) {
        this.x = x;
        this.y = y;
    }

    floor() {
        this.x = Math.floor(this.x);
        this.y = Math.floor(this.y);
    }

    ceil() {
        this.x = Math.ceil(this.x);
        this.y = Math.ceil(this.y);
    }
}

function clamp(min: number, max: number, num: number) {
    return Math.max(min, Math.min(max, num));
}

class Color {
    hex: string;
    prevFill: string | CanvasGradient | CanvasPattern;
    prevStroke: string | CanvasGradient | CanvasPattern;
    constructor(hex: string) {
        this.hex = hex;
        this.prevFill = "";
        this.prevStroke = "";
    }

    multiply(multiplier: number) {
        let digits = this.hex.split("");
        let r = parseInt(digits[0] + digits[1], 16);
        let g = parseInt(digits[2] + digits[3], 16);
        let b = parseInt(digits[4] + digits[5], 16);
        r = clamp(0, 255, r * multiplier);
        g = clamp(0, 255, g * multiplier);
        b = clamp(0, 255, b * multiplier);
        let rs = Math.round(r).toString(16);
        let gs = Math.round(g).toString(16);
        let bs = Math.round(b).toString(16);
        if (rs.length == 1) rs = "0" + rs;
        if (gs.length == 1) gs = "0" + gs;
        if (bs.length == 1) bs = "0" + bs;
        let result = rs + gs + bs;
        return result;
    }

    static RED() { return new Color("FF0000"); }
    static GREEN() { return new Color("00FF00"); }
    static BLUE() { return new Color("0000FF"); }
    static PURPLE() { return new Color("FF00FF"); }
    static YELLOW() { return new Color("FFFF00"); }
    static CYAN() { return new Color("00FFFF"); }
    static BLACK() { return new Color("000000"); }
    static WHITE() { return new Color("FFFFFF"); }
    static ORANGE() { return new Color("FF9900"); }
    static MINT() { return new Color("00FF99"); }
    static LIME() { return new Color("99FF00"); }
    static PINK() { return new Color("FF99DD"); }

    setAsFill(ctx: CanvasRenderingContext2D) {
        this.prevFill = ctx.fillStyle;
        ctx.fillStyle = '#' + this.hex;
    }

    setAsStroke(ctx: CanvasRenderingContext2D) {
        this.prevStroke = ctx.strokeStyle;
        ctx.strokeStyle = '#' + this.hex;
    }

    restoreFill(ctx: CanvasRenderingContext2D) {
        ctx.fillStyle = this.prevFill;
    }

    restoreStroke(ctx: CanvasRenderingContext2D) {
        ctx.strokeStyle = this.prevStroke;
    }

    setAsColor(ctx: CanvasRenderingContext2D) {
        this.setAsFill(ctx);
        this.setAsStroke(ctx);
    }

    restore(ctx: CanvasRenderingContext2D) {
        this.restoreFill(ctx);
        this.restoreStroke(ctx);
    }
}

class Rect {
    bottomLeft;
    topRight;
    color;
    constructor(bottomLeft: Point, topRight: Point) {
        this.bottomLeft = bottomLeft;
        this.topRight = topRight;
        this.color = new Color("FF0000");
    }

    // Makes sure bottomLeft is bottommost leftmost, etc
    rectify() {
        let p1 = this.bottomLeft;
        let p2 = this.topRight;
        let lowY, highY, lowX, highX;
        lowX = p1.x < p2.x ? p1.x : p2.x;
        lowY = p1.y < p2.y ? p1.y : p2.y;
        highX = p1.x > p2.x ? p1.x : p2.x;
        highY = p1.y > p2.y ? p1.y : p2.y;
        this.bottomLeft = new Point(lowX, lowY);
        this.topRight = new Point(highX, highY);
    }

    // In screen space, y is reversed
    screenRectify() {
        let p1 = this.bottomLeft;
        let p2 = this.topRight;
        let lowY, highY, lowX, highX;
        lowX = p1.x < p2.x ? p1.x : p2.x;
        lowY = p1.y < p2.y ? p1.y : p2.y;
        highX = p1.x > p2.x ? p1.x : p2.x;
        highY = p1.y > p2.y ? p1.y : p2.y;
        this.bottomLeft = new Point(lowX, highY);
        this.topRight = new Point(highX, lowY);
    }

    draw(ctx: CanvasRenderingContext2D) {
        let width = this.topRight.x - this.bottomLeft.x;
        let height = this.topRight.y - this.bottomLeft.y;
        this.color.setAsColor(ctx);
        ctx.fillRect(this.bottomLeft.x, this.bottomLeft.y, width, height);
        this.color.restore(ctx);
    }

    drawOnMap(ctx: CanvasRenderingContext2D, map: GameMap) {
        let mapRect = map.rectMapToScreen(this);
        let bl = mapRect.bottomLeft;
        let tr = mapRect.topRight;
        let width = tr.x - bl.x;
        let height = tr.y - bl.y;
        this.color.setAsColor(ctx);
        ctx.fillRect(bl.x, bl.y, width, height);
        this.color.restore(ctx);
    }
}

class PlayerArea extends Rect {
    name: string;
    color: Color;
    constructor(bottomLeft: Point, topRight: Point, name: string, color: Color) {
        super(bottomLeft, topRight);
        this.name = name;
        this.color = color;
    }
}

class GameMap {
    rects: Rect[];
    cameraPosition: Point;
    viewSize: number;
    constructor() {
        // List of rects to draw on screen
        this.rects = [];
        // Position of the camera on the map in map coords
        // Represents bottom left of camera
        this.cameraPosition = new Point(0, 0);
        // # of pixels per map unit
        this.viewSize = 25;
    }

    addRect(rect: Rect) {
        this.rects.push(rect);
    }

    // Takes in a map coordinate
    // Returns a coordinate in screen space
    mapToScreen(point: Point) {
        let x = point.x;
        let y = point.y;
        // Camera position
        x -= this.cameraPosition.x;
        y -= this.cameraPosition.y;
        // View size
        x *= this.viewSize;
        y *= this.viewSize;
        // Q1 to inverted (cartesian to screen)
        return new Point(x, canvasHeight - y);
    }

    rectMapToScreen(rect: Rect) {
        let bl = this.mapToScreen(rect.bottomLeft);
        let tr = this.mapToScreen(rect.topRight);
        let newRect = new Rect(bl, tr);
        newRect.screenRectify();
        return newRect;
    }

    rectScreenToMap(rect: Rect) {
        let bl = this.screenToMap(rect.bottomLeft);
        let tr = this.screenToMap(rect.topRight);
        let newRect = new Rect(bl, tr);
        newRect.rectify();
        return newRect;
    }

    screenToMap(point: Point) {
        let x = point.x;
        let y = point.y;
        y = canvasHeight - y;
        // View size
        x /= this.viewSize;
        y /= this.viewSize;
        // Camera position
        x += this.cameraPosition.x;
        y += this.cameraPosition.y;
        return new Point(x, y);
    }

    draw(ctx: CanvasRenderingContext2D) {
        for (let rect of this.rects) {
            rect.drawOnMap(ctx, this);
        }
    }

    // Returns a rect in map space that covers the entire canvas
    getVisibleArea(): Rect {
        let screenVisibleRect = new Rect(new Point(0, 0), new Point(canvasWidth, canvasHeight));
        let mapVisibleRect = this.rectScreenToMap(screenVisibleRect);
        mapVisibleRect.bottomLeft.floor();
        mapVisibleRect.topRight.ceil();
        return mapVisibleRect;
    }

    drawGrid(ctx: CanvasRenderingContext2D, lineWidth = 1, color = new Color("555555")) {
        let vis = this.getVisibleArea();
        let sRect = this.rectMapToScreen(vis);
        let blScreen = sRect.bottomLeft;
        let trScreen = sRect.topRight;
        color.setAsColor(ctx);
        for (let x=vis.bottomLeft.x; x<vis.topRight.x+1; x++) {
            let top = trScreen.y;
            let height = blScreen.y - top;
            let movingPoint = this.mapToScreen(new Point(x, 0));
            ctx.fillRect(movingPoint.x - (lineWidth/2), top, lineWidth, height);
        }

        for (let y=vis.bottomLeft.y; y<vis.topRight.y+1; y++) {
            let left = blScreen.x;
            let width = trScreen.x - left;
            let movingPoint = this.mapToScreen(new Point(0, y));
            ctx.fillRect(left, movingPoint.y - (lineWidth/2), width, lineWidth);
        }

        color.restore(ctx);
    }
}

function clearCanvas() {
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);
}

type Direction = "up" | "down" | "left" | "right";

class Player {
    direction: Direction;
    queuedDirection: Direction;
    position: Point;
    color: Color;
    // Speed = map units per second
    speed: number;
    name: string;
    constructor(position: Point, speed: number, name: string = "TestPlayer", direction: Direction = "up") {
        this.position = position;
        this.direction = direction;
        this.queuedDirection = direction;
        this.color = Color.GREEN();
        this.speed = speed;
        this.name = name;
    }

    setState(position: Point, direction: Direction) {
        this.position = position;
        this.direction = direction;
    }

    legalDirection(dir: string) {
        return ["up", "down", "left", "right"].includes(dir);
    }

    turnLeft() {
        if (this.direction == "up") this.direction = "left";
        else if (this.direction == "left") this.direction = "down";
        else if (this.direction == "down") this.direction = "right";
        else if (this.direction == "right") this.direction = "up";
    }

    turnRight() {
        if (this.direction == "up") this.direction = "right";
        else if (this.direction == "right") this.direction = "down";
        else if (this.direction == "down") this.direction = "left";
        else if (this.direction == "left") this.direction = "up";
    }

    getOppositeDirection(dir: Direction) {
        if (dir == "up") return "down";
        if (dir == "down") return "up";
        if (dir == "left") return "right";
        if (dir == "right") return "left";
    }

    turn(dir: Direction) {
        if (this.direction == this.getOppositeDirection(dir)) return;
        this.direction = dir;
        this.adjustPosition();
    }

    // dt in seconds
    move(dt: number) {
        if (this.direction == "up") this.position.y += this.speed * dt;
        if (this.direction == "down") this.position.y -= this.speed * dt;
        if (this.direction == "right") this.position.x += this.speed * dt;
        if (this.direction == "left") this.position.x -= this.speed * dt;
    }

    adjustPosition() {
        if (this.direction == "up" || this.direction == "down") {
            // Center horizontally
            this.position.x = Math.round(this.position.x);
        }
        if (this.direction == "left" || this.direction == "right") {
            // Center vertically
            this.position.y = Math.round(this.position.y);
        }
    }

    queueDirection(dir: Direction) {
        if (dir == this.direction || !this.legalDirection(dir)) return;
        this.queuedDirection = dir;
    }

    updateQueuedDirection() {
        let turnTolerance = 0.2;
        if (this.queuedDirection != this.direction) {
            let dist = 1;
            if (this.queuedDirection == "up" || this.queuedDirection == "down") {
                dist = Math.abs(Math.round(this.position.x) - this.position.x);
            }
            if (this.queuedDirection == "left" || this.queuedDirection == "right") {
                dist = Math.abs(Math.round(this.position.y) - this.position.y);
            }
            if (dist <= turnTolerance) this.turn(this.queuedDirection);
        }
    }

    drawOnMap(ctx: CanvasRenderingContext2D, map: GameMap, scale=0.8) {
        let screenPos = map.mapToScreen(this.position);
        let size = map.viewSize * scale;
        ctx.beginPath();
        ctx.arc(screenPos.x + (map.viewSize/2), 
            screenPos.y - (map.viewSize/2), size/2, 0, 2 * Math.PI);
        this.color.setAsColor(ctx);
        ctx.fill();
        this.color.restore(ctx);
        let darker = new Color(this.color.multiply(0.75));
        darker.setAsColor(ctx);
        ctx.lineWidth = 2;
        ctx.stroke();
        darker.restore(ctx);
    }
}

var mainPlayer: Player;
mainPlayer = new Player(new Point(6, 2), 3);
var players: Player[] = [];
let lastTime = Date.now();

function updatePlayers() {
    let time = Date.now();
    // Delta Time in seconds
    let dt = (time - lastTime) / 1000;
    for (let player of players) {
        player.move(dt);
        player.updateQueuedDirection();
    }
    lastTime = time;
}

// Testing area
let m1 = new GameMap();
m1.drawGrid(ctx);
let r1 = new Rect(new Point(5, 5), new Point(10, 10));
r1.color = Color.BLUE();
let r2 = new Rect(new Point(5, 12), new Point(12, 15));
r2.color = Color.GREEN();
players.push(mainPlayer);
setInterval(() => {
    //m1.cameraPosition.x += 0.1;
    clearCanvas();
    m1.drawGrid(ctx);
    r1.drawOnMap(ctx, m1);
    r2.drawOnMap(ctx, m1);
    mainPlayer.drawOnMap(ctx, m1);
    updatePlayers();
}, 50);


window.addEventListener("keydown", e => {
    if (mainPlayer != undefined) {
        if (e.key == 'w') mainPlayer.queueDirection("up");
        if (e.key == 's') mainPlayer.queueDirection("down");
        if (e.key == 'a') mainPlayer.queueDirection("left");
        if (e.key == 'd') mainPlayer.queueDirection("right");
    }
})
