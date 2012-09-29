var world = {};
var clients = [];

var underscore = require('underscore');

// var express = require('express');
// var app = express();

var http = require('http');
var fs = require('fs');

// app.get('/', function(req, res) {
// 	fs.readFile('./index.html', function (err, html) {
// 		res.set('Content-Type', 'text/html');
// 		res.send(html);
// 	});
// });
// 
// app.listen(3000);



fs.readFile('./index.html', function (err, html) {
	http.createServer(function(request, response) {  
		response.writeHeader(200, {"Content-Type": "text/html"});  
		response.write(html);
		response.end();
	}).listen(3000);
	
	
});
