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

username.focus();

//回车后，登录
username.onkeydown = function (e) {
    e = e || event;
    if (e.keyCode === 13 && this.value) {
        //向服务器触发'login'登录请求
        socket.emit('login', {'username': this.value});

        //登录成功
        socket.on('ok', function () {
            login.style.display = 'none';
            chess.style.display = 'block';
            ReactDOM.render(<GoBang />, document.getElementById("chess"));
        });

        //登录失败
        socket.on('fail', function () {
            alert('Sorry, 游戏已经满员（一次只能同时两个人玩），请稍后再试！');
        });
    }
};

//在加载unload事件前执行
window.onbeforeunload = function () {
    if(playing){
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
    return (
        <div>
            <div className="mask"></div>
            <div id="info">
                <div id="msg">{props.msg}</div>
                <a className="btn" href="#" onClick={() => props.onClick()}>{props.desc}</a>
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
            history: [
                {
                    squares: Array(board.rows * board.cols).fill(null)
                }
            ],
            stackPlay: [],     //走棋栈：存放下棋的每一步,用于悔棋
            stackWithDraw: [], //悔棋栈：存放悔棋的每一步，用于撤销悔棋
            stepNumber: 0, //总步数
            isTurnBlack: true, //当前下棋方是否为黑方
            gameOver: false, //游戏是否已经结束
            meBlack: null, //自己是否为黑方
            pos: -1,
        };
    }

    //执行一次，在初始化render之前执行，如果在这个方法内调用setState，
    // render()知道state发生变化，并且只执行一次
    componentWillMount() {
        var that = this;

        //监听来自服务发出的alloc_role事件
        socket.on('alloc_role', function (msg) {
            if (msg.hasOwnProperty('role') && msg.role === 'b') {
                that.setState({meBlack: true,})
            } else if (msg.hasOwnProperty('role') && msg.role === 'w') {
                that.setState({meBlack: false,})
            } else {
                that.setState({meBlack: null})
            }

        });

        socket.on('addusers', function (users) {
            that.setState({onlineUsers: users});
        });

        socket.on('delusers', function (users) {
            that.setState({onlineUsers: users});
            alert('Sorry,对方已断开连接，只能重新开始楼');
            that.restart(2);
        });
    }

    //componentDidMount类似js中的window.onload，执行在render方法之后，也就是页面的组件渲染完毕之后
    componentDidMount() {
        var that = this;

        //监听服务器发送过来的落子事件
        socket.on('play', function (data) {
            //更新视图
            var history = that.state.history.slice(0, that.state.stepNumber + 1);
            var current = history[history.length - 1];
            var squares = current.squares.slice();
            var val = that.state.isTurnBlack ? "1" : "2"; //1：黑棋 2：白棋

            //更新当前棋局状态，并将当前棋局保存到history
            squares[data.pos] = val;
            that.setState({
                history: history.concat([
                    {
                        squares: squares
                    }
                ]),
                stackPlay: that.state.stackPlay.push(data.pos),
                stepNumber: that.state.stepNumber + 1,
                isTurnBlack: !that.state.isTurnBlack,
                pos: data.pos,
                withdraw: ''
            });
        });

        //监听重新开始事件
        // type:
        // 1 发起重新开始（需要得到对方同意方可重新开始）
        // 2 因对方离开，被动接受重新开始
        // 3 因得到对方同意，双方重新开始
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
                            "isTurnBlack": data.isTurnBlack,
                            "meBlack": that.state.meBlack,
                            "type": 3
                        });
                    }
                }
            }

            if (type === 2 || type === 3) {
                //console.log('restart');
                that.setState({
                    history: [
                        {
                            squares: Array(board.rows * board.cols).fill(null)
                        }
                    ],

                    stepNumber: 0,
                    gameOver: false,
                    pos: -1,
                    //isTurnBlack: data.isTurnBlack,
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
                        socket.emit('withdraw', {
                            "meBlack": data.meBlack,
                            "step": data.step,
                            "type": type === 1 ? 3 : 4
                        });
                    }
                }
            }

            if (type === 3 || type === 4) {
                that.jumpTo(data.step, data.meBlack);
            }
        });
    }


    //下棋落子对应的点击事件
    handleClick(i) {
        /*history保存着每一步的棋局
         current:当前棋局
         squares：当前棋局详情
         */
        var history = this.state.history.slice(0, this.state.stepNumber + 1);
        var current = history[history.length - 1];
        var squares = current.squares.slice();

        var num = 0;
        var user = 0;
        for (user in this.state.onlineUsers) {
            num++;
        }
        if (num < 2) {
            if (this.state.stepNumber === 0) { //暂时只有一个人登录
                alert('此游戏，需要两个人同时登录，才能玩哦！');
            } else { //对方已经掉线
                alert('Sorry,对方已经断开连接，请重新开始吧！');
            }
            return
        }

        //游戏已经结束 或 棋盘上已经有棋子的地方不能再落子
        if (this.state.gameOver || squares[i]) {
            return;
        }

        playing = true;
        //判断该谁落子
        if (this.state.isTurnBlack !== this.state.meBlack) {
            alert('不着急，等对方先下吧~');
            return;
        }

        socket.emit('play', {'pos': i, 'player': this.state.isTurnBlack})
    }

    //重新开始，分两种情况，1：主动发起，2：因对方离开，被动接受
    restart(type) {
        socket.emit('restart', {"isTurnBlack": this.state.isTurnBlack, "meBlack": this.state.meBlack, "type": type});
    }


    componentDidUpdate() {
        var history = this.state.history.slice(0, this.state.stepNumber + 1);
        var current = history[history.length - 1];
        var squares = current.squares.slice();

        var val = !this.state.isTurnBlack ? "1" : "2"; //1：黑棋 2：白棋

        //如果是悔棋，在无需判断
        if (this.state.withdraw !== '') {
            return;
        }

        //根据当前棋局详情，判断游戏是否已经结束
        if (isGameOVER(squares, this.state.pos, val)) {
            this.state.gameOver = true;
        }

        //console.log(squares, this.state.pos, val);
        // 更新的时候触发
        if (this.state.gameOver) {
            playing = false;
            var msg = '';
            if (!this.state.isTurnBlack === this.state.meBlack) {
                msg = '恭喜你，赢得本局。再来一局吧！';
            } else {
                msg = '非常抱歉，您输了。没关系，再来一局吧！';
            }
            ReactDOM.render(
                <Result msg={msg} desc="重新开始" onClick={() => this.restart(2)}/>,
                document.getElementById('result')
            )
        }

    }

    //悔棋/撤销悔棋事件触发 type: 1悔棋 2撤销悔棋
    withdraw(step, type) {
        if (confirm('需要对方的同意，你确定要' + (type === 1 ? '悔棋' : '撤销悔棋') + '吗？')) {
            socket.emit('withdraw', {"meBlack": this.state.meBlack, "step": step, "type": type});
            document.getElementById('btn_withdraw').disabled = true;
        }
    }

    jumpTo(step, role) {
        if (step < 0 || step > this.state.history.length - 1) { //开始游戏之前，禁止悔棋和撤销悔棋操作
            return;
        }

        if (step === 0) { //若重新开始游戏，则恢复初始状态
            this.setState({
                history: [
                    {
                        squares: Array(board.rows * board.cols).fill(null)
                    }
                ],
                stepNumber: 0,
                isTurnBlack: true,
                gameOver: false,
                pos: -1,
                withraw: role ? 'b' : 'w'
            });
        } else {
            if (this.state.gameOver) {   //若游戏结束，直接返回
                return;
            }
            //若游戏未结束，则执行悔棋步骤
            this.setState({
                stepNumber: step,
                isTurnBlack: !this.state.isTurnBlack,
                gameOver: false,
                withdraw: role ? 'b' : 'w'
            });
        }
    }

    exitGame(){
        if(confirm("您确定要退出游戏吗？")) {
            window.location.reload();
        }
    }

    //渲染
    render() {
        var history = this.state.history;
        var current = history[this.state.stepNumber];

        var role = this.state.meBlack ? 'b' : 'w';

        var btn_restart_disabled = false;
        var btn_withdraw_disabled = true;
        var btn_undowithdraw_disabled = true;

        //悔棋按钮状态逻辑判断
        if (this.state.stepNumber >= 1) {
            btn_restart_disabled = false;
            if (this.state.isTurnBlack !== this.state.meBlack) {
                btn_withdraw_disabled = false;
            }
        } else {
            btn_withdraw_disabled = true;
            btn_restart_disabled = true;
        }

        //撤销悔棋按钮状态逻辑判断
        if (this.state.history.length > this.state.stepNumber + 1) {
            var withrow_role = this.state.meBlack ? 'b' : 'w';
            if (this.state.withdraw === withrow_role) {
                btn_undowithdraw_disabled = false;
            }
        } else {
            btn_undowithdraw_disabled = true;
        }

        var msg = '';
        var curplayer;
        var i = 0;
        var num = 0;
        for (i in this.state.onlineUsers) {
            num++;
        }
        if (this.state.gameOver || num < 2) {
            curplayer = '';
            msg = '你的玩伴还没有来，再等等吧~';
        } else {
            if (this.state.history.length > 1) {
                msg = '正在游戏中......';
            } else {
                msg = '可以开始游戏了~';
            }
            curplayer = this.state.isTurnBlack === this.state.meBlack ? '我' : '对方';
        }

        return (
            <div className="game clearfix">
                <h1>React版五子棋(双人对战）</h1>
                <div className="game-info">
                    <OnlinePlayer role={role} online={this.state.onlineUsers}/>
                    <GameRole msg={msg} curplayer={curplayer}/>
                    <ul id="game-button">
                        <Button disabled={btn_restart_disabled} desc="重新开始" onClick={() => this.restart(1)}/>
                        <Button id='btn_withdraw' disabled={btn_withdraw_disabled} desc="悔棋"
                                onClick={() => this.withdraw(this.state.stepNumber - 1, 1)}/>
                        <Button id='btn_undowithdraw' disabled={btn_undowithdraw_disabled} desc="撤销悔棋"
                                onClick={() => this.withdraw(this.state.stepNumber + 1, 2)}/>
                        <Button id="btn_exit" desc="退出" onClick={()=>this.exitGame()}/>
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
                    squares={current.squares}
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





