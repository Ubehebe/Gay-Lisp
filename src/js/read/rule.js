goog.module('r5js.read.bnf.Rule');

const Datum = goog.require('r5js.Datum');
const TokenStream = goog.require('r5js.TokenStream');

/** @interface */
class Rule {
    /**
     * @param {!TokenStream} tokenStream
     * @return {Datum} The datum extracted from the token stream, or null if
     * reading was unsuccessful. Note that this may not be a proper tree:
     * rules like {@link r5js.read.bnf.AtLeast_} should return a list of siblings.
     */
    match(tokenStream) {}
}

exports = Rule;