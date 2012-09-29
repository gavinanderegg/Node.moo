var world = {};
var clients = [];

var underscore = require('underscore');
var http = require('http');
var fs = require('fs');

fs.readFile('./temp.html', function (err, html) {
	http.createServer(function(request, response) {  
		response.writeHeader(200, {"Content-Type": "text/html"});  
		response.write(html);
		response.end();
	}).listen(3000);
	
	
});
