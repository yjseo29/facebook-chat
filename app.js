var express = require('express')
  , path = require('path')
  , favicon = require('serve-favicon')
  , cookieParser = require('cookie-parser')
  , bodyParser = require('body-parser')
  , routes = require('./routes/index')
  , app = express()
  , http = require('http').Server(app);
// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.set( "ipaddr", "127.0.0.1" );
app.set( "port", 3020 );

// uncomment after placing your favicon in /public
app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

var httpServer = http.listen(app.get('port'), function(){
	console.log("Express server listening on port " + app.get('port'));
});

var io = require('socket.io').listen(httpServer);

var session = require('express-session')({
	secret: 'sadfwer',
	resave: true,
	saveUninitialized: true
}),
sharedsession = require("express-socket.io-session");
app.use(session);

// 전역 변수
var userList = [];

//controller
require('./routes/oauth')(app,io,userList);
require('./routes/index')(app,io,userList);

// socket
io.on('connection',function(socket){

	socket.on('add_user', function(data){
		console.log(data);
		io.sockets.in("map").emit("res_add_user", {user: data});
	});

	socket.on('join_map', function(data){
		socket.room = "map";
		socket.join("map");
		//클라이언트에게 사용자 리스트 전송
		var users = new Array();
		for (var key in userList) {
			users.push(userList[key]);
		}
		socket.emit("userlist", {users: users});
	});

	socket.on('leave_map', function(data){
		socket.leave("map");
	})

	/** 랜덤사용자 찾기 **/
	socket.on('find_user', function(data){
		userList[data.id].random = true;
		for (var key in userList) {
			users.push(userList[key]);
		}
	});

	/** 로그아웃 **/
	socket.on('logout', function(data){
		socket.leave("map");

		//사용자 리스트 삭제
		io.sockets.in("map").emit("res_delete_user", {id: userList[data.id].id});
		delete userList[data.id];
	});

	/** 접속 해제 **/
	socket.on('disconnect', function(){

	});
});


// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
  app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
      message: err.message,
      error: err
    });
  });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
  res.status(err.status || 500);
  res.render('error', {
    message: err.message,
    error: {}
  });
});

module.exports = app;