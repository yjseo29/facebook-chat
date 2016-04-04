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

//
// controller
//
require('./routes/oauth')(app);
app.use('/', routes);



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