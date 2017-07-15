/**
 * Description: 五子棋Dom版
 * Author: Rita Huang
 * Date: 2017/7/8.
 */

/*
 GoBang对象用于根据五子棋规则判断当前棋局是否结束
 */
const GoBang = {
    winChesses: 5,   //能赢连续的棋子数

    //横向判断
    isVerWin: function (chessBoard, row, col, val) {
        let counter = 1;
        //1.向左，计算连续棋子数
        for (let j = col - 1; j >= 0; j--) {
            if (chessBoard[row][j] === val) {
                counter++;
            } else {
                break;
            }
        }

        //2.向右，计算连续棋子数
        for (let j = col + 1; j < chessBoard[0].length; j++) {
            if (chessBoard[row][j] === val) {
                counter++;
            } else {
                break;
            }
        }

        return counter >= this.winChesses;
    },

    //纵向判断
    isHorWin: function (chessBoard, row, col, val) {
        let counter = 1;
        //向上，找连续棋子数
        for (let i = row - 1; i >= 0; i--) {
            if (chessBoard[i][col] === val) {
                counter++;
            } else {
                break;
            }
        }

        //2 向下，找连续棋子数
        for (let i = row + 1; i < chessBoard.length; i++) {
            if (chessBoard[i][col] === val) {
                counter++;
            } else {
                break;
            }
        }

        return counter >= this.winChesses;
    },

    //正对角向判断
    isPosDiagWin: function (chessBoard, row, col, val) {
        let counter = 1;

        //1 右上, 找连续棋子数
        for (let i = row - 1, j = col + 1; i >= 0 && j < chessBoard[0].length; i--, j++) {
            if (chessBoard[i][j] === val) {
                counter++;
            } else {
                break;
            }
        }
        //2 左下, 找连续棋子数
        for (let i = row + 1, j = col - 1; i < chessBoard.length && j >= 0; i++, j--) {
            if (chessBoard[i][j] === val) {
                counter++;
            } else {
                break;
            }
        }

        return counter >= this.winChesses;
    },

    //斜对角向判断
    isNegDiagWin: function (chessBoard, row, col, val) {
        let counter = 1;
        //1 左上, 找连续棋子数
        for (let i = row - 1, j = col - 1; i >= 0 && j >= 0; i--, j--) {
            if (chessBoard[i][j] === val) {
                counter++;
            } else {
                break;
            }
        }
        //2 右下, 找连续棋子数
        for (let i = row + 1, j = col + 1; i < chessBoard.length && j < chessBoard[0].length; i++, j++) {
            if (chessBoard[i][j] === val) {
                counter++;
            } else {
                break;
            }
        }

        return counter >= this.winChesses;
    },

    isWin: function (chessBoard, row, col, val) {
        //先简单根据棋盘大小来判断
        if (chessBoard.length < this.winChesses && chessBoard[0].length < this.winChesses) {
            return false;
        } else {
            //四个方向（横、纵、对角、斜对角）依次判断
            return GoBang.isVerWin(chessBoard, row, col, val) || GoBang.isHorWin(chessBoard, row, col, val)
                || GoBang.isPosDiagWin(chessBoard, row, col, val) || GoBang.isNegDiagWin(chessBoard, row, col, val);
        }
    },
};

