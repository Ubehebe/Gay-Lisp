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


goog.provide('r5js.Reader');


goog.require('r5js.read.bnf');
goog.require('r5js.Datum');
goog.require('r5js.DatumType');
goog.require('r5js.read.grammar');
goog.require('r5js.InternalInterpreterError');
goog.require('r5js.OutputMode');
goog.require('r5js.parse.Nonterminals');
goog.require('r5js.parse.Terminals');
goog.require('r5js.parse.isTerminal');

/**
 * @param {!r5js.TokenStream} scanner
 * @implements {r5js.IReader}
 * @struct
 * @constructor
 */
r5js.Reader = function(scanner) {
    /** @const @private {!r5js.TokenStream} */
    this.scanner_ = scanner;
};


/** @override */
r5js.Reader.prototype.read = function() {
    var datums = r5js.read.grammar[r5js.parse.Nonterminals.DATUMS].match(
        new r5js.Datum(), this.scanner_);
    return datums.getFirstChild();
};

/**
 * This is the inverse of {@link r5js.Reader.read}, which is why it's here.
 * @param {!r5js.OutputMode} outputMode Desired output mode.
 * @return {string} String representation for desired output mode.
 */
r5js.Datum.prototype.stringForOutputMode = function(outputMode) {

    var ans, child;
    var endDelimiter = "";

    switch (this.type) {
        case r5js.DatumType.FFI: // JavaScript object
            return this.getPayload().toString();
        case r5js.DatumType.INPUT_PORT:
            if (this.getPayload()['isEof']())
                return 'EOF';
            // otherwise fallthrough
        case r5js.DatumType.OUTPUT_PORT:
                return this.type + ':' + this.getPayload().toString();
        case null:
            // Mainly for silly stuff like (cons (if #f #f) (display 'hi))
            return 'undefined';
        case r5js.DatumType.REF:
            return this.getPayload().stringForOutputMode(outputMode);
        case r5js.DatumType.ENVIRONMENT_SPECIFIER: // R5RS 6.5
            return this.getPayload() === 5
                ? 'scheme-report-environment-5'
                : 'null-environment-5';
        case r5js.DatumType.LAMBDA:
            return typeof this.getPayload() === 'function'
                ? /** @type {string} */ (this.getName())
                : 'proc:' + this.getPayload().name;
        case r5js.DatumType.MACRO:
            return '[macro]';
        case r5js.DatumType.IDENTIFIER:
            return /** @type {string} */ (this.getPayload());
        case r5js.DatumType.BOOLEAN:
            return this.getPayload() ? '#t' : '#f';
        case r5js.DatumType.NUMBER:
            return this.getPayload() + '';
        case r5js.DatumType.CHARACTER:
            switch (outputMode) {
                case r5js.OutputMode.WRITE:
                    if (this.getPayload() === ' ')
                        return '#\\space';
                    else if (this.getPayload() === '\n')
                        return '#\\newline';
                    else
                        return '#\\' + this.getPayload();
                case r5js.OutputMode.DISPLAY:
                default:
                    return /** @type {string} */(this.getPayload());
            }
            break;
        case r5js.DatumType.STRING:
            switch (outputMode) {
                case r5js.OutputMode.WRITE:
                    ans = this.getPayload();
                    return '"' + ans.replace(/([\\"])/g, "\\$1") + '"';
                case r5js.OutputMode.DISPLAY:
                default:
                    return /** @type {string} */ (this.getPayload());
            }
            break;
        case r5js.DatumType.VECTOR:
                    if (this.isArrayBacked()) {
                        ans = '#(';
                        if (this.getPayload().length > 0) {
                            for (var i = 0; i < this.getPayload().length - 1; ++i)
                                ans += this.getPayload()[i] + ' ';
                            ans += this.getPayload()[this.getPayload().length - 1];
                        }
                        return ans + ')';
                    }
                // fallthrough for non-array-backed vectors
                case r5js.DatumType.LIST:
                    endDelimiter = ')';
                // fallthrough
                case r5js.DatumType.QUOTE:
                case r5js.DatumType.QUASIQUOTE:
                case r5js.DatumType.UNQUOTE:
                case r5js.DatumType.UNQUOTE_SPLICING:
                    /* Note: this will be an infinite loop for cyclical data
                     structures created by the programmer through set-cdr!, etc.
                     Some implementations do nice things, like print "holes" where
                     a cycle starts. But the R5RS standard does not seem to define
                     external representations for lists (vectors, etc.) that contain
                     cycles. In general, the spirit of the standard seems to be that
                     the programmer is responsible for mayhem caused by the creation
                     of such structures.

                     There is one exception: list? (a library procedure) must return
                     false for cyclical lists. Accordingly, I've written the
                     cycle-detecting logic wholly in Scheme, not bothering
                     to reimplement it here. */
                    ans = this.type;
                    /* Uncomment to show quasiquotation levels.
                     (These should not make it into any external representation.)
                     if (this.qqLevel_ !== undefined && ans !== "'")
                     ans += 'qq' + this.qqLevel_; */
                    for (child = this.getFirstChild();
                         child && child.getNextSibling();
                         child = child.getNextSibling()) {
                        ans += child.stringForOutputMode(outputMode) + ' ';
                    }
                    return ans
                        + (child ? child.stringForOutputMode(outputMode) : '')
                        + endDelimiter;
                case r5js.DatumType.DOTTED_LIST:
                    ans = '(';
                    for (child = this.getFirstChild();
                         child && child.getNextSibling() && child.getNextSibling().getNextSibling();
                         child = child.getNextSibling()) {
                        ans += child.stringForOutputMode(outputMode) + ' ';
                    }
                    var nextToLastChildString = child
                        ? child.stringForOutputMode(outputMode)
                        : '';
                    var lastChildString = child.getNextSibling() ?
                        child.getNextSibling().stringForOutputMode(outputMode)
                        : '';
                    return ans + nextToLastChildString + ' . ' + lastChildString + ')';
                default:
                    throw new r5js.InternalInterpreterError('unknown datum type ' + this.type);
            }
    };