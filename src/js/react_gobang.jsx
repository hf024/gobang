/**
 * Description:
 * 参考：http://www.css88.com/react/tutorial/tutorial.html
 * Author: apple
 * Date: 2017/7/10.
 */
var React = require('react');
var ReactDOM = require('react-dom');

//登录处理
var chess = document.getElementById('chess');
var login = document.getElementById('login');
var username = document.getElementById('user_name');
var io = require('socket.io-client');
var socket = io();
var playing = false;
var room = null;
username.focus();

//回车后，登录
username.onkeydown = function (e) {
    e = e || event;
    if (e.keyCode === 13 && this.value) {
        //向服务器触发'join'请求
        socket.emit('join', {'username': this.value});

        //登录结果监听
        socket.on('join_res', function (data) {
            if (data.res === 'ok') {
                login.style.display = 'none';
                chess.style.display = 'block';
                ReactDOM.render(<GoBang />, document.getElementById("chess"));
            } else {
                alert('Sorry, 游戏已经满员，请稍后再试！');
            }
        });
    }
};

//在加载unload事件前执行
window.onbeforeunload = function () {
    if (playing) {
        return '当前正在下棋中，你确定要离开吗？';
    }
};

//获取所在桌当前所有在线人数
function OnlinePlayer(props) {
    var arr = [];
    for (var key in props.online) {
        arr.push(props.online[key]);
    }
    var msg = '';
    return (
        <div className='online clearfix'>
            <p className="room">【房间】<span className="room-id">{props.room}</span></p>
            {arr.map(function (value, index) {
                if (value.hasOwnProperty('role') && value.role === 'b') {
                    if (props.role === value.role) {
                        msg = '【我】';
                    } else {
                        msg = '';
                    }

                    return <div key={index}>
                        <span className="me">{msg}</span>
                        <Square value="1"/>
                        <span className="textlimit">{value.username}</span>
                    </div>
                } else if (value.hasOwnProperty('role') && value.role === 'w') {
                    if (props.role === value.role) {
                        msg = '【我】';
                    } else {
                        msg = '';
                    }
                    return <div key={index}>
                        <span className="me">{msg}</span>
                        <Square value="2"/>
                        <span className="textlimit">{value.username}</span>
                    </div>
                }
            })
            }
        </div>
    )
}

function GameRole(props) {
    if (props.curplayer) {
        return (
            <div className="game-role">
                <span>{props.msg}</span>
                <p>现在轮到<span className="curplayer">{props.curplayer}</span></p>
            </div>
        );
    } else {
        return (
            <div className="game-role">
                <span className="curplayer"> {props.msg}</span>
            </div>
        );
    }
}

//函数式生成单元格
function Square(props) {
    if (props.value == 1) {
        return (
            <div className="cell cell-b" onClick={props.onClick}>
            </div>
        );
    } else if (props.value == 2) {
        return (
            <div className="cell cell-w" onClick={props.onClick}>
            </div>
        );
    } else {
        return (
            <div className="cell" onClick={props.onClick}>
            </div>
        );
    }
}


//函数式组件生成按钮
function Button(props) {
    return (
        <li key="restart">
            <button type="button" className="button" id={props.id} disabled={props.disabled}
                    onClick={() => props.onClick()}>{props.desc}</button>
        </li>
    );
}

function Result(props) {
    var msg = '';
    if (props.win) {
        msg = '恭喜你，赢了这一局~'
    } else {
        msg = '非常抱歉，这一局您输了'
    }
    return (
        <div>
            <div className="mask"></div>
            <div id="info">
                <div id="msg" className="clearfix"><span>{msg}</span></div>
                <div className="btn-result">
                    <a className="btn btn-restart" href="#" onClick={() => props.onClickRestart()}>再来一局</a>
                    <a className="btn-seeresult" href="#" onClick={() => props.onClickClose()}>看看结果</a>
                </div>
            </div>
        </div>
    );
}
//定义棋盘大小
var board = {
    rows: 15,
    cols: 15,
};

//初始化棋盘
class ChessBoard extends React.Component {
    renderSquare(i) {
        return (
            <Square
                value={this.props.squares[i]}
                onClick={() => this.props.onClick(i)}
            />
        );
    }

