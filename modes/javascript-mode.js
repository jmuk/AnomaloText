function BuildUnionRegexp(words, isSymbols) {
    escaped_words = [];
    for (var i = 0; i < words.length; i++) {
        escaped_words.push(
            words[i].replace(/([.*+?^=!:${}()|[\]\/\\])/g, "\\$1"));
    }
    var patterns = '^(' + escaped_words.join('|') + ')';
    if (!isSymbols)
        patterns += "\\b";
     return new RegExp(patterns);
}

function splitToTokens(contents) {
    var symbols = ['//', '/*', '*/', '<<', '>>', '<=', '>=', '==',
                   '!=', '+=', '-=', '*=', '/=', '%=', '&=',
                   '|=', '^=', '>>=', '<<='];
    var matchers = [
        /^\s/,
        BuildUnionRegexp(symbols, true),
        /^\\./,
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
  'break', 'case', 'catch', 'continue', 'debugger', 'default',
  'delete', 'do', 'else', 'finally', 'for', 'function', 'if',
  'in', 'instanceof', 'new', 'return', 'switch', 'this', 'throw',
  'try', 'typeof', 'var', 'void', 'while', 'with'
];

var futureReservedWords = [
  'class', 'const', 'enum', 'export', 'extends', 'import', 'super',
  'implements', 'interface', 'let', 'package', 'private', 'protected',
  'public', 'static', 'yield'
];

var specialTerms = ['self', 'window', 'document', '$', 'true', 'false'];

var defaultMode = [
    {pattern:'//', type:'comment', mode:'lineComment'},
    {pattern:'/*', type:'comment', mode:'comment'},
    {pattern:"'", type:'string', mode:'quote'},
    {pattern:'"', type:'string', mode:'dquote'},
//    {pattern:'/', type:'string', mode:'regexp'},
    {pattern:'var', type:'reserved', mode:'varDecl'},
    {pattern:'function', type:'reserved', mode:'func'},
    {pattern:BuildUnionRegexp(keywords), type:'reserved'},
    {pattern:BuildUnionRegexp(futureReservedWords), type:'keyword'},
    {pattern:BuildUnionRegexp(specialTerms), type:'declaration'}
];

var lineCommentMode = [
    {pattern:'\n', mode:'default'},
    {pattern:/./, type:'comment'}
];

var commentMode = [
    {pattern:'*/', type:'comment', mode:'default'},
    {pattern:/./, type:'comment'},
];

var varMode = [
    {pattern:/^[a-zA-Z_]/, type:'declaration', mode:'default'},
    {pattern:/\s+/},
    {pattern:/./, mode:'default'}
];

var functionMode = [
    {pattern:/^[a-zA-Z_]/, type:'declaration'},
    {pattern:/\s/},
    {pattern:/\(/, mode:'funcArgs'}
];

var functionArgsMode = [
    {pattern:/^[a-zA-Z_]/, type:'keyword'},
    {pattern:/\)/, mode:'default'}
];

function buildStringPattern(endPattern) {
    var result = [];
    result.push({pattern:endPattern, type:'string', mode:'default'});
    result.push({pattern:/./, type:'string'});
    return result;
}

var modes = {
    default: defaultMode,
    lineComment: lineCommentMode,
    comment: commentMode,
    quote: buildStringPattern("'"),
    dquote: buildStringPattern('"'),
//    regexp: buildStringPattern('/'),
    func: functionMode,
    funcArgs: functionArgsMode,
    varDecl: varMode
};

function isMatched(token, pattern) {
    if (typeof(pattern) == 'string')
        return pattern == token;
    return token.match(pattern);
}

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
            if (isMatched(token, pattern)) {
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
        result = {shortname: 'js',
                  longname: 'javascript mode',
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













