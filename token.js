/**
 * Token describes a chunk of text in a DOM element.  Token is
 * not nested, so a file is a sequence of tokens.  We have an
 * assumption that each character in a token has exactly the
 * same width.
 */
function Token(text) {
    this.text = text;
    if (text == '\n') {
	this.element = document.createElement('br');
	this.length = 0;
	this.isReturn = true;
	this.isSpecial = true;
    } else {
	this.element = document.createElement('span');
	this.length = text.length;
	this.isReturn = false;
	if (text == ' ') {
	    // Use nbsp for spaces.
	    this.element.textContent = String.fromCharCode(0xA0);
	    this.isSpecial = true;
	} else if (text == '\t') {
	    var result = '';
	    // Tab just means a 8-spaces.  Don't care compositions
	    // of space-tabs, no tab-width customization for now.
	    for (var i = 0; i < 8; i++)
		result += String.fromCharCode(0xA0);
	    this.element.textContent = result;
	    this.isSpecial = true;
	} else {
	    this.element.textContent = text;
	    this.isSpecial = false;
	}
    }
}

Token.prototype.setText = function(text) {
    if (this.isSpecial)
	return;
    this.text = text;
    this.length = text.length;
};

/**
 * Looks at |chunk| and obtain a valid token from the beginning.
 * It returns an array whose first element is the found token, and
 * second is the text remaining in chunk.  Puts null if no valid
 * token is found.
 */
Token.getToken = function(chunk) {
    function matchInCategory(charCode, category) {
	for (var r = 0; r < category.length; r++) {
	    var range = category[r];
	    if (charCode >= range[0] && charCode <= range[1])
		return true;
	}
	return false;
    }

    if (!chunk)
	return [null, chunk];

    var length = 0;
    if (chunk[0] == '\n' || chunk[0] == ' ' || chunk[0] == '\t') {
	length = 1;
    } else {
	// Here wants to split the chunk by scripts in Unicode,
	// but it costs too high.  For my personal use, it would be
	// okay to categorize a character into the following three:
	//  - latin characters -- used normally in European countries
	//  - CJK characters -- used in CJK.  full-width
	//  - half-width CJK
	//  - other
	// This category has to expand when necessary.
	var categories = [
	    [[0x21, 0x24F]], // latin, not including spaces
	    [[0x2E80, 0x9FFF],  // CJK characters
	     // 2E80..2EFF; CJK Radicals Supplement
	     // 2F00..2FDF; Kangxi Radicals
	     // 2FF0..2FFF; Ideographic Description Characters
	     // 3000..303F; CJK Symbols and Punctuation
	     // 3040..309F; Hiragana
	     // 30A0..30FF; Katakana
	     // 3100..312F; Bopomofo
	     // 3130..318F; Hangul Compatibility Jamo
	     // 3190..319F; Kanbun
	     // 31A0..31BF; Bopomofo Extended
	     // 31C0..31EF; CJK Strokes
	     // 31F0..31FF; Katakana Phonetic Extensions
	     // 3200..32FF; Enclosed CJK Letters and Months
	     // 3300..33FF; CJK Compatibility
	     // 3400..4DBF; CJK Unified Ideographs Extension A
	     // 4DC0..4DFF; Yijing Hexagram Symbols
	     // 4E00..9FFF; CJK Unified Ideographs
	     [0xFF01, 0xFF60], // Full-width characters
	     [0xFFE0, 0xFFEE]  // Full-width characters
	     ],
	    [[0xFF61, 0xFFDC]] // Half-width
	];
	var c = 0;
	var charCode = chunk.charCodeAt(0);
	for (; c < categories.length; c++) {
	    if (matchInCategory(charCode, categories[c]))
		break;
	}
	var cond = null;
	if (c < categories.length) {
	    cond = function(charCode) {
		return matchInCategory(charCode, categories[c]);
	    };
	} else {
	    cond = function(charCode) {
		for (var c = 0; c < categories.length; c++) {
		    if (matchInCategory(charCode, categories[c]))
			return false;
		}
		return true;
	    };
	}
	var i = 1;
	while (true) {
	    if (i >= chunk.length) {
		length = chunk.length;
		break;
	    } else if (!cond(chunk.charCodeAt(i))) {
		length = i;
		break;
	    }
	    i++;
	}
    }

    return [new Token(chunk.substring(0, length)), chunk.substring(length)];
};