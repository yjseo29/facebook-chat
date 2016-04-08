var express = require('express')
  , path = require('path')
  , favicon = require('serve-favicon')
  , cookieParser = require('cookie-parser')
  , bodyParser = require('body-parser')
  , routes = require('./routes/index')
  , app = express()
  , http = require('http').Server(app)
  , fs = require('fs')
  , mkdirp = require('mkdirp')
  , base64 = require('node-base64-image')
  , gm = require('gm').subClass({imageMagick: true});
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
});
app.use(session);

// 전역 변수
var userList = [];

//controller
require('./routes/oauth')(app,io,userList);
require('./routes/index')(app,io,userList);

// socket
io.sockets.on('connection',function(socket){

	/** 메인페이지 접근시 소켓에 사용자정보 설정 **/
	socket.on('init_user', function(data){
		userList[data.id].state = "ready";
		userList[data.id].socket_id = socket.id;
		socket.username = data.name;
		if(socket.room != undefined){
			io.sockets.in(socket.room).emit("broadcast_message", {msg: socket.username+"님이 퇴장하였습니다.", time:getTime()});
			socket.leave(socket.room);
		}
	});

	/** 로그인한 사용자 맵에 추가 **/
	socket.on('add_user', function(data){
		io.sockets.in("map").emit("res_add_user", {user: data});
	});

	/** 맵 소켓룸 참여 **/
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

	/** 맵 소켓룸 나가기 **/
	socket.on('leave_map', function(data){
		socket.leave("map");
	});

	/** 랜덤사용자 찾기 **/
	socket.on('find_user', function(data){
		userList[data.id].random = true;
		userList[data.id].socket_id = socket.id;

		var userArray = new Array();
		if(data.gender == "all"){
			for (var key in userList) {
				if(userList[key].random && userList[key].id != data.id){
					userArray.push(userList[key]);
				}
			}
		}else{
			for (var key in userList) {
				if(userList[key].random && userList[key].id != data.id && userList[key].gender == data.gender){
					userArray.push(userList[key]);
				}
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

	/** 대화시작 상태 중지 **/
	socket.on('set_fail_random', function(data){
		userList[data.id].random = false;
	});

	/** 대화방 초기화 **/
	socket.on('init_chat', function(data){
		socket.room = data.uid;
		socket.join(data.uid);
		socket.username = data.name;
		userList[data.id].state = "chat";
	});

	/** 대화방 시작 **/
	socket.on('start_chat', function(data){
		io.sockets.in(data.uid).emit("broadcast_message", {msg: socket.username+"님이 입장하였습니다.", time:getTime()});
	});

	/** 대화방 나가기 **/
	socket.on('leave_chat', function(data){
		if(socket.room != undefined){
			userList[data.id].state = "ready";
			io.sockets.in(socket.room).emit("broadcast_message", {msg: socket.username+"님이 퇴장하였습니다.", time:getTime()});
			socket.leave(socket.room);
		}
	});

	/** 대화초대 **/
	socket.on('invite_chat', function(data){
		if(userList[data.id].state == "ready"){
			io.sockets.in(userList[data.id].socket_id).emit("res_invite_chat", {type: "invite", name: userList[data.uid].name, id:data.id, uid:data.uid, time:getTime()});
			socket.emit("invite_chat_result", {result: true, name: data.name});
		}else{
			socket.emit("invite_chat_result", {result: false, name: data.name});
		}
	});

	/** 클라이언트 대화초대 응답 **/
	socket.on('req_invite_accept', function(data){
		io.sockets.in(userList[data.uid].socket_id).emit("res_invite_chat", {type: data.type, name: userList[data.id].name, id:data.id, uid:data.uid, time:getTime()});
		io.sockets.in(userList[data.id].socket_id).emit("res_invite_chat", {type: data.type, name: userList[data.uid].name, id:data.uid, uid:data.uid, time:getTime()});

	});

	/** 대화 수신 **/
	socket.on('send_msg', function(data){
		io.sockets.in(socket.room).emit("receive_message", {msg: data.msg, time:getTime(), id:data.id, type:"message", username: socket.username});
	});

	/** 이미지 업로드 처리 **/
	socket.on('image_upload',function(data){
		var date = new Date();
		var path = "upload/original/"+date.getFullYear()+"/"+(date.getMonth()+1)+"/";
		var thumbPath = "upload/thumb/"+date.getFullYear()+"/"+(date.getMonth()+1)+"/";
		var fileName = Math.floor(Date.now() / 1000)+randomString();

		var options = {filename: "public/"+path+fileName};
		var imageData = new Buffer(data.baseurl, 'base64');

		try{
			fs.statSync("public/"+path).isDirectory();
			base64.base64decoder(imageData, options, function (err, saved) {
				fs.stat("public/"+path+fileName+".jpg", function(err, stat) {
					if (err) { console.log(err); throw err; }

					if(stat.size > 500000){
						//썸네일 생성
						gm("public/"+path+fileName+".jpg")
							.quality(80)
							.resize(1024, 1024)
							.autoOrient()
							.write("public/"+thumbPath+fileName+".jpg", function (err) {
								//if (!err) console.log('done');
								io.sockets.in(socket.room).emit('receive_message', {msg:thumbPath+fileName+".jpg",username:socket.username,type:"image",id:data.id,time:getTime()});
							});
					}
				});
				if (err) { console.log(err); throw err; }
			});
		}catch(e){
			mkdirp("public/"+path, function(err) {
				if(err) throw err;
				mkdirp("public/"+thumbPath, function(err) {
					if(err) throw err;
					base64.base64decoder(imageData, options, function (err, saved) {
						if (err) { console.log(err); throw err; }

						fs.stat("public/"+path+fileName+".jpg", function(err, stat) {
							if (err) { console.log(err); throw err; }
							if(stat.size > 500000){
								//썸네일 생성
								gm("public/"+path+fileName+".jpg")
									.quality(80)
									.resize(1024, 1024)
									.autoOrient()
									.write("public/"+thumbPath+fileName+".png", function (err) {
										//if (!err) console.log('done');
										io.sockets.in(socket.room).emit('receive_message', {msg:thumbPath+fileName+".jpg",username:socket.username,type:"image",id:data.id,time:getTime()});
									});
							}
						});
					});
				});
			});
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
		if(socket.room != undefined){
			io.sockets.in(socket.room).emit("broadcast_message", {msg: socket.username+"님이 퇴장하였습니다.", time:getTime()});
			socket.leave(socket.room);
		}
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

function randomString(){
	var text = "";
	var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
	for( var i=0; i < 4; i++ ) text += possible.charAt(Math.floor(Math.random() * possible.length));

	return text;
}

module.exports = app;