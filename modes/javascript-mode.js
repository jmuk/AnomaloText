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

var parens = '[{()}]';

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

function messageHandler(data) {
    var result;
    if (data.command == 'metadata') {
        result = {shortname: 'js',
                  longname: 'javascript mode',
                  pattern: /[a-zA-Z_0-9]+/,
                  parens: parens};
    } else if (data.command == 'highlight') {
        result = {id: data.id, callback_id: data.callback_id,
		  range: modeUtils.parseContents(data.contents, modes, symbols)};
    }
    result.command = data.command;
    self.postMessage(result);
}

self.addEventListener('message', function(e) { messageHandler(e.data); }, false);