    render() {
        var res = [];
        var index = 0;
        var i = 0;
        var j = 0;
        for (i = 0; i < board.rows; i++) {
            for (j = 0; j < board.cols; j++) {
                index = i * board.cols + j;
                //console.log('index :'+index);
                res[index] = <div key={index}>{this.renderSquare(index)}</div>;
            }
        }

        return (<div className="chess-board">{res}</div>)
    }
}


//五子棋
class GoBang extends React.Component {
    constructor() {
        super(); //super关键字用于访问父对象上的函数。

        //初始化棋局状态
        this.state = {
            squares: Array(board.rows * board.cols).fill(null),
            stackPlay: [],     //记录每一步走棋
            stackWithDraw: [],  //记录每一步悔棋
            isTurnBlack: true, //当前下棋方是否为黑方
            gameOver: false,   //游戏是否已经结束
            meBlack: false,     //自己是否为黑方
            pos: -1,           //当前下棋位置
            withdrawer: null,        //悔棋角色
            room: null,         //分配的房间号
            onlineUsers: {},   //在线用户列表
            isuStart: null,    //你自己是否已经开始
            isoStart: null,    //对方是否已经开始
        };
    }

    //执行一次，在初始化render之前执行，如果在这个方法内调用setState，
    // render()知道state发生变化，并且只执行一次
    componentWillMount() {
        var that = this;
        //监听来自服务发出的alloc_role事件
        socket.on('alloc', function (msg) {
            if (msg.hasOwnProperty('role') && msg.role === 'b') {
                that.setState({room: msg.room, username: msg.username, meBlack: true,})
            } else if (msg.hasOwnProperty('role') && msg.role === 'w') {
                that.setState({room: msg.room, username: msg.username, meBlack: false,})
            } else {
                that.setState({room: msg.room, username: msg.username, meBlack: null})
            }
        });

        //监听房间人员变化事件
        socket.on('users', function (users) {
            var isuStart = null;
            var isoStart = null;

            for (var user in users) {
                if (user === socket.id) {
                    isuStart = users[user].status === 1;
                } else {
                    isoStart = users[user].status === 1;
                }
            }
            that.setState({onlineUsers: users, isuStart: isuStart, isoStart: isoStart});
        });

        //监听房间人离开事件
        socket.on('deluser', function (users) {
            that.setState({
                squares: Array(board.rows * board.cols).fill(null),
                stackPlay: [],
                stackWithDraw: [],
                gameOver: false,
                pos: -1,
                withdrawer: null,
                isTurnBlack: true,
                meBlack: that.state.meBlack,
                seeResult: false,
                onlineUsers: users,
                isDelUser: true
            });
            ReactDOM.render(<div></div>, document.getElementById('result'));
        });
    }

    //componentDidMount类似js中的window.onload，执行在render方法之后，也就是页面的组件渲染完毕之后
    componentDidMount() {
        var that = this;

        //监听服务器发送过来的落子事件
        socket.on('play', function (data) {
            var val = that.state.isTurnBlack ? "1" : "2"; //1：黑棋 2：白棋
            var squares = that.state.squares;
            var stackPlay = that.state.stackPlay;
            stackPlay.push({'pos': data.pos, 'val': val});

            //更新当前棋局状态，
            squares[data.pos] = val;
            that.setState({
                squares: squares,
                stackPlay: stackPlay,
                isTurnBlack: !that.state.isTurnBlack,
                pos: data.pos,
                withdrawer: ''
            });
        });

        //监听重新开始事件
        // type:
        // 1 发起重新开始（需要得到对方同意方可重新开始）
        // 2 同意重新开始
        socket.on('restart', function (data) {
            var r = false;
            var type = parseInt(data.type);

            if (type === 1) {
                if (data.meBlack === that.state.meBlack) {
                    r = true;
                } else {
                    r = confirm('对方要求重新开始，你是否同意？');
                    if (r) { //如果同意，则通过服务器知会对方
                        socket.emit('restart', {
                            room: data.room,
                            username: that.state.username,
                            isTurnBlack: data.isTurnBlack,
                            meBlack: that.state.meBlack,
                            type: 2
                        });
                    }
                }
            }

            if (type === 2) {
                that.setState({
                    squares: Array(board.rows * board.cols).fill(null),
                    stackPlay: [],
                    stackWithDraw: [],
                    gameOver: false,
                    pos: -1,
                    withdrawer: null,
                    isDelUser: false,
                });
                ReactDOM.render(<div></div>, document.getElementById('result'));
            }
        });

        //监听悔棋事件
        // type:
        // 1 发起悔棋（需要得到对方同意方可）
        // 2 发起撤销悔棋 （需要对方同意方可）
        // 3 因得到对方同意，悔棋成功
        // 4 因得到对方同意，撤销悔棋成功
        socket.on('withdraw', function (data) {
            var r = false;
            var type = parseInt(data.type);
            if (type === 1 || type === 2) {
                if (data.meBlack === that.state.meBlack) {
                    r = true;
                } else {
                    r = confirm('对方要求' + (type === 1 ? '悔棋' : '撤销悔棋') + '，你是否同意？');
                    if (r) { //如果同意，则通过服务器知会对方
                        socket.emit(
                            "withdraw",
                            {
                                room: data.room,
                                meBlack: data.meBlack,
                                type: type === 1 ? 3 : 4
                            }
                        );
                    }
                }
            }

            if (type === 3) {
                that.doWithDraw(1, data.meBlack);
            }
            if (type === 4) {
                that.doWithDraw(2, data.meBlack);
            }
        });
    }


