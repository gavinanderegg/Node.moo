var parse = require('./parse'),
	prompt = require('prompt'),
    _ = require('underscore'),
	action = require('./action');

_.each(['eat', 'take', 'give'], function(v) {
    parse.addVerb(v);
});

_.each(['the', 'red', 'blue', 'green', 'big', 'small'], function(a) {
    parse.addAdjective(a);
});

_.each(['apple', 'pen', 'house'], function(n) {
    parse.addNoun(n);
});

action.setVerbHandler('eat', function(parseResult, callback) {
	if (parseResult.object) {
		callback(null, 'you eat the ' + JSON.stringify(parseResult.object));
	} else {
		callback(null, 'you have nothing to eat!');
	}
});

prompt.start();
function readOne() {
	prompt.get('phrase', function(err, result) {
		parse.parse(result.phrase, function(error, result) {
			if(error) {
				console.error(error);
			} else {
				console.log(JSON.stringify(result, null, '  '));
				action.run(result, function(error, result) {
					if (error) { 
						console.error(error);
						readOne();
					} else {
						console.log(result);
						readOne();
					}
				});
			}
		});
	});
}

readOne();
