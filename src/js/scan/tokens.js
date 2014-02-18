goog.provide('r5js.token.Boolean');
goog.provide('r5js.token.Character');
goog.provide('r5js.token.Identifier');
goog.provide('r5js.token.Number');
goog.provide('r5js.token.String');
goog.provide('r5js.token.Terminal');


goog.require('r5js.InternalInterpreterError');
goog.require('r5js.ScanError');
goog.require('r5js.scan.TokenType');



/**
 * @param {T} payload
 * @param {!r5js.scan.TokenType} type
 * @implements {r5js.Token}
 * @struct
 * @constructor
 * @template T
 * @private
 */
r5js.token.Base_ = function(payload, type) {
  /** @const @private {T} */
  this.payload_ = payload;

  /** @const @private {!r5js.scan.TokenType} */
  this.type_ = type;
};


/** @override */
r5js.token.Base_.prototype.getPayload = function() {
  return this.payload_;
};


/** @override */
r5js.token.Base_.prototype.matchesType = function(tokenType) {
  return tokenType === this.type_;
};



/**
 * @param {string} name
 * @extends {r5js.token.Base_.<string>}
 * @struct
 * @constructor
 */
r5js.token.Identifier = function(name) {
  /* Converting Scheme identifiers to a canonical case makes
     interoperability with JavaScript awkward. For example:

     (((window 'document) 'querySelector) "body")

     If querySelector is lowercased to queryselector, we might
     have to search the receiver case-insensitively, which would
     compromise correctness. Alternatively (but more syntactically rude)
     we could require JS method names to be string literals.

     I see little downside to making Scheme case-sensitive
     (and R6RS might require it, I haven't looked), so I went ahead
     and did it, commenting out the few test cases that thereby failed. */
  goog.base(this, name/*.toLowerCase()*/, r5js.scan.TokenType.IDENTIFIER);
};
goog.inherits(r5js.token.Identifier, r5js.token.Base_);



/**
* @param {string} payload
* @extends {r5js.token.Base_.<boolean>}
* @struct
* @constructor
*/
r5js.token.Boolean = function(payload) {
  var actualPayload = payload === '#t' || payload === '#T';
  goog.base(this, actualPayload, r5js.scan.TokenType.BOOLEAN);
};
goog.inherits(r5js.token.Boolean, r5js.token.Base_);



/**
* @param {string} name
* @extends {r5js.token.Base_.<string>}
* @struct
 * @constructor
*/
r5js.token.Character = function(name) {
  goog.base(this,
      r5js.token.Character.normalize_(name), r5js.scan.TokenType.CHARACTER);
};
goog.inherits(r5js.token.Character, r5js.token.Base_);


/**
 * @param {string} payload
 * @return {string}
 * @private
 */
r5js.token.Character.normalize_ = function(payload) {
  var afterSlash = payload.substr(2);
  if (afterSlash.length === 1) {
    return afterSlash;
    /* R5RS 6.3.4: "Case is significant in #\<character>, but not in
     #\<character name>.*/
  } else if (afterSlash.toLowerCase() === 'space') {
    return ' ';
  } else if (afterSlash.toLowerCase() === 'newline') {
    return '\n';
  } else {
    throw new r5js.InternalInterpreterError(
        'invalid character payload ' + payload);
  }
};



/**
* @param {string} rawPayload
* @extends {r5js.token.Base_.<number>}
* @struct
 * @constructor
*/
r5js.token.Number = function(rawPayload) {
  var numericPayload = r5js.token.Number.FUNNY_BUSINESS_.test(rawPayload) ?
      r5js.token.Number.convert_(rawPayload) :
      parseFloat(rawPayload);
  goog.base(this, numericPayload, r5js.scan.TokenType.NUMBER);
};
goog.inherits(r5js.token.Number, r5js.token.Base_);


/** @const @private {!RegExp} */
r5js.token.Number.FUNNY_BUSINESS_ = /[esfdli#\/]/i;


/** @const @private {!RegExp} */
r5js.token.Number.FORBIDDEN_ = /[i@]/i;


/**
 * @param {string} payload
 * @return {number}
 * @private
 */
r5js.token.Number.convert_ = function(payload) {
  /* Get rid of all exactness annotations. Because we're
     using JavaScript math, all numbers are inexact, so the
     exactness annotations have no semantic significance. */
  payload = payload.replace(/#i|#e/i, '');

  var originalLength = payload.length;

  if (r5js.token.Number.FORBIDDEN_.test(payload))
    throw new r5js.ScanError('unsupported number literal: ' + payload);

  var base = 10;
  if ((payload = payload.replace(/#x/i, '')).length < originalLength) {
    base = 16;
  } else if ((payload = payload.replace(/#d/i, '')).length < originalLength) {
    // nothing to do
  } else if ((payload = payload.replace(/#o/i, '')).length < originalLength) {
    base = 8;
  } else if ((payload = payload.replace(/#b/i, '')).length < originalLength) {
    base = 2;
  }

  /* Get rid of all lone hashes. The lone hashes appear in the <decimal 10>
     rule, but don't appear to have any semantic significance. */
  payload = payload.replace('#', '');

  var maybeRational = payload.split('/');
  if (maybeRational.length === 2) {
    return parseInt(maybeRational[0], base) / parseInt(maybeRational[1], base);
  } else {
    /* If the base is 10, it could have additional features like an exponent
         or a decimal point. ([sfdl] are precision annotations for exponents,
         which we ignore.) If the base is not 10, it can't have any features
         other than a base annotation (like "#x") and a division sign, both of
         which have already been taken care of. */
    return base === 10 ?
        parseFloat(payload.replace(/[sfdl]/i, 'e')) :
        parseInt(payload, base);
  }
};



/**
 * @param {string} payload
 * @extends {r5js.token.Base_.<string>}
 * @struct
 * @constructor
 */
r5js.token.String = function(payload) {
  var actualPayload = payload.substr(1, payload.length - 2);
  goog.base(this, actualPayload, r5js.scan.TokenType.STRING);
};
goog.inherits(r5js.token.String, r5js.token.Base_);



/**
 * @param {string} payload
 * @extends {r5js.token.Base_.<string>}
 * @struct
 * @constructor
 * @suppress {checkTypes} TODO bl
 */
r5js.token.Terminal = function(payload) {
  goog.base(this, payload, 'sefkj');
};
goog.inherits(r5js.token.Terminal, r5js.token.Base_);
