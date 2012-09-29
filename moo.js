var world = {};
var clients = [];

var http = require('http');
var underscore = require('underscore');
var fs = require('fs');
var io = require('socket.io');

server = http.createServer(function(request, response) {
	fs.readFile(__dirname + '/index.html', function (err, html) {
		if (err) {
			
		}
		
		response.writeHeader(200, {"Content-Type": "text/html"});  
		response.write(html);
		response.end();
	});
}).listen(3000);

io = io.listen(server);

io.sockets.on('connection', function (socket) {
	socket.emit('news', { hello: 'world' });
	socket.on('my other event', function (data) {
		console.log(data);
	});
});
