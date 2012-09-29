var parse = require('./parse');
var _ = require('underscore');

var allObjects = [];

function Thing(names, adjectives, parent) {
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

	this.parent = parent;

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

var worldThing = new Thing(['world'], []);

var theRoom = new Thing(['house'], [''], worldThing);

var apple = new Thing(['apple'], ['red'], theRoom);
apple.setVerbHandler('eat', function(parseResult, user) {
	user.send("you eat the " + this.names[0]);
});

var apple2 = new Thing(['apple'], ['blue'], theRoom);
apple2.setVerbHandler('eat', function(parseResult, user) {
	user.send("you eat the " + this.names[0]);
});

var north = new Thing(['north', 'n'], [], worldThing);
var east = new Thing(['east', 'e'], [], worldThing);
var west = new Thing(['west', 'w'], [], worldThing);
var south = new Thing(['south', 's'], [], worldThing);
var up = new Thing(['up', 'u'], [], worldThing);
var down = new Thing(['down', 'd'], [], worldThing);
var directionThings = [north, east, south, west, up, down];

function matchingThings(room, phrase, user, filter) {
	var result = [];
	_.each(room.contents(), function(o) {
		if (o.matches(phrase) && (!filter || filter(phrase, o, user))) {
			result.push(o);
		}
	});

	if (room.parent) {
		result = result.concat(matchingThings(room.parent, phrase, user, filter));
	}

	return result;
}

function findThing(room, phrase, user, filter) {
	var things = matchingThings(room, phrase, user, filter);
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
				var filter = globalVerbsFilter[parseResult.verb]
				var thing = findThing(user, parseResult.object, user, filter);
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
var globalVerbsFilter = {};
function addGlobalVerb(name, callback, filter) {
	parse.addVerb(name);
	globalVerbs[name] = callback;
	if(filter)
		globalVerbsFilter[name] = filter
}

addGlobalVerb('say', function(parseResult, directObject, user) {
	var text = parseResult.text.trim();
	var last = text[text.length - 1];
	if (last != '.' && last != '?' && last != '!') {
		text = text + '.';
	}
	user.send('You say "'  + text + '"');
	user.sendToOthers(user.simpleName() + ' says "' + text + '"');
});

addGlobalVerb('look', function(parseResult, directObject, user) {
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
	var newThing = new Thing(parseResult.thingName, parseResult.adjectives, user);
	user.send("You created a: "+newThing.simpleName());

});

addGlobalVerb('inventory', function(parseResult, directObject, user) {

	user.send('You have:');
	
	var objList = '';
	_.each(user.contents(), function(i) {
		objList += i.simpleName() + ', ';
	});
	objList = objList.slice(0, objList.length -2);
	
	user.send(objList);

});

addGlobalVerb('take', function(parseResult, directObject, user) {

	if(directObject != user && directObject.parent == user.parent ){
		directObject.parent = user

		user.send('You have taken: '+directObject.simpleName());

	}

});


addGlobalVerb('drop', function(parseResult, directObject, user) {

	if( directObject.parent == user ){
		directObject.parent = user.parent

		user.send('You have dropped: '+directObject.simpleName());

	}

}, function(phrase, object, user) { 
	return object.parent == user;
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

addGlobalVerb('dig', function(parseResult, directObject, user) {
	if (!directObject) {
		user.send("Dig where?");
	} else if (directionThings.indexOf(directObject) == -1) {
		user.send("You can only dig in a direction");
	} else {
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
