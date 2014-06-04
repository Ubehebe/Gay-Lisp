/* Copyright 2011-2014 Brendan Linn

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


goog.provide('r5js.ArgumentTypeError');
goog.provide('r5js.EvalError');
goog.provide('r5js.FFIError');
goog.provide('r5js.GeneralSyntaxError');
goog.provide('r5js.IOError');
goog.provide('r5js.IllegalEmptyApplication');
goog.provide('r5js.ImmutableError');
goog.provide('r5js.IncorrectNumArgs');
goog.provide('r5js.InternalInterpreterError');
goog.provide('r5js.MacroError');
goog.provide('r5js.ParseError');
goog.provide('r5js.PrimitiveProcedureError');
goog.provide('r5js.QuasiquoteError');
goog.provide('r5js.ScanError');
goog.provide('r5js.TooFewVarargs');
goog.provide('r5js.TooManyVarargs');
goog.provide('r5js.UnboundVariable');
goog.provide('r5js.UnimplementedOptionError');


goog.require('goog.functions');



/** @interface */
r5js.Error = function() {};


/** @override */
r5js.Error.prototype.toString = function() {};


/** @return {string} */
r5js.Error.prototype.getShortName = function() {};



/**
 * @param {string} name The name of the variable that was supposed to be
 * bound but wasn't.
 * @implements {r5js.Error}
 * @struct
 * @constructor
 */
r5js.UnboundVariable = function(name) {
  this.toString = function() {
    return 'unbound variable ' + name;
  };
};


/** @override */
r5js.UnboundVariable.prototype.getShortName =
    goog.functions.constant('UnboundVariable');



/**
 * @param {string} name The name of the procedure.
 * @param {number} minNumArgs The procedure's minimum number of arguments.
 * @param {number} actualNumArgs The actual number of arguments passed to
 * the procedure.
 * @implements {r5js.Error}
 * @struct
 * @constructor
 */
r5js.TooFewVarargs = function(name, minNumArgs, actualNumArgs) {
  this.toString = function() {
    return 'The procedure ' +
        name +
        ' has been called with ' +
        actualNumArgs +
        ' argument' +
        (actualNumArgs === 1 ? '' : 's') +
        '; it requires at least ' +
        minNumArgs +
        ' argument' +
        (minNumArgs === 1 ? '' : 's');
  };
};


/** @override */
r5js.TooFewVarargs.prototype.getShortName =
    goog.functions.constant('TooFewVarargs');



/**
 * @param {string} name The name of the procedure.
 * @param {number} maxNumArgs The procedure's maximum number of arguments.
 * @param {number} actualNumArgs The actual number of arguments passed to
 * the procedure.
 * @implements {r5js.Error}
 * @struct
 * @constructor
 */
r5js.TooManyVarargs = function(name, maxNumArgs, actualNumArgs) {
  this.toString = function() {
    return 'The procedure ' +
        name +
        ' has been called with ' +
        actualNumArgs +
        ' argument' +
        (actualNumArgs === 1 ? '' : 's') +
        '; it requires at most ' +
        maxNumArgs +
        ' argument' +
        (maxNumArgs === 1 ? '' : 's');
  };
};


/** @override */
r5js.TooManyVarargs.prototype.getShortName =
    goog.functions.constant('TooManyVarargs');



/**
 * @param {string} name The name of the procedure.
 * @param {number} expectedNumArgs The expected number of arguments.
 * @param {number} actualNumArgs The actual number of arguments.
 * @implements {r5js.Error}
 * @struct
 * @constructor
 */
r5js.IncorrectNumArgs = function(name, expectedNumArgs, actualNumArgs) {
  this.toString = function() {
    return 'The procedure ' +
        name +
        ' has been called with ' +
        actualNumArgs +
        ' argument' +
        (actualNumArgs === 1 ? '' : 's') +
        '; it requires exactly ' +
        expectedNumArgs +
        ' argument' +
        (expectedNumArgs === 1 ? '' : 's');
  };
};


/** @override */
r5js.IncorrectNumArgs.prototype.getShortName =
    goog.functions.constant('IncorrectNumArgs');



/**
 * @param {string} msg An error message.
 * @implements {r5js.Error}
 * @struct
 * @constructor
 */
r5js.InternalInterpreterError = function(msg) {
  this.toString = function() {
    return msg;
  };
};


/** @override */
r5js.InternalInterpreterError.prototype.getShortName =
    goog.functions.constant('InternalInterpreterError');



/**
 * @param {*} argument The argument.
 * @param {number} which The position of the argument in the argument list
 * (zero-indexed).
 * @param {string} procName The procedure that the interpreter was invoking
 * when this error occurred.
 * @param {!r5js.Type} expectedType The type of the argument
 * that the interpreter expected.
 * @implements {r5js.Error}
 * @struct
 * @constructor
 */
