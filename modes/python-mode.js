function BuildUnionRegexp(words) {
    escaped_words = [];
    for (var i = 0; i < words.length; i++) {
        escaped_words.push(
            words[i].replace(/([.*+?^=!:${}()|[\]\/\\])/g, "\\$1"));
    }
    return new RegExp('^(' + escaped_words.join('|') + ')\\b');
}

function splitToTokens(contents) {
    var symbols = ['"""', "'''", '**', '//', '<<', '>>', '<=', '>=', '==',
                   '!=', '<>', '+=', '-=', '*=', '/=', '//=', '%=', '&=',
                   '|=', '^=', '>>=', '<<=', '**='];
    var matchers = [
        /^\s/,
        BuildUnionRegexp(symbols),
        /^[a-zA-Z_0-9]+/
    ];
    var result = [];
    while (contents.length > 0) {
        var length = 1;
        for (var i = 0; i < matchers.length; ++i) {
            var m = contents.match(matchers[i]);
            if (m) {
                length = m[0].length;
                break;
            }
        }
        result.push(contents.slice(0, length));
        contents = contents.slice(length);
    }
    return result;
}

var keywords = [
  'and', 'del', 'for', 'is', 'raise',
  'assert', 'elif', 'from', 'lambda', 'return',
  'break', 'else', 'global', 'not', 'try',
  'class', 'except', 'if', 'or', 'while',
  'continue', 'exec', 'import', 'pass', 'yield',
  'def', 'finally', 'in', 'print', 'True', 'False'
];

var specialTerms = ['self', 'len'];

var defaultMode = [
    {pattern:'#', type:'comment', mode:'comment'},
    {pattern:"'''", type:'string', mode:'triquote'},
    {pattern:'"""', type:'string', mode:'tridquote'},
    {pattern:"'", type:'string', mode:'quote'},
    {pattern:'"', type:'string', mode:'dquote'},
    {pattern:'@', type:'keyword', mode:'keyword'},
    {pattern:/(def|class)/, type:'reserved', mode:'declaration'},
    {pattern:BuildUnionRegexp(keywords), type:'reserved'},
    {pattern:BuildUnionRegexp(specialTerms), type:'keyword'}
];

var commentMode = [
    {pattern:'\n', mode:'default'},
    {pattern:/./, type:'comment'}
];

var keywordMode = [
    {pattern:/^[a-zA-Z_][a-zA-Z_0-9]*$/, type:'keyword', mode:'default'},
    {pattern:/\s+/},
    {pattern:/./, mode:'default'}
];

var declarationMode = [
    {pattern:/^[a-zA-Z_][a-zA-Z_0-9]*$/, type:'declaration', mode:'default'},
    {pattern:/\s+/},
    {pattern:/./, mode:'default'}
];

function buildStringPattern(endPattern, multiLine) {
    var result = [];
    if (!multiLine) {
        result.push({pattern:'\n', mode:'default'});
    }
    result.push({pattern:endPattern, type:'string', mode:'default'});
    result.push({pattern:/./, type:'string'});
    return result;
}

var modes = {
    default: defaultMode,
    comment: commentMode,
    quote: buildStringPattern("'", false),
    dquote: buildStringPattern('"', false),
    triquote: buildStringPattern("'''", true),
    tridquote: buildStringPattern('"""', true),
    keyword: keywordMode,
    declaration: declarationMode
};

function parseContents(contents) {
    var tokens = splitToTokens(contents);
    var offset = 0;
    var modeName = 'default';
    var currentRange = null;
    var result = [];
    for (var i = 0; i < tokens.length; i++) {
        var mode = modes[modeName];
        var token = tokens[i];
        var patternFound = false;
        for (var j = 0; j < mode.length; j++) {
            var pattern = mode[j].pattern;
            if ((typeof(pattern) == 'string' && pattern == token) ||
                token.match(pattern)) {
                patternFound = true;
                var type = mode[j].type;
                if (type) {
                    if (currentRange && currentRange.type == type) {
                        currentRange.end = offset + token.length;
                    } else {
                        if (currentRange)
                            result.push(currentRange);
                        currentRange = {
                            start: offset,
                            end: offset + token.length,
                            type: type
                        };
                    }
                } else if (currentRange) {
                    result.push(currentRange);
                    currentRange = null;
                }
                if (mode[j].mode)
                    modeName = mode[j].mode;
                break;
            }
        }
        if (!patternFound && currentRange) {
            result.push(currentRange);
            currentRange = null;
        }
        offset += token.length;
    }
    if (currentRange)
        result.push(currentRange);
    for (var i = 0; i < result.length; i++) {
        result[i].text = contents.slice(result[i].start, result[i].end);
    }
    return result;
}

function messageHandler(data) {
    var result;
    if (data.command == 'metadata') {
        result = {shortname: 'py',
                  longname: 'python mode',
                  pattern: /[a-zA-Z_0-9]+/,
                  parens: '[{()}]'};
    } else if (data.command == 'highlight') {
        result = {id: data.id, callback_id: data.callback_id,
		  range: parseContents(data.contents)};
    }
    result.command = data.command;
    self.postMessage(result);
}

self.addEventListener('message', function(e) { messageHandler(e.data); }, false);
