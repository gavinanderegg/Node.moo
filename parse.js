var verbs = {};
var adjectives = {};
var nouns = {};

var tokens = [];
var currentIndex = 0;
exports.parse = function(string, callback) {
    process.nextTick(function() {
        tokens = string.toLowerCase().split(' ');
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
    verbs[verb] = true;
}

exports.addAdjective = function(adjective) {
    adjectives[adjective] = true;
}

exports.addNoun = function(noun) {
    nouns[noun] = true;
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

function consumeToken() {
    currentIndex++;
    return tokens[currentIndex-1];
}

function parseSentence(toks) {
    var verb = parseVerb();
    var objectPhrase = null;
    var complements = [];

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
    if (nouns[currentToken()]) {
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