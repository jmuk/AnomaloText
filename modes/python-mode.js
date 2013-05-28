importScripts('mode-utils.js');

var symbols = ['"""', "'''", '**', '//', '<<', '>>', '<=', '>=', '==',
               '!=', '<>', '+=', '-=', '*=', '/=', '//=', '%=', '&=',
               '|=', '^=', '>>=', '<<=', '**='];

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
    {pattern:modeUtils.BuildUnionRegexp(keywords), type:'reserved'},
    {pattern:modeUtils.BuildUnionRegexp(specialTerms), type:'keyword'}
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

var modes = {
    default: defaultMode,
    comment: commentMode,
    quote: modeUtils.buildStringPattern("'", false),
    dquote: modeUtils.buildStringPattern('"', false),
    triquote: modeUtils.buildStringPattern("'''", true),
    tridquote: modeUtils.buildStringPattern('"""', true),
    keyword: keywordMode,
    declaration: declarationMode
};

var openParens = '[{(';
var closeParens = ')}]';
var binaryOperators = '+-*/^&|';
var parens = openParens + closeParens;
var tabWidth = 4;

function getIndent(lines, target) {
    var prevTermStart = modeUtils.getPreviousTerm(
        lines, target, openParens, closeParens, binaryOperators);
    if (lines[prevTermStart.line].length == prevTermStart.position) {
        // previous line ends with open parens.
        return modeUtils.getIndentForLine(
            lines[prevTermStart.line]) + tabWidth;
    }

    if (prevTermStart.position > 0)
        return prevTermStart.position;
    
    var prevTermIndent = modeUtils.getIndentForLine(
        lines[prevTermStart.line]);
    var prevLineIndex = target - 1;
    while (prevLineIndex >= 0 && lines[prevLineIndex].match(/^\s*$/))
        prevLineIndex--;
    if (prevLineIndex < 0)
        return 0;
    var prevLine = lines[prevLineIndex];
    if ((binaryOperators + ":").indexOf(prevLine[prevLine.length - 1]) >= 0)
        return prevTermIndent + tabWidth;

    return prevTermIndent;
};

function messageHandler(data) {
    var result;
    if (data.command == 'metadata') {
        result = {shortname: 'py',
                  longname: 'python mode',
                  pattern: /[a-zA-Z_0-9]+/,
                  parens: openParens + closeParens};
    } else if (data.command == 'highlight') {
        result = {range: modeUtils.parseContents(
                      data.contents, modes, symbols)};
    } else if (data.command == 'indent') {
        result = {line: data.target,
                  indent: getIndent(data.lines, data.target)};
    }
    result.id = data.id;
    result.callback_id = data.callback_id;
    result.command = data.command;
    self.postMessage(result);
}

self.addEventListener('message', function(e) { messageHandler(e.data); }, false);
