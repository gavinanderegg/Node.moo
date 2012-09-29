var parse = require('./parse');
var _ = require('underscore');

var allObjects = [];

function Thing(names, adjectives) {
	this.names = names.slice();

	_.each(this.names, function(v) {
		parse.addNoun(v);
	});

	this.names.push('object-' + allObjects.length);

	this.adjectives = adjectives.slice();

	_.each(this.adjectives, function(a) {
		parse.addAdjective(a);
	});

	this.verbs = {};

	allObjects.push(this);
}

Thing.prototype.matches = function(phrase) {
	if (this.names.indexOf(phrase.noun) == -1) {
		return false;
	}

	var adjectivesOk = true;
	var ourAdjectives = this.adjectives;
	_.each(phrase.adjectives, function(adjective) {
		if (ourAdjectives.indexOf(adjective) == -1) {
			adjectivesOk = false;
		}
	});
	return adjectivesOk;
}

Thing.prototype.verboseName = function() {
	var name = this.adjectives.join(' ') + ' ' + this.names[0];
	if (this.names.length > 1) {
		name = name + ' (' + this.names.slice(1).join(', ') + ')';
	}
	return name;
}

Thing.prototype.contents = function() {
	return _.filter(allObjects, function (o) { return o.parent = this; });
}

Thing.prototype.setVerbHandler = function(name, handler) {
	this.verbs[name] = _.bind(handler, this);
	
	parse.addVerb(name);
}

var theRoom = new Thing(['house'], ['']);
var apple = new Thing(['apple'], ['red']);
apple.parent = theRoom;
apple.setVerbHandler('eat', function(parseResult, reply) {
	reply("you eat the " + this.names[0]);
});

var apple = new Thing(['apple'], ['blue']);
apple.parent = theRoom;
apple.setVerbHandler('eat', function(parseResult, reply) {
	reply("you eat the " + this.names[0]);
});


function matchingThings(room, phrase) {
	var result = []
	_.each(room.contents(), function(o) {
		if (o.matches(phrase)) {
			result.push(o);
		}
	});
	return result;
}

exports.handle = function(data, reply) {
	parse.parse(data, function(error, parseResult) {
		if(error) {
			reply("error: " + error);
		} else {
			if (parseResult.object) {
				var things = matchingThings(theRoom, parseResult.object);
				if (things.length == 0) {
					reply("I don't see any " + formatNounPhrase(parseResult.object));
				} else if (things.length > 1) {
					reply("There are several. Please be more specific.");
					_.each(things, function(o) {
						reply(" * " + o.verboseName());
					});
				} else {
					var thing = things[0];
					var handler = thing.verbs[parseResult.verb];
					if (handler) {
						handler(parseResult, reply);
					} else {
						handleGlobal(parseResult, thing, reply);
					}
				}
			} else {
				handleGlobal(parseResult, null, reply);
			}
		}
	});
}

function handleGlobal(parseResult, directObject, reply) {
	if(parseResult.verb == 'say') {
		reply('You say "'  + parseResult.text + '".');
	}
}

function formatNounPhrase(phrase) {
	return phrase.adjectives.join(' ') + ' ' + phrase.noun;
}
