var clients = [];

var http = require('http');
var underscore = require('underscore');
var fs = require('fs');
var io = require('socket.io');
var world = require('./world');

server = http.createServer(function(request, response) {
	fs.readFile(__dirname + '/index.html', function (err, html) {
		response.writeHeader(200, {"Content-Type": "text/html"});
		response.write(html);
		response.end();
	});
}).listen(3000);

io = io.listen(server);

io.sockets.on('connection', function (socket) {
	console.log('Socket connected');

	var user = null;
	
	socket.on('newuser', function (data) {
		socket.emit('message', 'Hello, ' + data + '!');
		
		 clients.push({
			'username': data
		});
		
		user = world.addUser(data, socket);
		
		socket.emit('newuser', 'connected');
	});
	
	socket.on('message', function (data) {
		socket.emit('message', '<br><b>>> ' + data + '</b>');
		world.handle(data, user);
	});
});
