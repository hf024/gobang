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
            var user = Object.assign(obj, {room: roomID, role: role});
            room.users[socket.id] = user;

            //通知同一个房间内的所有客户，用户列表发生变化
            socket.join(roomID);    // 加入房间

            // 通知房间内人员
            io.to(roomID).emit('addusers', room.users);

            console.log(obj.username, '用户登录成功，分配的房间为：' + i + '，房间信息:');
            console.log(JSON.stringify(room));
            res = Object.assign(obj, {res: 'ok'});
        } else {
            console.log('房间已满，' + obj.username, '用户登录失败');
            res = Object.assign(obj, {res: 'fail'});
        }
        //向客户端公布分配结果
        io.to(socket.id).emit('join_res', res);
        io.to(socket.id).emit('alloc',{room: roomID, role: role} );
    });

    //离开游戏房间
    socket.on('leave', function (data) {
        socket.emit('disconnect', data);
    });

    //断开连接
    socket.on('disconnect', function (data) {
        roomID = data.room;
        var username = null;
        if(onlineRooms.hasOwnProperty(roomID)){
            if (onlineRooms[roomID].users.hasOwnProperty(socket.id)) {
                username = onlineRooms[roomID].users[socket.id].username;
                delete  onlineRooms[roomID].users[socket.id];
            }

            socket.leave(roomID);    // 退出房间
            io.to(roomID).emit('delusers',onlineRooms[roomID].users);
            console.log(socket.id, '断开连接' +'(即：'+ username + '退出了房间' + roomID+')')
        }
    });

    //重新开始
    socket.on('restart', function (data) {
        roomID = data.room;
        console.log(socket.id + '重新开始');
        io.to(roomID).emit('restart', data);
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