    //下棋落子对应的点击事件
    handleClick(i) {
        var squares = this.state.squares;

        var num = 0;
        var user = 0;

        for (user in this.state.onlineUsers) {
            num++;
        }
        if (num < 2) {
            if (this.state.pos === -1) { //暂时只有一个人登录
                alert('此游戏，需要两个人同时登录，才能玩哦！');
            } else { //对方已经掉线
                alert('Sorry,对方已经断开连接，请重新开始吧！');
            }
            return
        }


        if (this.state.gameOver || this.state.seeResult) {
            alert('游戏已结束，请重新开始吧！');
            return;
        }

        if (!this.state.isuStart) {
            alert('点击"开始游戏"按钮之后，才能开始哦！');
            return;
        }

        if (!this.state.isoStart) {
            alert('对方还没有开始游戏，再等等他吧');
            return;
        }

        //游戏已经结束 或 棋盘上已经有棋子的地方不能再落子
        if (squares[i]) {
            return;
        }


        playing = true;
        //判断该谁落子
        if (this.state.isTurnBlack !== this.state.meBlack) {
            alert('不着急，对方还没下~');
            return;
        }

        socket.emit('play', {'room': this.state.room, 'pos': i, 'player': this.state.meBlack})
    }

    componentDidUpdate() {
        var val = !this.state.isTurnBlack ? "1" : "2"; //1：黑棋 2：白棋

        //如果是悔棋，无需再判断
        if (this.state.withdrawer !== '') {
            return;
        }

        //根据当前棋局详情，判断游戏是否已经结束
        if (isGameOVER(this.state.squares, this.state.pos, val)) {
            this.state.gameOver = true;
        }

        //console.log(squares, this.state.pos, val);
        // 更新的时候触发
        if (this.state.gameOver) {
            //告诉服务器游戏结果
            socket.emit('gameover', {room: this.state.room, win: !this.state.isTurnBlack === this.state.meBlack});
            playing = false;
            var win = !this.state.isTurnBlack === this.state.meBlack;
            ReactDOM.render(
                <Result win={win} onClickClose={() => this.closeResult()}
                        onClickRestart={() => this.startGame()}/>,
                document.getElementById('result')
            )
        }
    }

    //悔棋/撤销悔棋事件触发 type: 1悔棋 2撤销悔棋
    withdraw(type) {
        if (confirm('需要对方的同意，你确定要' + (type === 1 ? '悔棋' : '撤销悔棋') + '吗？')) {
            socket.emit('withdraw', {room: this.state.room, meBlack: this.state.meBlack, type: type});
            document.getElementById('btn_withdraw').disabled = true;
        }
    }

