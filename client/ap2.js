var express = require("express");
var app = express();
var serv = require("http").Server(app);

app.get("/",function(req,res){
    res.sendFile(__dirname + "/client/index.html");
});
app.use("/client",express.static(__dirname + "/client"));

serv.listen(2000);
console.log("Listening on port: 2000");

var socketList = {};
var playerList = {};
var bulletList = {};
var width = 500, height = 500;
var Entity = function(){
    var self = {
        x: 255,
        y: 250,
        speedX: 0,
        speedY: 0,
        id: ""
    }
    self.update = function(){
        self.updatePosition();
    }
    self.updatePosition = function(){
        self.x += self.speedX;
        self.y += self.speedY;
    }
    return self;
}

var Player = function(id){
    var self = Entity();
    self.id = id;
    self.type = "player";
    self.width = 15;
    self.height = 15;
    self.pRight = false;
    self.pLeft = false;
    self.pUp = false;
    self.pDown = false;
    self.speed = 15;
    self.color = "red";
    self.atkSpeed = 1;
    self.aimAngle = 0;

    var superUpdate = self.update;
    self.update = function(){
        self.updateSpeed();
        superUpdate();
    }
    
    self.updateSpeed = function(){
        if(self.pRight)
            self.speedX = self.speed;
        else if(self.pLeft)
            self.speedX = -self.speed;
        else
            self.speedX = 0;

        if(self.pUp)
            self.speedY = -self.speed;
        else if(self.pDown)
            self.speedY = self.speed;
        else
            self.speedY = 0;

    }
    playerList[id] = self;
    return self;


   }
    


//Player.list = {};


Player.onConnect = function(socket){
    //make new player
    var player = Player(socket.id);
    console.log(socket.id);

    socket.on("keyPress",function(data){
        if(data.inputID === "Left")
            player.pLeft = data.state;
        else if(data.inputID === "Right")
            player.pRight = data.state;
        else if(data.inputID === "Up")
            player.pUp = data.state;
        else if(data.inputID === "Down")
            player.pDown = data.state;
    });

}
Player.onDisconnect = function(socket){
    delete playerList[socket.id];
}
Player.update = function(){
    var pack = [];
    for(var i in playerList){
        var player = playerList[i];
        player.update();
        pack.push({
            x:player.x,
            y:player.y,
            color:player.color,
            width:player.width,
            height:player.height
        });
        console.log("x: " + player.x +" y: " + player.y);
    }
    return pack;
}

//---------------------------------------------------------------
//                      METAK
Bullet = function(id,x,y,spdX,spdY,width,height){
    var bullet = {
        type: "bullet",
        x: x,
        speedX: spdX,
        y: y,
        speedY: spdY,
        id: id,
        width: width,
        height: height,
        color: "black",
        timer: 0,
    }

    bulletList[id] = bullet;
    console.log("Stvoren");
}
//                      METAK
//--------------------------------------------------------------------
//connections and game

var io = require("socket.io")(serv,{});
io.sockets.on("connection",function(socket){
    socket.id =Math.round(Math.random()*5);

    socketList[socket.id] = socket;

    Player.onConnect(socket);

    socket.on("disconnect",function(){
        delete socketList[socket.id];
        console.log("socket izbrisan");
        Player.onDisconnect(socket);
    });
    socket.on("mousePosition",function(data){
        var mouseX = data.mX;
        var mouseY = data.mY;

        mouseX -= player.x;
        mouseY -= player.y;
        player.aimAngle = Math.atan2(mouseY,mouseX) / Math.PI * 180;

    });
    socket.on("shoot",function(data){
        performAttack(player);
    });
});


setInterval(function(){
    var pack = {
        player:Player.update(),
    }
    for(var i in socketList){
        var socket = socketList[i];
        socket.emit("newPositions",pack);
    }
},1000/25);
