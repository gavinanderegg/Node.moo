var _ = require('underscore');

var verbs = {};
var adjectives = {};
var nouns = {};

var tokens = [];
var casedTokens = [];
var currentIndex = 0;
exports.parse = function(string, callback) {
    process.nextTick(function() {
        tokens = string.toLowerCase().split(' ');
		casedTokens = string.split(' ');
        currentIndex = 0;
        try {
            var result = parseSentence();
            callback(null, result);
        } catch(error) {
            callback(error, null);
        }
    });
}

exports.addVerb = function(verb) {
	verbs[verb.toLowerCase()] = true;
}

exports.addAdjective = function(adjective) {
    adjectives[adjective.toLowerCase()] = true;
}

exports.addNoun = function(noun) {
    nouns[noun.toLowerCase()] = true;
}

function parseError(message) {
    if (tokensLeft()) {
        throw message + ' at ' + currentToken();
    } else {
        throw message + ' at end of input';
    }
}

function currentToken() {
    if (!tokensLeft) {
        parseError('Expected more');
    }
    return tokens[currentIndex];
}

function tokensLeft() {
    return currentIndex < tokens.length;
} 

function consumeToken(cased) {
    currentIndex++;
	if (cased) {
		return casedTokens[currentIndex-1];
	} else {
		return tokens[currentIndex-1];
	}
}

function remainingCasedText() {
	var text = casedTokens.slice(currentIndex).join(' ');
	if (text[0] == '"') {
		text = text.substring(1, text.length)
	} if (text[text.length-1] == '"') {
		text = text.substring(0, text.length-1);
	}
	return text;
}

function parseSentence(toks) {
	if (currentToken()[0] == "'" || currentToken() == 'say' || currentToken() == 's') {
		var text = '';
		if(currentToken()[0] == "'" && currentToken().length > 1) {
			text = currentToken().slice(1) + ' ';
		}
		consumeToken();
		var text = remainingCasedText();
		return {'verb': 'say', 'text': text};
	} else if ( currentToken() == 'create' ){
		var thingName = '';
		var adjectives = Array();
		thingName = tokens.slice(tokens.length-1);
		
		tokens.shift();
		tokens.pop();
		
		var adjectives = tokens;
		return {'verb':'create', 'thingName': thingName, 'adjectives': adjectives};
	}
	
	var verb = parseVerb();
	var objectPhrase = null;
	var complements = [];
	
	if (verb == 'edit' || verb == '!') {
		var verb = consumeToken();
		var objectPhrase = parseNounPhrase();
		
		return {'verb': 'edit', 'object': objectPhrase, 'newVerb': verb};
	}

	if (verb == 'describe') {
		var objectPhrase = parseNounPhrase();
		if (currentToken() == 'as') {
			consumeToken();
		}
		var rest = remainingCasedText();
		return {'verb': verb, 'object': objectPhrase, 'text': rest};
	}

	if (verb == 'dig') {
		var directionPhrase = parseNounPhrase();
		if (currentToken() == 'to') {
			consumeToken();
		}
		var name = null;
		if (tokensLeft()) {
			name = consumeToken(true);
		}
		return {'verb' : verb, 'object': directionPhrase, 'name' : name};
	}
	
    if(tokensLeft()) {
        try {
            var objectPhrase = parseNounPhrase();
        } catch (error) {
        }
    }

	while(tokensLeft()) {
		var complement = parseComplement();
		complements.push(complement);
	}

    return {'verb': verb, 'object': objectPhrase, 'complements': complements};
}

function parseVerb() {
    if (verbs[currentToken()]) {
        return consumeToken();
    } else {
        parseError('Unknown verb');
    }
}

function parseNounPhrase() {
    var pieces = [];
    if (adjectives[currentToken()]) {
        pieces.push(consumeToken());
    }
    if (nouns[currentToken()] || currentToken().indexOf('object-') === 0) {
        return {'noun': consumeToken(), adjectives: pieces};
    }
    parseError("No noun");
}

function parseComplement() {
    if (currentToken() == 'to') {
        consumeToken();
        var target = parseNounPhrase();
        return {'adverb': 'to', 'object': target};
    }
    parseError("unrecognized complement");
}