    //执行悔棋操作
    doWithDraw(type, role) {
        if (this.state.pos === -1) { //开始游戏之前，禁止悔棋和撤销悔棋操作
            return;
        } else {
            if (this.state.gameOver) {   //若游戏结束，直接返回
                return;
            }

            var squares = this.state.squares;
            var withdrawer = '';
            var stackPlay = this.state.stackPlay;
            var stackWithdraw = this.state.stackWithDraw;
            var cell = {};

            if (type === 1) {
                //清除上一次下的棋子
                cell = stackPlay.pop();
                squares[cell.pos] = 0;
                withdrawer = role ? 'b' : 'w';
                stackWithdraw.push(cell);
            } else {
                //恢复上一次下的棋子
                cell = stackWithdraw.pop();
                squares[cell.pos] = cell.val;
                withdrawer = '';
                stackPlay.push(cell);
            }

            //若游戏未结束，则执行悔棋步骤
            this.setState({
                isTurnBlack: !this.state.isTurnBlack,
                gameOver: false,
                squares: squares,
                stackPlay: stackPlay,
                stackWithDraw: stackWithdraw,
                withdrawer: withdrawer
            });
        }
    }

    //开始游戏，通过服务器知会房间里的其他人
    startGame() {
        this.setState({
            squares: Array(board.rows * board.cols).fill(null),
            stackPlay: [],
            stackWithDraw: [],
            gameOver: false,
            pos: -1,
            withdrawer: null,
            isTurnBlack: this.state.isTurnBlack,
            meBlack: this.state.meBlack,
            seeResult: false,
            isDelUser: false,
        });
        ReactDOM.render(<div></div>, document.getElementById('result'));

        socket.emit('start', {room: this.state.room});
    }

    //重新开始
    restartGame(type) {
        socket.emit('restart', {
            username: this.state.username,
            room: this.state.room,
            isTurnBlack: this.state.isTurnBlack,
            meBlack: this.state.meBlack,
            type: type
        });
    }

    //退出游戏，通过服务器知会房间里的其他人
    exitGame() {
        if (confirm("您确定要退出游戏吗？")) {
            window.location.reload();
        }
    }

    //查看结果
    closeResult() {
        ReactDOM.render(<div></div>, document.getElementById('result'));

        this.setState({
            gameOver: false,
            pos: -1,
            seeResult: true,
        });
    }


