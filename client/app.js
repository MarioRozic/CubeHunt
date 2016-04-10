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
    var entity = {
        x:250,
        y:250,
        speedX:0,
        speedY:0,
        id:"",
    }
    entity.update = function(){
        entity.updatePosition();
    }
    entity.updatePosition = function(){
        entity.x += entity.speedX;
        entity.y += entity.speedY;
    }

    return entity;


}
var player = Entity();
var Player = function(id){
    player.id = id;
    player.width = 15;
    player.height = 15;
    player.pRight = false;
    player.pLeft = false;
    player.pUp = false;
    player.pDown = false;
    player.speed = 15;
    player.color = "";
    player.atkSpeed = 1;
    player.aimAngle = 0;


    //save old update function form Entity because
    //we will overwrite it with new player.update function
    var superUpdate = player.update;
    player.update = function(){
        player.updateSpeed();
        superUpdate();
    }

   player.updateSpeed = function(){
        if(player.pRight){
            if(player.x > width-player.width)
                player.speedX = 0;
            else
                player.speedX = player.speed;
        }
        else if(player.pLeft){
            if(player.x < 0)
                player.speedX = 0;
            else
                player.speedX = -player.speed;
        }
        else
            player.speedX = 0;

        if(player.pUp){
            if(player.y < 0)
                player.speedY = 0;
            else
                player.speedY = -player.speed;
        }         
        else if(player.pDown){
            if(player.y < height-player.height)
                player.speedY = player.speed;
            else
                player.speedY = 0;
        }
        else
            player.speedY = 0;

    }

   player.selectColor = function(id){
       switch(id){
        case 0:
               player.color = "#cb213d";
               break;
        case 1: 
               player.color = "#92208c"; 
               break;
        case 2: 
               player.color = "#78b4b4";
               break;
        case 3:
               player.color = "#d26c6c";
               break;
        case 4:
               player.color = "#a7cc82";
               break;
        case 5:
               player.color = "#ff6309";
               break;
            
       }
   }
    

    playerList[id] = player;
    return player;
}
//Player.list = {};

Player.onConnect = function(socket){
    //make new player
    var player = Player(socket.id);
    player.selectColor(socket.id);

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
    }
    return pack;
}
//---------------------------------------------------------------
//                      METAK
var bullet = Entity();
var Bullet = function(id,x,y,spdX,spdY,width,height){
     bullet = {
        x: x,
        y: y,
        speedX: spdX,
        speedY: spdY,
        id: id,
        width: width,
        height: height,
        color: "black",
        timer: 0,

    }
    bullet.update = function(){

        bullet.x += bullet.speedX;
        bullet.y += bullet.speedY;
    }

    bulletList[id] = bullet;
    console.log("stvoren metak!");
}

Bullet.update = function(){
    var pack = [];
    for(var i in bulletList){
        var bullet = bulletList[i];
        bullet.timer++;
        if(bullet.timer > 30)
            delete bulletList[i];
        bullet.update();
        pack.push({
            x:bullet.x,
            y:bullet.y,
            color:bullet.color,
            width:bullet.width,
            height:bullet.height
        });
    }
    return pack;
}


performAttack = function(actor){
    generateBullet(actor);
}

generateBullet = function(actor){
    var x = actor.x;
    var y = actor.y;
    var height = 10;
    var width = 10;
    var id = Math.random();
    var angle = actor.aimAngle;

    var speedX = Math.cos(angle/180 * Math.PI) * 10;
    var speedY = Math.sin(angle/180 * Math.PI) * 10;
    Bullet(id,x,y,speedX,speedY,width,height);
}
//                      METAK
//--------------------------------------------------------------------

//connections and game

var io = require("socket.io")(serv,{});
io.sockets.on("connection",function(socket){
    socket.id =Math.round(Math.random()*5);
    console.log(socket.id);

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
    })
});


setInterval(function(){
    var pack = {
        player:Player.update(),
        bullet:Bullet.update()
    }
    console.log(bulletList);
    for(var i in socketList){
        var socket = socketList[i];
        socket.emit("newPositions",pack);
    }
},1000/25);
