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
var width = 1024, height = 720;
var Entity = function(){
    var self = {
        x: 15 + Math.round(Math.random()*width-30),
        y: 15 + Math.round(Math.random()*height-50),
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
    self.width = 20;
    self.height = 20;
    self.pRight = false;
    self.pLeft = false;
    self.pUp = false;
    self.pDown = false;
    self.speed = 10;
    self.color = "#";
    self.atkSpeed = 1;
    self.aimAngle = 0;
    self.hp = 25;

    var superUpdate = self.update;
    self.update = function(){
        self.updateSpeed();
        superUpdate();
    }
    
    self.updateSpeed = function(){
        if(self.pRight && self.x < width - self.width/2)
            self.speedX = self.speed;
        else if(self.pLeft && self.x > 0 + self.width/2)
            self.speedX = -self.speed;
        else
            self.speedX = 0;

        if(self.pUp && self.y > 0 + self.height/2)
            self.speedY = -self.speed;
        else if(self.pDown && self.y < height-50)
            self.speedY = self.speed;
        else
            self.speedY = 0;

    }
    self.getColor = function(){
        colors = [0,1,2,3,4,5,6,7,8,9,"a","b","c","d","f"];
        for(var i = 0; i < 6; i++){
            self.color += colors[Math.floor(Math.random()*15)];
        }
    }
    playerList[self.id] = self;
    return self;


   }
    


//Player.list = {};


Player.onConnect = function(socket){
    //make new player
    var player = Player(socket.id);
    console.log(socket.id);
    player.getColor();

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
            height:player.height,
            aimAngle:player.aimAngle,
            hp:player.hp,
            id:player.id
        });
        //console.log("x: " + player.x +" y: " + player.y + " aimAngle " + player.aimAngle);
        //console.log(player.color);
        if(player.hp <= 0)
            delete playerList[i];
    }
    return pack;
}

//---------------------------------------------------------------
//                      METAK
var Bullet = function(x,y,spdX,spdY,number,dmg){
    var self = Entity();
    self.x = x;
    self.y = y;
    self.id = Math.random();
    self.bulletID = number;
    self.width = 20;
    self.height = 20;
    self.speedX = spdX;
    self.speedY = spdY;
    self.timer = 0;
    self.dmg = dmg;

    var superUpdate = self.update;

    self.update = function(){
        superUpdate();
    }


    bulletList[self.id] = self;
}
Bullet.update = function(){
    var pack = [];
    for(var i in bulletList){
        var bullet = bulletList[i];
        bullet.timer++;
    
        bullet.update();
        pack.push({
            x:bullet.x,
            y:bullet.y
        });
        if(bullet.timer > 150){
            delete bulletList[i];
        }
    }
    return pack;

}
makeBullet = function(something,overAngle,dmg){

    var x = something.x;
    var y = something.y;
    var angle = something.aimAngle;
    if(overAngle !== undefined){
        angle = overAngle;
    }
    var spdX = Math.cos(angle / 180 * Math.PI) * 15;
    var spdY = Math.sin(angle / 180 * Math.PI) * 15;
    Bullet(x,y,spdX,spdY,something.id,dmg);
}
//                      METAK
//--------------------------------------------------------------------

testCollision = function(entity1,entity2){
    var rect1 = {
        x: entity1.x - entity1.width/2,
        y: entity1.y - entity1.height/2,
        width: entity1.width,
        height: entity1.height
    }
    var rect2 = {
        x: entity2.x - entity2.width/2,
        y: entity2.y - entity2.height/2,
        width: entity2.width,
        height: entity2.height,
    }

    return testCollisionRect(rect1,rect2);
}

testCollisionRect = function(rect1,rect2){
    return rect1.x <= rect2.x + rect2.width
        && rect2.x <= rect1.x + rect1.width
        && rect1.y <= rect2.y + rect2.height
        && rect2.y <= rect1.y + rect1.height;
}


//connections and game

var io = require("socket.io")(serv,{});
io.sockets.on("connection",function(socket){
    socket.id = Math.random();
    socket.emit("getPlayerID",socket.id);

    socketList[socket.id] = socket;

    Player.onConnect(socket);

    socket.on("disconnect",function(){
        delete socketList[socket.id];
        console.log("socket deleted");
        Player.onDisconnect(socket);
    });
    
    socket.on("mousePosition",function(data){
        var mouseX = data.mX;
        var mouseY = data.mY;

        mouseX -= playerList[socket.id].x;
        mouseY -= playerList[socket.id].y;
        playerList[socket.id].aimAngle = Math.atan2(mouseY,mouseX) / Math.PI * 180;

    });
    socket.on("shoot",function(data){
        //console.log(playerList[socket.id]);
        makeBullet(playerList[socket.id],playerList[socket.id].aimAngle,3);
        
    });
    socket.on("specialShoot",function(data){
        makeBullet(playerList[socket.id],playerList[socket.id].aimAngle - 5,1);
        makeBullet(playerList[socket.id],playerList[socket.id].aimAngle,1);
        makeBullet(playerList[socket.id],playerList[socket.id].aimAngle + 5,1);
        /*
        for(var i = 0; i < 24; i++){
            makeBullet(playerList[socket.id],playerList[socket.id].aimAngle + i*15);
        }
        */

    });
    
});


setInterval(function(){
    var pack = {
        player:Player.update(),
        bullet:Bullet.update()
    }
    for(var i in socketList){
        var socket = socketList[i];
        socket.emit("newPositions",pack);
    }

    for(var i in bulletList){
        var bullet = bulletList[i];
        for(var j in playerList){
            var player = playerList[j];
            if(bullet.bulletID != player.id){
            var isColliding = testCollision(bullet,player);
            if(isColliding){
                delete bulletList[i];
                player.hp -= bullet.dmg;
            }
            }
        }
    }
},25);
