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
};

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
};

Thing.prototype.verboseName = function() {
	var name = this.adjectives.join(' ') + ' ' + this.names[0];
	if (this.names.length > 1) {
		name = name + ' (' + this.names.slice(1).join(', ') + ')';
	}
	return name;
};

Thing.prototype.simpleName = function() {
	return this.names[0];
};

Thing.prototype.contents = function() {
	var that = this;
	return _.filter(allObjects, function (o) { return o.parent == that;});
};

Thing.prototype.setVerbHandler = function(name, handler) {
	this.verbs[name] = _.bind(handler, this);
	parse.addVerb(name);
};

Thing.prototype.description = function() {
	var description;
	
	if (this.desc) {
		description = this.desc;
	} else {
		description = this.verboseName();
	}
	
	return description;
};

Thing.prototype.send = function(text) {
	if(this.socket) {
		this.socket.emit('message', text);
	}
};

Thing.prototype.sendToOthers = function(text) {
	var that = this;
	_.each(this.parent.contents(), function(other) {
		if (other != that) {
			other.send(text);
		}
	});
};

var theRoom = new Thing(['house'], ['']);
var apple = new Thing(['apple'], ['red']);
apple.parent = theRoom;
apple.setVerbHandler('eat', function(parseResult, user) {
	user.send("you eat the " + this.names[0]);
});

var apple2 = new Thing(['apple'], ['blue']);
apple2.parent = theRoom;
apple2.setVerbHandler('eat', function(parseResult, user) {
	user.send("you eat the " + this.names[0]);
});


function matchingThings(room, phrase) {
	var result = [];
	_.each(room.contents(), function(o) {
		if (o.matches(phrase)) {
			result.push(o);
		}
	});
	return result;
}

function findThing(room, phrase, user) {
	var things = matchingThings(theRoom, phrase);
	if (things.length == 0) {
		user.send("I don't see any " + formatNounPhrase(phrase));
		return false;
	} else if (things.length > 1) {
		user.send("There are several. Please be more specific.");
		_.each(things, function(o) {
			user.send(" * " + o.verboseName());
		});
		return false;
	} else {
		var thing = things[0];
		return thing;
	}
}

exports.handle = function(data, user) {
	parse.parse(data, function(error, parseResult) {
		if(error) {
			user.send("error: " + error);
		} else {
			if (parseResult.object) {
				var thing = findThing(theRoom, parseResult.object, user);
				if (thing) {
					var handler = thing.verbs[parseResult.verb];
					if (handler) {
						handler(parseResult, user);
					} else {
						handleGlobal(parseResult, thing, user);
					}
				}
			} else {
				handleGlobal(parseResult, null, user);
			}
		}
	});
};

exports.addUser = function(name, socket) {
	var newUser = new Thing([name, 'user'], ['newb']);
	newUser.parent = theRoom;
	newUser.socket = socket;
	return newUser;
};

var globalVerbs = {};
function addGlobalVerb(names, callback) {
	_.each(names, function(name) {
		parse.addVerb(name);
		globalVerbs[name] = callback;
	});
};

addGlobalVerb(['say', 's'], function(parseResult, directObject, user) {
	var text = parseResult.text.trim();
	var last = text[text.length - 1];
	if (last != '.' && last != '?' && last != '!') {
		text = text + '.';
	}
	user.send('You say "'  + text + '"');
	user.sendToOthers(user.simpleName() + ' says "' + text + '"');
});

addGlobalVerb(['look', 'l'], function(parseResult, directObject, user) {
	var place = user.parent;
	
	user.send(place.desc);
	user.send('Also here:');
	
	var objList = '';
	_.each(place.contents(), function(i) {
		objList += i.simpleName() + ', ';
	});
	objList = objList.slice(0, objList.length -2);
	
	user.send(objList);
});


addGlobalVerb('create', function(parseResult, directObject, user) {
	var newThing = new Thing(parseResult.thingName, parseResult.adjectives);
	newThing.parent = user.parent;

	user.send("You create a new thing: "+newThing.simpleName());

});

addGlobalVerb('inspect', function(parseResult, directObject, user) {
	if (!directObject) {
		user.send("Inspect what?");
	} else {
		user.send(directObject.description());
	}
});

addGlobalVerb('describe', function(parseResult, directObject, user) {
	if (!directObject) {
		user.send("Describe what?");
	} else {
		directObject.desc = parseResult;
		user.send("You described " + directObject.name + " as " + parseResult);
	}
});

function handleGlobal(parseResult, directObject, user) {
	var handler = globalVerbs[parseResult.verb];
	if (handler) {
		handler(parseResult, directObject, user);
	}
}

function formatNounPhrase(phrase) {
	return phrase.adjectives.join(' ') + ' ' + phrase.noun;
}