r5js.ArgumentTypeError = function(argument, which, procName, expectedType) {
  this.toString = function() {
    return 'The object ' +
        argument.toString() +
        ', passed as argument ' +
        which +
        ' to ' +
        procName +
        ', is not of the correct type ' +
        expectedType.toString();
  };
};


/** @override */
r5js.ArgumentTypeError.prototype.getShortName =
    goog.functions.constant('ArgumentTypeError');



/**
 * @param {string} keyword Keyword of macro.
 * @param {string} msg Error message.
 * @implements {r5js.Error}
 * @struct
 * @constructor
 * TODO bl: This should accept a macro object to simplify call sites.
 */
r5js.MacroError = function(keyword, msg) {
  this.toString = function() {
    return 'Error in macro ' +
        keyword +
        ': ' +
        msg;
  };
};


/** @override */
r5js.MacroError.prototype.getShortName =
    goog.functions.constant('r5js.MacroError');



/**
 * @param {string} what An error message.
 * @implements {r5js.Error}
 * @struct
 * @constructor
 */
r5js.UnimplementedOptionError = function(what) {
  this.toString = function() {
    return 'Sorry, ' +
        what +
        ' is optional according to R5RS and unimplemented';
  };
};


/** @override */
r5js.UnimplementedOptionError.prototype.getShortName =
    goog.functions.constant('UnimplementedOptionError');



/**
 * @param {*} what The object that caused the syntax error.
 * @implements {r5js.Error}
 * @struct
 * @constructor
 * TODO bl: narrow the type of the parameter.
 * TODO bl: Consider eliminating. It's vague.
 */
r5js.GeneralSyntaxError = function(what) {
  this.toString = function() {
    return 'bad syntax in ' + what;
  };
};


/** @override */
r5js.GeneralSyntaxError.prototype.getShortName =
    goog.functions.constant('GeneralSyntaxError');



/**
 * @param {string} what An error message.
 * @implements {r5js.Error}
 * @struct
 * @constructor
 */
r5js.IOError = function(what) {
  this.toString = function() {
    return 'IO error: ' + what;
  };
};


/** @override */
r5js.IOError.prototype.getShortName = goog.functions.constant('IOError');



/**
 * @param {string} what An error message.
 * @implements {r5js.Error}
 * @struct
 * @constructor
 * TODO bl: There is only one caller of this exception. Can that caller use
 * something else?
 */
r5js.QuasiquoteError = function(what) {
  this.toString = function() {
    return 'quasiquote error: ' + what;
  };
};


/** @override */
r5js.QuasiquoteError.prototype.getShortName =
    goog.functions.constant('QuasiquoteError');



/**
 * @param {*} where Object that caused the empty application.
 * @implements {r5js.Error}
 * @struct
 * @constructor
 * TODO bl: narrow the type of the parameter. Can it be string?
 */
r5js.IllegalEmptyApplication = function(where) {
  this.toString = function() {
    return 'illegal empty application in ' + where;
  };
};


/** @override */
r5js.IllegalEmptyApplication.prototype.getShortName =
    goog.functions.constant('IllegalEmptyApplication');



/**
 * @param {*} what
 * @implements {r5js.Error}
 * @struct
 * @constructor
 * TODO bl: Narrow the type of the parameter.
 */
r5js.ParseError = function(what) {
  this.toString = function() {
    return 'parse error on ' + what;
  };
};


/** @override */
r5js.ParseError.prototype.getShortName = goog.functions.constant('ParseError');



/**
 * @param {string} what Error message.
 * @implements {r5js.Error}
 * @struct
 * @constructor
 */
r5js.EvalError = function(what) {
  this.toString = function() {
    return 'evaluation error: ' + what;
  };
};


/** @override */
r5js.EvalError.prototype.getShortName = goog.functions.constant('EvalError');



/**
 * @param {string} what Object that caused the error.
 * @implements {r5js.Error}
 * @struct
 * @constructor
 */
r5js.ImmutableError = function(what) {
  this.toString = function() {
    return 'cannot mutate immutable object: ' + what;
  };
};


/** @override */
r5js.ImmutableError.prototype.getShortName =
    goog.functions.constant('ImmutableError');



/**
 * @param {string} what An error message.
 * @implements {r5js.Error}
 * @struct
 * @constructor
 */
r5js.ScanError = function(what) {
  this.toString = function() {
    return 'scan error on ' + what;
  };
};


/** @override */
r5js.ScanError.prototype.getShortName = goog.functions.constant('ScanError');
