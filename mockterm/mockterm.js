/* Copyright 2011, 2012 Brendan Linn

 This program is free software: you can redistribute it and/or modify
 it under the terms of the GNU General Public License as published by
 the Free Software Foundation, either version 3 of the License, or
 (at your option) any later version.

 This program is distributed in the hope that it will be useful,
 but WITHOUT ANY WARRANTY; without even the implied warranty of
 MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 GNU General Public License for more details.

 You should have received a copy of the GNU General Public License
 along with this program.  If not, see <http://www.gnu.org/licenses/>. */


/* This is a very quick-and-dirty "terminal emulator" that sits on top
 of an HTML textarea. It's called MockTerminal to make it clear that it
 doesn't provide any actual network connectivity etc., just terminal-like
 styling.

 Before writing this, I tried the existing popular JavaScript "terminal
 emulators" like termlib.js and the jQuery Terminal plugin, but they
 were both dead in the water on the iPad -- you couldn't bring up
 the keyboard.

 todo: This is clearly full of bugs. There are two main reasons:
 (1) the horrible state of keydown API and (2) implementing a character
 device (a terminal) on top of what is essentially a block device
 (the textarea, which was meant to provide snapshots of completed strings
 to the server through forms). Hopefully, once the DOM Level 3 Events
 spec is standardized, we can rewrite this using the proposed textinput event
 or the proposed "key" property of the existing keydown event. */
function MockTerminal(textArea) {
    this.textArea = textArea;

    /* Properties set by setters
     this.prompt;
     this.banner;
     this.interpreter;
     this.lineStart;
     this.lineEnd;
     this.lineBuf;
     this.numColumns; */

    // May want to customize these, or, if not, move to prototype
    this.inputKey = '\r'.charCodeAt(0);
    this.backspace = '\b'.charCodeAt(0);

    var self = this;

    textArea.addEventListener('keydown', function (e) { self.onKeyDown(e); });
}

MockTerminal.prototype.onKeyDown = function(e) {
    if (this.shouldSuppress(e)) {
        e.preventDefault();
    } else if (this.shouldEndLine(e)) {
        /* The default behavior here would be to print a newline.
         But it would happen after this handler completes, so the prompt
         would have a stray newline after it. So we disable that behavior. */
        e.preventDefault();
        var input = this.getCurLine();
        var output = this.maybeInterpret(input);
        this.print('\n' + output + '\n' + this.prompt);
        this.lineStart = this.lineEnd = this.textArea.selectionEnd;
        /* Make sure we don't have to scroll down to see the latest output.
         Not sure how portable this is. */
        this.textArea.scrollTop = this.textArea.scrollHeight;
    }
};

MockTerminal.prototype.shouldSuppress = function(keydownEvent) {
    /* The current caret of the textarea, before this event makes it
     to the textarea. */
    var cur = this.textArea.selectionEnd;

    /* If the user has selected some text that reaches back before the start
     of the current line, don't do anything until they deselect it.
     The cut/copy/paste semantics are too hard using just the keydown event. */
    if (this.textArea.selectionStart < cur
        && this.textArea.selectionStart < this.lineStart) {
        return true;
    }

    /* If the caret is strictly before the current line, we disallow
     anything that would mutate that text. */
    else if (cur < this.lineStart)
        return this.willMutateText(keydownEvent);

    /* If the caret is right at the beginning of the current line,
     we allow it unless they're trying to backspace. */
    else if (cur === this.lineStart)
        return keydownEvent.keyCode === this.backspace;

    /* Otherwise, we're inside the current line, so the user should
     be allowed to do whatever. */
    else return false;
};

/* These are just heuristics. It's hard to know in general
 if a keypress will change the contents of a text input; the OS
 is the proper owner of that information. (For example, someone
 could conceivably map shift-X/C/V to cut/copy/paste instead of
 the usualy ctrl-X/C/V.) We also don't want to get in the way of
 useful browser bindings like ctrl-T to open a new tab. */
MockTerminal.prototype.willMutateText = function(e) {

    if (e.altKey || e.metaKey || e.ctrlKey)
        return false;

    /* Unfortunately, pressing the Enter/Return key does not set
     e.keyIdentifier to the Unicode for \n or \r, but to the string
     "Enter", so we cannot use the final branch below. */
    else if (e.keyCode === this.inputKey)
        return true;

    /* JavaScript: The Definitive Guide, 6th ed., says (p.485):
     "For printing keys, this property [keyIdentifier] holds a less useful
     string representation of the Unicode encoding of the character. It is
     "U+0041" for the A key, for example." */
    else
        return e.keyIdentifier.substr(0, 2) === 'U+';
};

MockTerminal.prototype.print = function(string) {
    this.textArea.value += string;
    this.textArea.selectionEnd = this.textArea.value.length;
};

MockTerminal.prototype.shouldEndLine = function(e) {

    var lineEnd = this.textArea.selectionEnd;

    if (lineEnd < this.lineStart) {
        return false;
    } else {
        this.lineEnd = lineEnd; // an important side effect
        return e.keyCode === this.inputKey;
    }
};

MockTerminal.prototype.getCurLine = function() {
    return this.textArea.value.substr(
        this.lineStart,
        this.lineEnd - this.lineStart + 1);
};

MockTerminal.prototype.setInterpreter = function(interpreter) {
    this.interpreter = interpreter;
    return this;
};

MockTerminal.prototype.setInputCompleteHandler = function(inputCompleteHandler) {
    this.inputCompleteHandler = inputCompleteHandler;
    return this;
};

MockTerminal.prototype.maybeInterpret = function(string) {

    this.lineBuf += '\n' + string;

    if (this.inputCompleteHandler
        && !this.inputCompleteHandler(this.lineBuf)) {
        return '...';
    } else {
        try {
            var input = this.lineBuf;
            this.lineBuf = '';
            return this.interpreter(input);
        } catch (e) {
            return e.toString();
        }
    }
};

MockTerminal.prototype.start = function () {
    this.textArea.value = this.banner + '\n' + this.prompt;
    this.lineStart = this.textArea.selectionEnd;
    this.lineEnd = this.lineStart+1;
    this.lineBuf = '';
    return this;
};

MockTerminal.prototype.recordCharWidth = function () {
    var charSandbox = document.createElement('span');
    charSandbox.className = this.textArea.className;
    charSandbox.style.visibility = 'hidden';
    charSandbox.appendChild(document.createTextNode('x'));
    charSandbox.style.marginRight = 'inherit';
    document.body.appendChild(charSandbox);
    var box = charSandbox.getBoundingClientRect();
    this.charHtoW = box.height / box.width;
};

MockTerminal.prototype.resize = function () {
    var width = this.textArea.getBoundingClientRect().width;
    console.log('width ' + width);
    var charWidth = width / this.numColumns;
    var charHeight = charWidth * this.charHtoW;
    this.textArea.style.fontSize = charHeight + 'px';
    console.log('each char should be ' + charHeight);
};

MockTerminal.prototype.setBanner = function (banner) {
    this.banner = banner;
    return this;
};

MockTerminal.prototype.setPrompt = function (prompt) {
    this.prompt = prompt;
    return this;
};