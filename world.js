var parse = require('./parse');
var _ = require('underscore');
var sys = require('sys');

var allObjects = [];

function Thing(names, adjectives, parent) {
	this.names = names.slice();

	_.each(this.names, function(v) {
		parse.addNoun(v);
	});

	this.id = allObjects.length;
	this.names.push('object-' + this.id);

	this.adjectives = adjectives.slice();

	_.each(this.adjectives, function(a) {
		parse.addAdjective(a);
	});

	this.verbs = {};
	this.connections = {};

	this.parent = parent;

	allObjects.push(this);
};

Thing.prototype.matches = function(phrase) {
	var found = false;
	_.each(this.names, function (n) { 
		if(phrase.noun.toLowerCase() == n.toLowerCase()) {
			found = true;
		}
	});

	if (!found) {
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

var theRoom = new Thing(['Nexus'], [''], worldThing);
theRoom.desc = 'A nexus of infinite possibility.';

var north = new Thing(['north', 'n'], [], worldThing);
var east = new Thing(['east', 'e'], [], worldThing);
var west = new Thing(['west', 'w'], [], worldThing);
var south = new Thing(['south', 's'], [], worldThing);
var up = new Thing(['up', 'u'], [], worldThing);
var down = new Thing(['down', 'd'], [], worldThing);
var directionThings = [north, east, south, west, up, down];

var directionIdOpposites = {};
directionIdOpposites[north.id] = south.id;
directionIdOpposites[south.id] = north.id;
directionIdOpposites[east.id] = west.id;
directionIdOpposites[west.id] = east.id;
directionIdOpposites[up.id] = down.id;
directionIdOpposites[down.id] = up.id;

function thingForID(id){
	var thingForID = false;

	_.each(allObjects, function(thing){
		if(id == thing.id)
			thingForID = thing;
	});

	return thingForID;

}

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

parse.addNoun('here');
parse.addNoun('me');

function findThing(room, phrase, user, filter) {
	if (phrase.noun == 'here') {
		return user.parent;
	}

	if (phrase.noun == 'me') {
		return user;
	}

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
				var filter = globalVerbsFilter[parseResult.verb];
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
	newUser.sendToOthers(name + " has appeared from thin air.");
	doLook(newUser);
	return newUser;
};

var globalVerbs = {};
var globalVerbsFilter = {};
function addGlobalVerb(names, callback, filter) {
	_.each(names, function(name) {
		parse.addVerb(name);
		globalVerbs[name] = callback;
		if(filter)
			globalVerbsFilter[name] = filter;
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

function doLook(user) {
	var place = user.parent;
	
	user.send('You are in the ' + place.simpleName());
	user.send(place.desc);
	var contents = place.contents();
	
	var objList = '';
	_.each(place.contents(), function(i) {
		if (i != user) {
		objList += i.simpleName() + ', ';
		}
	});
	objList = objList.slice(0, objList.length -2);
	
	if (objList) {
		user.send('Also here:');
		user.send(objList);
	}



	var directionList = '';
	_.each(user.parent.connections, function(object, key) {
		var direction = thingForID(key);
		directionList += direction.simpleName() + ', ';
	});
	directionList = directionList.slice(0, directionList.length -2);

	if (directionList) {
		user.send('You can go: ' + directionList);
	}
}

addGlobalVerb(['look', 'l'], function(parseResult, directObject, user) {
	if(directObject){

		place = user.parent.connections[directObject.id];

		if(place)
			user.send('You see: '+place.desc);
		else
			user.send(directObject.description());
	}else{
		doLook(user);
	}
});


addGlobalVerb(['edit', '!'], function(parseResult, directObject, user) {
	user.socket.emit('edit', 'go'); // pop up editor
	
	// collect input
	user.socket.on('edit', function(data) {
		// make the input go here somehow
		directObject.verbs[parseResult.newVerb] = function(parseResult, directObject, user) {
			eval(data);
		};
		
		user.socket.emit('editSuccess', 'go');
	});
});

addGlobalVerb(['create'], function(parseResult, directObject, user) {
	var newThing = new Thing(parseResult.thingName, parseResult.adjectives, user);
	user.send("You created a: " + newThing.simpleName());
	user.sendToOthers(user.simpleName() + " created a " + newThing.simpleName() + '.');
});

addGlobalVerb(['inventory'], function(parseResult, directObject, user) {

	user.send('You have:');
	
	var objList = '';
	_.each(user.contents(), function(i) {
		objList += i.simpleName() + ', ';
	});
	objList = objList.slice(0, objList.length -2);
	
	user.send(objList);

});

addGlobalVerb(['take'], function(parseResult, directObject, user) {

	if(directObject != user && directObject.parent == user.parent ){
		directObject.parent = user;

		user.send('You have taken: '+directObject.simpleName());
		user.sendToOthers(user.simpleName() + " took a " + directObject.simpleName() + '.');
	}
});


addGlobalVerb(['drop'], function(parseResult, directObject, user) {

	if( directObject.parent == user ){
		directObject.parent = user.parent;

		user.send('You have dropped: '+directObject.simpleName());
		user.sendToOthers(user.simpleName() + " dropped a " + directObject.simpleName() + '.');
	}

}, function(phrase, object, user) { 
	return object.parent == user;
});

addGlobalVerb(['inspect'], function(parseResult, directObject, user) {
	if (!directObject) {
		user.send("Inspect what?");
	} else {
		user.send(directObject.description());
	}
});

addGlobalVerb(['describe'], function(parseResult, directObject, user) {
	if (!directObject) {
		user.send("Describe what?");
	} else {
		directObject.desc = parseResult.text;
		user.send("You described " + directObject.simpleName() + ' as "' + parseResult.text + '"');
	}
});

addGlobalVerb(['dig'], function(parseResult, directObject, user) {
	if (!directObject) {
		user.send("Dig where?");
	} else if (directionThings.indexOf(directObject) == -1) {
		user.send("You can only dig in a direction.");
	} else {
		var location = user.parent;
		if (location.parent != worldThing) {
			user.send("You have to be in a room to dig.");
		} else {
			if (location.connections[directObject.id]) {
				user.send("There is already a room in that direction.");
			} else {
				var name = 'room';
				if (parseResult.name) {
					name = parseResult.name;
				}
				var room = new Thing([name], [], worldThing);
				room.desc = 'A freshly dug room.';
				location.connections[directObject.id] = room;
				room.connections[directionIdOpposites[directObject.id]] = location;
				user.sendToOthers(user.simpleName() + " digs " + directObject.simpleName() + '.');
				user.parent = room;
				user.send("Room dug! You're now in it.");
				doLook(user);
			}
		}
	}
});

function doGo(direction, user) {
	var location = user.parent;
	if (location.parent != worldThing) {
		user.send("You must be in a room first.");
	} else {
		if (!location.connections[direction.id]) {
			user.send("There is no room in that direction");
		} else {
		user.sendToOthers(user.simpleName() + " goes " + direction.simpleName() + '.');
			user.parent = location.connections[direction.id];
		user.sendToOthers(user.simpleName() + " arrives." + '.');
			doLook(user);
		}
	}
}

_.each(directionThings, function(direction) {
	addGlobalVerb([direction.simpleName()], function(parseResult, directObject, user) {
		doGo(direction, user);
	});
});

addGlobalVerb(['go', 'g'], function(parseResult, directObject, user) {
	if (!directObject) {
		user.send("Go where?");
	} else if (directionThings.indexOf(directObject) == -1) {
		user.send("You can only go in a direction.");
	} else {
		doGo(directObject, user);
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