const Game = {
        //canvas 对象
        canvas: {
            context: [],     //canvas 对象
            cellwidth: 35,       //格子的宽度
            cellheight: 35,      //格子的高度
        },

        //棋盘
        board: {
            rows: 15,       //行数
            cols: 15,       //列数
        },

        //游戏信息
        info: {
            type: 1,           //1dom 2canvas
            isOver: false,     //游戏结束标志
            isBlack: true,     //当前是否是黑
            arrBoard: [],      //二维数组，记录棋局, 0: 空  1：黑棋  2：白棋
            stackPlay: [],     //走棋栈：存放下棋的每一步,用于悔棋
            stackWithDraw: [], //悔棋栈：存放悔棋的每一步，用于撤销悔棋
        },

        //判断游戏是否结束
        isGameOver: function (row, col, val) {
            return GoBang.isWin(Game.info.arrBoard, row, col, val);
        },

        //更新button的状态
        disableBtn: function (domId) {
            $("#" + domId).attr('disabled', true);
        },

        enableBtn: function (domId) {
            $("#" + domId).removeAttr('disabled');
        },

        //在页面画出棋子（DOM)
        drawDomBoard: function (row, col, val) {
            let domId = row * Game.board.cols + col;
            if (val === 1) {
                $("#" + domId).css("backgroundImage", "url(images/b.png)");
            } else if (val === 2) {
                $("#" + domId).css("backgroundImage", "url(images/w.png)");
            } else {
                $("#" + domId).css("backgroundImage", "none");
            }
        },

        //在页面画出棋子（Canvas)
        drawCanvasBoard(row, col, val){
            let w = Game.canvas.cellwidth;
            let h = Game.canvas.cellheight;
            Game.canvas.context.beginPath();
            let offsetX = 5; //棋盘偏移值
            let offsetY = 5;
            Game.canvas.context.arc(row * w + w / 2 + offsetX , col * h + h / 2 + offsetY , w / 2 - 1, 0, 2 * Math.PI);//绘制棋子
            let g = Game.canvas.context.createRadialGradient(row * w + w / 2 + offsetX, col * h + h / 2 + offsetY, w / 2 - 1, row * w + w / 2 + offsetX, col * h + h / 2 + offsetY, 0);//设置渐变
            if (val === 1) {
                g.addColorStop(0, '#0A0A0A');//黑棋
                g.addColorStop(1, '#636766');

                Game.canvas.context.fillStyle = g;
                Game.canvas.context.fill();
            } else if (val === 2) {
                g.addColorStop(0, '#D1D1D1');//白棋
                g.addColorStop(1, '#F9F9F9');
                Game.canvas.context.fillStyle = g;
                Game.canvas.context.fill();
            } else {
                //清除棋子
                Game.canvas.context.clearRect(row * w + 1 + offsetX, col * h + 1 + offsetY, w - 2 , h - 2 );
                Game.canvas.context.fillStyle = 'rgba(255, 255, 255, 0)';
                Game.canvas.context.fillRect(row * w + 1 + offsetX, col * h + 1 + offsetY, w - 2 +offsetX, h - 2 + offsetY);
            }
        },


        //更新棋盘，包括以下三部分：
        //1.更新页面上的棋子，分三种情况：0无子 1黑子 2白子
        //2.更新棋盘对应数据
        //3.当前走的这一步入下棋栈
        updateBoard: function (row, col, val) {
            //在页面画出棋子
            if (Game.info.type === 1) {
                Game.drawDomBoard(row, col, val);
            } else {
                Game.drawCanvasBoard(row, col, val);
            }

            //更新棋盘数据指定位置的值
            Game.info.arrBoard[row][col] = val;

            //根据当前情况入栈，分两种情况：
            //1.悔棋 （val = 0),入到悔棋栈 （撤销悔棋时用）
            //2.走棋，入到走棋栈
            if (val === 0) {

                Game.info.stackWithDraw.push({row: row, col: col, val: !Game.info.isBlack ? 1 : 2});
            } else {
                Game.info.stackPlay.push({row: row, col: col, val: val});
            }

            //轮换更新下棋方
            Game.info.isBlack = !Game.info.isBlack;
            $('.curplayer').html(Game.info.isBlack ? '黑方' : '白方');
        },

        //棋盘点击事件
            boardClick: function (row, col, type) {
            //游戏结束或落子处非空，此步走棋无效，直接返回
            if (Game.info.gameOver || Game.info.arrBoard[row][col] !== 0) {
                return;
            }

            //一旦走棋，禁掉撤销按钮，并清除之前的栈数据
            if (Game.info.stackWithDraw.length > 0) {
                Game.initStack();
            }

            //获取当前棋子值，更新棋盘
            let val = Game.info.isBlack ? 1 : 2; //1黑 2白
            Game.updateBoard(row, col, val);

            if (Game.isGameOver(row, col, val)) {
                //置上结束标志
                Game.info.gameOver = true;

                //发布比赛结果
                let role = (val === 1 ? '黑方' : '白方');
                $('#msg').html('游戏已结束，' + role + '赢了！');
                $('#result').show();
            } else {
                //更新button状态，使能重新下棋和悔棋按钮（游戏规则：游戏开始后，允许重新开始、悔棋）
                Game.enableBtn('btnWithdraw');
                Game.enableBtn('btnRestart');
                Game.disableBtn('btnUndoWithdraw');
            }
        },

        //Dom版初始化棋盘，包括棋盘格子的点击事件、棋盘数据（二维数组)
        initDomBoard: function (rows, cols) {
            let html = '';
            let domId = 0;

            for (let i = 0; i < rows; i++) {
                for (let j = 0; j < cols; j++) {
                    domId = i * cols + j;
                    html += '<div class="cell" id=' + domId + ' onClick=Game.boardClick(' + i + ',' + j +')>';
                    html += '</div>';
                }
            }
            $('#chess-board-wrapper').empty().append('<div id="board" class="chess-board"> </div>');
            $("#board").append(html);
        },

        //Canvas画出棋盘
        initCanvasBoard: function (rows, cols) {
            $('#chess-board-wrapper').empty().append('<canvas id="chess-board-canvas" class="fl" width="535px" height="535px"></canvas>');
            $('#chess-board-canvas').on('click', function (e) {
                let x = e.offsetX - 5; //相对于棋盘左上角的x坐标
                let y = e.offsetY - 5; //相对于棋盘左上角的y坐标
                let row = Math.floor(x / Game.canvas.cellwidth);
                let col = Math.floor(y / Game.canvas.cellheight);
                Game.boardClick(row, col, 2);
            });

            let board = $('#chess-board-canvas')[0];
            Game.canvas.context = board.getContext('2d');

            $('#result').hide();
        },

        //初始化棋盘数据
        initBoardData: function (rows, cols) {
            for (let i = 0; i < rows; i++) {
                Game.info.arrBoard[i] = [];
                for (let j = 0; j < cols; j++) {
                    Game.info.arrBoard[i][j] = 0;
                }
            }
        },

        //初始化游戏基本信息
        initInfo: function (type) {
            Game.info = {
                type: type,
                isOver: false,     //游戏结束标志
                isBlack: true,     //当前是否是黑
                arrBoard: [],      //二维数组，记录棋局, 0: 空  1：黑棋  2：白棋
                stackPlay: [],     //走棋栈：存放下棋的每一步,用于悔棋
                stackWithDraw: [], //悔棋栈：存放悔棋的每一步，用于撤销悔棋
            }
        },

        //初始化button
        initButton: function () {
            Game.disableBtn('btnRestart');
            Game.disableBtn('btnWithdraw');
            Game.disableBtn('btnUndoWithdraw');
        },

        //初始化堆栈
        initStack: function () {
            Game.info.stackPlay = [];
            Game.info.stackWithDraw = [];
        },

        //初始化游戏
        init: function (type) {
            Game.initInfo(type);
            if (type === 1) {
                Game.initDomBoard(Game.board.rows, Game.board.cols);
            } else {
                Game.initCanvasBoard(Game.board.rows, Game.board.cols);
            }

            Game.initBoardData(Game.board.rows, Game.board.cols);
            Game.initButton();
            $('.curplayer').html('黑方');
            $('#result').hide();
        },

        //初始化事件
        initEvent: function (type) {
            //重新开始游戏,即重新初始化
            $('.btn-restart').on('click', function () {
                Game.init(type);
            });

            //悔棋，将棋子从走棋栈中出栈
            $('#btnWithdraw').on('click', function () {
                let cell = Game.info.stackPlay.pop();
                if (cell === undefined) {
                    alert('已经没有棋可以悔了哦~');
                    Game.disableBtn('btnWithdraw');
                    return;
                }

                //用val=0值，更新棋盘
                Game.updateBoard(cell.row, cell.col, 0);

                //使能撤销悔棋按钮
                Game.enableBtn('btnUndoWithdraw');

                if (Game.info.stackPlay.length < 1) {
                    Game.disableBtn('btnWithdraw');
                }
            });

            //撤销悔棋
            $('#btnUndoWithdraw').on('click', function () {
                let cell = Game.info.stackWithDraw.pop();
                if (cell === undefined) {
                    alert('已经没有棋可以撤销了哦~');
                    Game.disableBtn('btnUndoWithdraw');
                    return;
                }

                //更新棋盘
                Game.updateBoard(cell.row, cell.col, cell.val);

                //不允许嵌套悔棋
                //Game.enableBtn('btnWithdraw');

                if (Game.info.stackWithDraw.length < 1) {
                    Game.disableBtn('btnUndoWithdraw');
                }
            });

            //退出游戏
            $('#btnExit').on('click',function(){
                if(confirm("您确定要退出游戏吗？")) {
                    window.opener = null;
                    window.open('', '_self');
                    window.close();
                }
            });
        },
    };

