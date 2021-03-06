var modeUtils = {
    BuildUnionRegexp: function(words, isSymbols) {
        escaped_words = [];
        for (var i = 0; i < words.length; i++) {
            escaped_words.push(
                words[i].replace(/([.*+?^=!:${}()|[\]\/\\])/g, "\\$1"));
        }
        var patterns = '^(' + escaped_words.join('|') + ')';
        if (!isSymbols)
            patterns += "\\b";
        return new RegExp(patterns);
    },

    splitToTokens: function(contents, symbols) {
        var matchers = [
            /^\s/,
            this.BuildUnionRegexp(symbols, true),
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
    },

    isMatched: function(token, pattern) {
        if (typeof(pattern) == 'string')
            return pattern == token;
        return token.match(pattern);
    },

    buildStringPattern: function(endPattern) {
        var result = [];
        result.push({pattern:endPattern, type:'string', mode:'default'});
        result.push({pattern:/\\./, type:'string'});
        result.push({pattern:/./, type:'string'});
        return result;
    },

    parseContents: function(contents, modes, symbols) {
        var tokens = this.splitToTokens(contents, symbols);
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
                if (this.isMatched(token, pattern)) {
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
    },

    getPreviousTerm: function(lines, target, openParens, closeParens, binaryOperators) {
        var counter = 0;
        var index = target - 1;
        while (index > 0) {
            var line = lines[index];
            for (var i = line.length - 1; i >= 0; i--) {
                if (openParens.indexOf(line[i]) >= 0) {
                    counter--;
                    if (counter < 0)
                        return {line:index, position: i + 1};
                    counter = Math.max(counter - 1, 0);
                } else if (closeParens.indexOf(line[i]) >= 0) {
                    counter++;
                }
            }
            if (counter == 0 && !line.match(/^\s*$/)) {
                var prevLine = lines[index - 1].replace(/\s*$/, "");
                if (binaryOperators.indexOf(prevLine[prevLine.length - 1]) < 0)
                    return {line:index, position: 0};
            }
            index--;
        }
        return {line:0, position: 0};
    },

    getIndentForLine: function(line) {
        // needs to check the horizontal tab. 
        return line.match(/^\s*/)[0].length;
    }
};