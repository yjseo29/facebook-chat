module.exports = function(app, io, userList) {

	/* 메인 페이지 */
	app.get('/', function(req, res, next) {
		console.log(req.session.passport);
		console.log(req.isAuthenticated());
		if(req.session.passport !== undefined){
			if(req.session.lat !== undefined){
				res.render('home', { user: req.session.passport.user, lat: req.session.lat, lng: req.session.lng });
			}else{
				res.render('map', { user: req.session.passport.user });
			}

		}else{
			res.render('index');
		}
	});

	/* 지도 위치 설정 */
	app.post('/setLocation', function(req, res, next){

		if(req.session.passport.user !== undefined) {
			req.session.lat = req.body.lat;
			req.session.lng = req.body.lng;

			//사용자 리스트에 추가
			if (userList[req.session.passport.user.id] == undefined) {
				userList[req.session.passport.user.id] = new Object();
				userList[req.session.passport.user.id].name = req.session.passport.user.displayName;
				userList[req.session.passport.user.id].id = req.session.passport.user.id;
				userList[req.session.passport.user.id].lat = req.body.lat;
				userList[req.session.passport.user.id].lng = req.body.lng;
				userList[req.session.passport.user.id].gender = req.user.gender;
				userList[req.session.passport.user.id].random = false;
			}
		}

		//io.sockets.in("home").emit('userCnt', {cnt:Object.keys(userList).length});
		res.redirect('/');
	});

	app.get('/setLocation', function(req, res, next){
		res.redirect('/');
	});
};