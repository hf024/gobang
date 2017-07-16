/**
 * Description:
 *      node.js实现服务器功能
 *      port: 8001
 *      服务器框架：express
 *      实时通讯模块：socket.io
 *      socket_io API参考：
 *      https://github.com/socketio/socket.io/blob/master/docs/API.md
 * Author: apple
 * Date: 2017/7/11.
 */


var express = require('express');
var app = express();
var server = require('http').createServer(app);
var io = require('socket.io')(server);
var fs = require('fs');

app.use(express.static('src'));
app.use(express.static('public'));

var currole = '';
var onlineUser = {};   //线上用户
var onlineuserNum = 0; //线上用户数
var onlineRooms = [];
var room = null;
var roomID = null;

//获取游戏房间信息
fs.readFile(__dirname + '/data/rooms.json', 'utf8', function (err, data) {
    "use strict";
    data = JSON.parse(data);
    for (var key in data) {
        onlineRooms[key] = data[key];
        onlineRooms[key].users = {};
    }
});


/*io.emit('action');表示发送了一个action命令，命令是字符串的，
 在另一端接收时，可以这么写： socket.on('action',function(){...});

 io.emit('action',data);表示发送了一个action命令，还有data数据，
 在另一端接收时，可以这么写： socket.on('action',function(data){...});
 */
var users = [];

io.on('connection', function (socket) {
    //接收并处理客户端进入游戏房间的请求，为其分配房间和角色
    socket.on('join', function (obj) {
        for (var i in onlineRooms) {
            var n = 0, role = null;
            room = null;
            for(var j in onlineRooms[i].users){
                n++;
            }
            if (n < 2) {
                room = onlineRooms[i];
                roomID = i;
                if(n === 0){
                    role = 'b';
                }else{
                    role =  onlineRooms[i].users[j].role === 'b'?'w':'b';
                }
                break;
            }
        }

        //房间未满员（少于两人)，可以进入房间
        if (room) {
            var user = Object.assign(obj, {room: roomID, role: role, staus: 0});
            room.users[socket.id] = user;

            //通知同一个房间内的所有客户，用户列表发生变化
            socket.join(roomID);    // 加入房间

            // 通知房间内人员
            io.to(roomID).emit('users', room.users);

            console.log(obj.username, '用户登录成功，分配的房间为：' + i + '，房间信息:');
            console.log(JSON.stringify(room));
            res = {res: 'ok'};
        } else {
            console.log('房间已满，' + obj.username, '用户登录失败');
            res = {res: 'fail'};
        }
        //向客户端公布分配结果
        io.to(socket.id).emit('join_res', res);
        io.to(socket.id).emit('alloc',{room: roomID, username: obj.username, role: role} );
    });

    //断开连接,根据socket_id查询用户所在房间号，做退出房间处理，并通知房里其他人
    socket.on('disconnect', function () {
        for(var i in onlineRooms){
            for(var j in onlineRooms[i].users){
                if(socket.id === j){
                    roomID = i;
                    username = onlineRooms[roomID].users[socket.id].username;
                    delete  onlineRooms[roomID].users[socket.id];

                    socket.leave(roomID);    // 退出房间

                    //告知房间其他人：我离开了
                    io.to(roomID).emit('deluser',onlineRooms[roomID].users);
                    console.log(socket.id, '断开连接，' + username + '退出了房间' + roomID +'，并通知房间其他人，房间当前用户:');
                    console.log(JSON.stringify(onlineRooms[roomID].users));
                    break;
                }
            }
        }

        console.log(socket.id, '断开连接，该连接没有用户在任何房间中');
    });

    //开始游戏，通过服务器知会房间其他人
    socket.on('start', function (data) {
        roomID = data.room;
        if(onlineRooms.hasOwnProperty(roomID)) {
            if (onlineRooms[roomID].users.hasOwnProperty(socket.id)) {
                onlineRooms[roomID].users[socket.id].status = 1;

                //知会房间其他人
                io.to(roomID).emit('users', onlineRooms[roomID].users);

                console.log(socket.id + ' 房间：'+ roomID+ ', 用户：'  + onlineRooms[roomID].users[socket.id].username +'已经开始了');
            }else{
                console.log(socket.id + '房间：'+ roomID+ '，连接不存在，不能开始游戏');
            }
        }else{
            console.log(socket.id + '房间：'+ roomID+ '不存在，不能开始游戏');
        }
    });


    //处理客户端的重新开始事件：
    // 一方发出请求，通过服务器把这个请求发送给房间其他人，由另一方做决定如何处理
    socket.on('restart', function (data) {
        roomID = data.room;
        if(onlineRooms.hasOwnProperty(roomID)) {
            if (onlineRooms[roomID].users.hasOwnProperty(socket.id)) {
                if(data.username === onlineRooms[roomID].users[socket.id].username){
                    var msg = data.type === 1? '发起重新开始':'同意重新开始';

                    //知会房间里面的其他人
                    io.to(roomID).emit('restart', data);

                    console.log(socket.id + ' 房间：'+ roomID+ ', 用户：' + data.username + msg);
                }else{
                    console.log( socket.id + ' 房间：'+ roomID+ ', 用户：' + data.username +'不存在');
                }
            }else{
                console.log( socket.id + ' 房间：'+ roomID+ ', 连接不存在，不能重新开始');
            }
        }else{
            console.log( socket.id + ' 房间不存在');
        }
    });

    socket.on('gameover', function (data) {
        roomID =  data.room;
        var msg = data.win ? '赢了':'输了';
        if(onlineRooms.hasOwnProperty(roomID)) {
            if (onlineRooms[roomID].users.hasOwnProperty(socket.id)) {
                onlineRooms[roomID].users[socket.id].status = 0;
                console.log('房间：'+ roomID+ ',' + socket.id + ' 用户:' + onlineRooms[roomID].users[socket.id].username + ',' + msg);
            }else{
                console.log('房间：'+ roomID+ ',' + socket.id + '用户不存在，怎么结束的游戏？');
            }
        }else{
            console.log('房间：'+ roomID+ '不存在,' + socket.id + '怎么结束的游戏？');
        }
    });

    //点击下棋事件
    socket.on('play', function (data) {
        roomID = data.room;
        console.log(roomID,' 在下棋 ',data);
        io.to(roomID).emit('play', data);
    });

    //悔棋事件
    socket.on('withdraw', function (data) {
        roomID = data.room;
        console.log(roomID,' 在悔棋 ',data);
        io.to(roomID).emit('withdraw', data);
    });
});

server.listen(8001, function () {
    console.log('Server running at http://127.0.0.1:8001/');
});