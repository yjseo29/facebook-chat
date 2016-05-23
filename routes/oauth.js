module.exports = init;
function init(app, io, userList) {
	var passport = require('passport');
	app.use(passport.initialize());
	app.use(passport.session());

	passport.serializeUser(function (user, done) {
		done(null, user);
	});
	passport.deserializeUser(function (obj, done) {
		done(null, obj);
	});

	var FacebookStrategy = require('passport-facebook').Strategy;
	passport.use(new FacebookStrategy({
			clientID: "801142736696953",
			// done 메소드에 전달된 정보가 세션에 저장된다.
			clientSecret: "79d11bcddba54aa3125b30dec5ab4fc2",
				callbackURL: "http://chat.yjteam.co.kr/auth/facebook/callback",
				profileFields: ['id', 'gender', 'locale', 'name', 'timezone', 'displayName', 'link']
		},
		function (accessToken, refreshToken, profile, done) {
			//
			// !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
			// req.session.passport 정보를 저장하는 단계이다.
			// !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
			//
			return done(null, profile);
		}));


	app.get('/auth/facebook', passport.authenticate('facebook'));
	//
	// redirect 실패/성공의 주소를 기입한다.
	//
	app.get('/auth/facebook/callback', passport.authenticate('facebook', {
		successRedirect: '/',
		failureRedirect: '/'
	}));
	app.get('/logout', function (req, res) {
		//
		// passport 에서 지원하는 logout 메소드이다.
		// req.session.passport 의 정보를 삭제한다.
		//

		req.session.destroy();

		req.logout();
		res.redirect('/');
	});
}
