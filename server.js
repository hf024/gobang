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

app.use(express.static('src'));
app.use(express.static('public'));

var currole = '';
var onlineUser = {};   //线上用户
var onlineuserNum = 0; //线上用户数

/*io.emit('action');表示发送了一个action命令，命令是字符串的，
 在另一端接收时，可以这么写： socket.on('action',function(){...});

 io.emit('action',data);表示发送了一个action命令，还有data数据，
 在另一端接收时，可以这么写： socket.on('action',function(data){...});
 */
io.on('connection',  function(socket){

    //接收并处理客户端的login事件
    socket.on('login', function(obj){
        if(onlineuserNum === 0){
            onlineUser[socket.id] = Object.assign(obj, {role: 'b'});
        }else if(onlineuserNum === 1){
            for(let i in  onlineUser){
                currole=onlineUser[i]&&onlineUser[i].role;
                if(currole === 'b' || currole === 'w'){
                    break;
                }
            }
            onlineUser[socket.id] =  Object.assign(obj, {role: currole==='b'?'w':'b'});
        }else{
            //一个游戏桌最多只允许2个人进入
            //onlineUser[socket.id] = obj;
        }

        if(onlineuserNum < 2){
            onlineuserNum++;
            io.to(socket.id).emit('ok');

            //触发客户端事件,分配棋子颜色
            io.to(socket.id).emit('alloc_role', onlineUser[socket.id]);

            //触发客户端事件，发送在线用户列表
            io.emit('addusers', onlineUser);

            console.log(obj.username, 'is loginning, 在线用户:',onlineUser, '在线人数', onlineuserNum);

        }else{
            console.log('socket_id:' + socket.id +' tried logging,but server refused it');
            io.to(socket.id).emit('fail');
        }

    });

    //断开连接
    socket.on('disconnect', function () {
        console.log(socket.id, '断开连接');
        if(onlineUser.hasOwnProperty(socket.id)){
            delete  onlineUser[socket.id];
            onlineuserNum--;
        }
        for (let i in onlineUser){
            //通知对战另一方同步更新在线人数
            io.to(i).emit('delusers', onlineUser);  //
        }
        console.log('更新在线用户',onlineUser, '在线人数', onlineuserNum);
    });

    //重新开始
    socket.on('restart', function (data) {
        console.log('重新开始');
        io.emit('restart', data);
    });

    //点击下棋事件
    socket.on('play', function(data){
        io.emit('play', data);
    });

    //悔棋事件
    socket.on('withdraw', function(data){
        io.emit('withdraw',data);
    });
});

server.listen(8001,function () {
    console.log('Server running at http://127.0.0.1:8001/');
} );