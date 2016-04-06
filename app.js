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
io.sockets.on('connection',function(socket){

	socket.on('init_socket_id', function(data){
		userList[data.id].socket_id = socket.id;
	});

	socket.on('add_user', function(data){
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
	});

	/** 랜덤사용자 찾기 **/
	socket.on('find_user', function(data){
		userList[data.id].random = true;
		userList[data.id].socket_id = socket.id;
		socket.username = userList[data.id].name;

		var userArray = new Array();
		for (var key in userList) {
			if(userList[key].random && userList[key].id != data.id && userList[key].gender == data.gender){
				userArray.push(userList[key]);
			}
		}
		if(userArray.length == 0){
			socket.emit("init_random", {result: "fail"});
		}else{
			var targetUser = userArray[Math.floor(Math.random()*userArray.length)];

			userList[data.id].random = false;
			targetUser.random = false;

			io.sockets.in(userList[data.id].socket_id).emit("init_random", {user: targetUser, result: "success", uid:data.id});
			io.sockets.in(targetUser.socket_id).emit("init_random", {user: userList[data.id], result: "success", uid:data.id});
		}
	});

	/** 대화방 초기화 **/
	socket.on('init_chat', function(data){
		socket.room = data.uid;
		socket.join(data.uid);
		io.sockets.in(data.uid).emit("broadcast_message", {msg: socket.username+"님이 입장하였습니다.", time:getTime()});
	});

	/** 대화초대 **/
	socket.on('invite_chat', function(data){
		io.sockets.in(userList[data.uid].socket_id).emit("res_invite_chat", {name: userList[data.id].name, id:data.id, uid:data.uid, time:getTime()});
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

function getTime(){
	var date = new Date();
	var time;
	if (date.getHours() <= 12) {
		time = "오전 "+date.getHours()+":"+parseMinute(date.getMinutes());
	}else {
		time = "오후 "+(date.getHours()-12)+":"+parseMinute(date.getMinutes());
	}
	return time;
}

function parseMinute(minute){
	if(minute < 10) {
		return "0" + minute;
	}else{
		return minute;
	}
}

module.exports = app;