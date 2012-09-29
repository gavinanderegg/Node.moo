var handlers = {};

exports.setVerbHandler = function(name, callback) {
	handlers[name] = callback;
}

exports.run = function(parseResult, callback) {
	process.nextTick(function () {
		var verb = parseResult.verb;
		var handler = handlers[verb];
		if (handler) {
			handler(parseResult, callback);
		}  else {
			callback("Verb " + verb + " not understood");
		}
	});
}
