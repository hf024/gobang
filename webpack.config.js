const webpack = require("webpack");

//获取多入口文件方法:
/*
function getEntry() {
    var entry = {};
    var srcDirName = __dirname + '/src/js/*.jsx'; //需要获取的文件路径

    var n = '';
    //console.log(srcDirName); // /Users/apple/rita/web/react/demo/js/*.jsx
    glob.sync(srcDirName).forEach(function (name) {
        //console.log(name); // /Users/apple/rita/web/react/demo/js/createclass.jsx

        //从带路径的文件名中截取文件名
        n = name.slice(name.lastIndexOf('/') + 1, name.lastIndexOf('.'));
        console.log(n);
        entry[n] = name;
    });

    //entry["index"] = "webpack-dev-server/client?http://localhost:8080/"; //hot replace

    console.log('entry：' + entry);

    return entry;
}
*/
module.exports = {
    devtool: 'eval-source-map',

     entry: {
     	"react_gobang": __dirname + "/src//js/react_gobang.jsx"
     },//唯一入口文件
     
    output: {
        path: __dirname + "/public/js",//打包后的文件存放的地方
        filename: "[name].js", //打包后输出文件的文件名
        chunkFilename: "[name].js",
        publicPath: "/"
    },

    module: {//在配置文件里添加label loader (jsx=>js)
        loaders: [
            {
                test: /\.jsx$/,
                exclude: /node_modules/,
                loader: 'babel-loader',//在webpack的module部分的loaders里进行配置即可        
		 query: {  
                    presets: ['react']  
                }  
            }

        ]
    },
    plugins: [
        //new webpack.HotModuleReplacementPlugin(),
        //new ExtractTextPlugin("[name].css")
    ],

    devServer: {
        //contentBase: "./public",//本地服务器所加载的页面所在的目录
        //colors: true,//终端中输出结果为彩色
        historyApiFallback: true,//不跳转
        hot: true,
        //progress: true,
        //open: true,
        inline: true//实时刷新
    }
};