    //渲染
    render() {
        var role = this.state.meBlack ? 'b' : 'w';

        var btn_start_disabled = false;
        var btn_restart_disabled = false;
        var btn_withdraw_disabled = true;
        var btn_undowithdraw_disabled = true;

        //开始游戏按钮可点击逻辑判断
        if (this.state.seeResult || this.state.isDelUser) {
            btn_start_disabled = false;
        } else {
            if (this.state.isuStart) {
                btn_start_disabled = true;
            } else {
                btn_start_disabled = false;
            }
        }

        //悔棋按钮状态逻辑判断
        if (this.state.pos > -1) {
            btn_restart_disabled = false;
            if (this.state.gameOver || this.state.seeResult) {
                btn_withdraw_disabled = true;
                btn_restart_disabled = true;
            } else if (this.state.isTurnBlack !== this.state.meBlack && this.state.stackPlay.length > 0) {
                btn_withdraw_disabled = false;
            }
        } else {
            btn_withdraw_disabled = true;
            btn_restart_disabled = true;
        }

        //撤销悔棋按钮状态逻辑判断
        if (this.state.withdrawer !== '') {
            var withrow_role = this.state.meBlack ? 'b' : 'w';
            if (this.state.gameOver || this.state.seeResult) {
                btn_undowithdraw_disabled = true;
            } else if (this.state.withdrawer === withrow_role) {
                btn_undowithdraw_disabled = false;
            }
        } else {
            btn_undowithdraw_disabled = true;
        }

        var msg = '';
        var curplayer = '';
        var i = 0;
        var num = 0;
        for (i in this.state.onlineUsers) {
            num++;
        }
        if (this.state.isDelUser) {
            msg = '对方已离开，只能重新开始了~';
            curplayer = '';
        } else if (num < 2) {
            msg = '玩伴还没有来，再等等吧~';
        } else if (this.state.gameOver || this.state.seeResult) {
                msg = '游戏已结束，重新开始吧~';
            curplayer = '';
        } else {
            if (this.state.pos > -1) {
                msg = '正在游戏中......';
                curplayer = this.state.isTurnBlack === this.state.meBlack ? '我' : '对方';
            } else {
                if (this.state.isuStart) {
                    if (this.state.isoStart) {
                        msg = '游戏可以开始了~';
                        curplayer = this.state.isTurnBlack === this.state.meBlack ? '我' : '对方';
                    } else {
                        msg = '等待对方开始游戏';
                    }
                } else {
                    if (this.state.isoStart) {
                        msg = '对方在等你哦~';
                    } else {
                        msg = '亲，开始游戏吧~';
                    }
                }
            }
        }

        return (
            <div className="game clearfix">
                <h1>React版五子棋(双人对战）</h1>
                <div className="game-info">
                    <OnlinePlayer room={this.state.room} role={role} online={this.state.onlineUsers}/>
                    <GameRole msg={msg} curplayer={curplayer}/>
                    <ul id="game-button">
                        <Button disabled={btn_start_disabled} desc="开始游戏" onClick={() => this.startGame()}/>
                        <Button disabled={btn_restart_disabled} desc="重新开始" onClick={() => this.restartGame(1)}/>
                        <Button id='btn_withdraw' disabled={btn_withdraw_disabled} desc="悔棋"
                                onClick={() => this.withdraw(1)}/>
                        <Button id='btn_undowithdraw' disabled={btn_undowithdraw_disabled} desc="撤销悔棋"
                                onClick={() => this.withdraw(2)}/>
                        <Button id="btn_exit" desc="退出游戏" onClick={() => this.exitGame()}/>
                        <li>
                            <a href="./gobang-dom.html" id="btnDom">切换到DOM版</a>
                        </li>
                        <li>
                            <a href="./gobang-canvas.html" id="btnCanvas">切换到Canva版</a>
                        </li>
                    </ul>
                </div>
                <div id="chess-board-wrapper">
                    <ChessBoard
                        rows={board.rows}
                        cols={board.cols}
                        squares={this.state.squares}
                        onClick={i => this.handleClick(i)}
                    />
                </div>
            </div>
        );
    }
}

// ========================================

ReactDOM.render(<GoBang />, document.getElementById("chess"));

function isGameOVER(squares, i, val) {
    var row = Math.floor(i / board.cols);
    var col = i % board.cols;

    //四个方向（横、纵、对角、斜对角）依次判断
    return isVerWin(squares, row, col, val) || isHorWin(squares, row, col, val)
        || isPosDiagWin(squares, row, col, val) || isNegDiagWin(squares, row, col, val);
}

//横向判断
function isVerWin(squares, row, col, val) {
    var counter = 1;

    //1.向左，计算连续棋子数
    for (var j = col - 1; j >= 0; j--) {
        if (squares[row * board.cols + j] === val) {
            counter++;
        } else {
            break;
        }
    }

    //2.向右，计算连续棋子数
    for (var j = col + 1; j < board.cols; j++) {
        if (squares[row * board.cols + j] === val) {
            counter++;
        } else {
            break;
        }
    }

    return counter === 5;
}

//纵向判断
function isHorWin(squares, row, col, val) {
    var counter = 1;
    //向上，找连续棋子数
    for (var i = row - 1; i >= 0; i--) {
        if (squares[i * board.cols + col] === val) {
            counter++;
        } else {
            break;
        }
    }

    //2 向下，找连续棋子数
    for (var i = row + 1; i < board.cols; i++) {
        if (squares[i * board.cols + col] === val) {
            counter++;
        } else {
            break;
        }
    }

    return counter === 5;
}

//正对角向判断
function isPosDiagWin(squares, row, col, val) {
    var counter = 1;

    //1 右上, 找连续棋子数
    for (var i = row - 1, j = col + 1; i >= 0 && j < board.cols; i--, j++) {
        if (squares[i * board.cols + j] === val) {
            counter++;
        } else {
            break;
        }
    }
    //2 左下, 找连续棋子数
    for (var i = row + 1, j = col - 1; i < board.rows && j >= 0; i++, j--) {
        if (squares[i * board.cols + j] === val) {
            counter++;
        } else {
            break;
        }
    }

    return counter === 5;
}

//斜对角向判断
function isNegDiagWin(squares, row, col, val) {
    var counter = 1;
    //1 左上, 找连续棋子数
    for (var i = row - 1, j = col - 1; i >= 0 && j >= 0; i--, j--) {
        if (squares[i * board.cols + j] === val) {
            counter++;
        } else {
            break;
        }
    }
    //2 右下, 找连续棋子数
    for (var i = row + 1, j = col + 1; i < board.rows && j < board.cols; i++, j++) {
        if (squares[i * board.cols + j] === val) {
            counter++;
        } else {
            break;
        }
    }

    return counter === 5;
}





