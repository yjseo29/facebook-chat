var express = require('express');
var router = express.Router();
var FacebookStrategy = require('passport-facebook').Strategy;

/* GET home page. */
router.get('/', function(req, res, next) {
	console.log(req.user);
	if(req.user !== undefined){
		res.render('home', { user: req.session.passport.user });
	}else{
		res.render('index');
	}
});


/* 메인 페이지 */
router.post('/', function(req, res, next) {
	res.render('index', { title: 'Express' });
});


module.exports = router;