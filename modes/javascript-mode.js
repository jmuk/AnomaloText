importScripts('mode-utils.js');

var symbols = ['//', '/*', '*/', '<<', '>>', '<=', '>=', '==',
               '!=', '+=', '-=', '*=', '/=', '%=', '&=',
               '|=', '^=', '>>=', '<<='];

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
    {pattern:modeUtils.BuildUnionRegexp(keywords), type:'reserved'},
    {pattern:modeUtils.BuildUnionRegexp(futureReservedWords), type:'keyword'},
    {pattern:modeUtils.BuildUnionRegexp(specialTerms), type:'declaration'}
];

var lineCommentMode = [
    {pattern:'\n', mode:'default'},
    {pattern:/./, type:'comment'}
];

var commentMode = [
    {pattern:'*/', type:'comment', mode:'default'},
    {pattern:/./, type:'comment'}
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

var openParens = '[{(';
var closeParens = ')}]';
var binaryOperators = '+-*/^&|';
var tabWidth = 4;

var modes = {
    default: defaultMode,
    lineComment: lineCommentMode,
    comment: commentMode,
    quote: modeUtils.buildStringPattern("'"),
    dquote: modeUtils.buildStringPattern('"'),
//    regexp: modeUtils.buildStringPattern('/'),
    func: functionMode,
    funcArgs: functionArgsMode,
    varDecl: varMode
};

function getIndent(lines, target) {
    var prevTermStart = modeUtils.getPreviousTerm(
        lines, target, openParens, closeParens, binaryOperators);
    if (lines[prevTermStart.line].length == prevTermStart.position) {
        // previous line ends with open parens.
        return modeUtils.getIndentForLine(
            lines[prevTermStart.line]) + tabWidth;
    }

    var prevTermLine =
        lines[prevTermStart.line].slice(prevTermStart.position);
    var semicolonPos = prevTermLine.lastIndexOf(";");
    if (semicolonPos >= 0)
        prevTermLine = prevTermLine.slice(semicolonPos);

    if (prevTermLine.match(/^\s*(if|while|for|function)/)) {
        var parenConsumed = false;
        var braceConsumed = false;
        var stack = [];
        function processLine(line) {
            for (var i = 0; i < prevTermLine.length; ++i) {
                if (line[i] == '(' || line[i] == '{')
                    stack.push(line[i]);
                if (line[i] == ')' && stack.pop() == '(') {
                    if (stack.length == 0) {
                        parenConsumed = true;
                        braceConsumed = false;
                    }
                }
                if (line[i] == '}' && stack.pop() == '{') {
                    if (stack.length == 0 && parenConsumed)
                        braceConsumed = true;
                }
            }
        }
        processLine(prevTermLine);
        for (var i = prevTermStart.line + 1; i < target; ++i)
            processLine(lines[i]);
        if (parenConsumed && !braceConsumed)
            return modeUtils.getIndentForLine(
                lines[prevTermStart.line]) + tabWidth;
    } else if (prevTermStart.position > 0) {
        return prevTermStart.position;
    }
    
    var prevTermIndent = modeUtils.getIndentForLine(
        lines[prevTermStart.line]);
    var prevLineIndex = target - 1;
    while (prevLineIndex >= 0 && lines[prevLineIndex].match(/^\s*$/))
        prevLineIndex--;
    if (prevLineIndex < 0)
        return 0;
    var prevLine = lines[prevLineIndex];
    if (binaryOperators.indexOf(prevLine[prevLine.length - 1]))
        return prevTermIndent + tabWidth;

    return prevTermIndent;
};

function messageHandler(data) {
    var result;
    if (data.command == 'metadata') {
        result = {shortname: 'js',
                  longname: 'javascript mode',
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
