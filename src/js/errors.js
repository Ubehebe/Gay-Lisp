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


goog.provide('r5js.tmp.errors');
goog.provide('r5js.ArgumentTypeError');
goog.provide('r5js.EvalError');


goog.provide('r5js.GeneralSyntaxError');
goog.provide('r5js.IncorrectNumArgs');
goog.provide('r5js.InternalInterpreterError');
goog.provide('r5js.TooFewArgs');
goog.provide('r5js.TooManyArgs');
goog.provide('r5js.UnboundVariable');
/**
 * @param {string} name The name of the variable that was supposed to be
 * bound but wasn't.
 * @constructor
 */
r5js.UnboundVariable = function(name) {
    this.toString = function() {
        return 'unbound variable ' + name;
    };
};

/**
 * @param {string} name The name of the procedure.
 * @param {number} minNumArgs The procedure's minimum number of arguments.
 * @param {number} actualNumArgs The actual number of arguments passed to
 * the procedure.
 * @constructor
 */
r5js.TooFewArgs = function(name, minNumArgs, actualNumArgs) {
    this.toString = function() {
        return 'The procedure '
            + name
            + ' has been called with '
            + actualNumArgs
            + ' argument'
            + (actualNumArgs === 1 ? '' : 's')
            + '; it requires at least '
            + minNumArgs
            + ' argument'
            + (minNumArgs === 1 ? '' : 's');
    };
};

/**
 * @param {string} name The name of the procedure.
 * @param {number} maxNumArgs The procedure's maximum number of arguments.
 * @param {number} actualNumArgs The actual number of arguments passed to
 * the procedure.
 * @constructor
 */
r5js.TooManyArgs = function(name, maxNumArgs, actualNumArgs) {
    this.toString = function() {
        return 'The procedure '
            + name
            + ' has been called with '
            + actualNumArgs
            + ' argument'
            + (actualNumArgs === 1 ? '' : 's')
            + '; it requires at most '
            + maxNumArgs
            + ' argument'
            + (maxNumArgs === 1 ? '' : 's');
    };
};

/**
 * @param {string} name The name of the procedure.
 * @param {number} expectedNumArgs The expected number of arguments.
 * @param {number} actualNumArgs The actual number of arguments.
 * @constructor
 */
r5js.IncorrectNumArgs = function(name, expectedNumArgs, actualNumArgs) {
    this.toString = function() {
        return 'The procedure '
            + name
            + ' has been called with '
            + actualNumArgs
            + ' argument'
            + (actualNumArgs === 1 ? '' : 's')
            + '; it requires exactly '
            + expectedNumArgs
            + ' argument'
            + (expectedNumArgs === 1 ? '' : 's');
    };
};

/**
 * @param {string} msg An error message.
 * @constructor
 */
r5js.InternalInterpreterError = function(msg) {
    this.toString = function() {
        return msg;
    };
};

function PrimitiveProcedureError(message) {
    this.toString = function() { return message; };
}

/**
 * @param {*} argument The argument.
 * @param {number} which The position of the argument in the argument list
 * (zero-indexed).
 * @param {string} procName The procedure that the interpreter was invoking
 * when this error occurred.
 * @param {string} expectedType The type of the argument that the interpreter
 * expected.
 * @constructor
 */
r5js.ArgumentTypeError = function(argument, which, procName, expectedType) {
    this.toString = function() {
        return 'The object '
            + argument.toString()
            + ', passed as argument '
            + which
            + ' to '
            + procName
            + ', is not of the correct type '
            + expectedType;
    };
};

function MacroError(keyword, msg) {
    this.toString = function() {
        return 'Error in macro '
        + keyword + ': ' + msg;
    };
}

function UnimplementedOptionError(what) {
    this.toString = function() {
        return 'Sorry, '
            + what
            + ' is optional according to R5RS and unimplemented';
    }
}

/**
 * @param {*} what The object that caused the syntax error.
 * @constructor
 * TODO bl: narrow the type of the parameter.
 * TODO bl: Consider eliminating. It's vague.
 */
r5js.GeneralSyntaxError = function(what) {
    this.toString = function() {
        return 'bad syntax in ' + what;
    };
};

function IOError(what) {
    this.toString = function() {
        return 'IO error: ' + what;
    };
}

function QuasiquoteError(what) {
    this.toString = function() {
        return 'quasiquote error: ' + what;
    };
}

function IllegalEmptyApplication(where) {
    this.toString = function() {
        return 'illegal empty application in ' + where;
    };
}

function ParseError(what) {
    this.toString = function() {
        return 'parse error on ' + what;
    };
}

/**
 * @param {string} what Error message.
 * @constructor
 */
r5js.EvalError = function(what) {
    this.toString = function() {
        return 'evaluation error: ' + what;
    };
};

function ImmutableError(what) {
    this.toString = function() {
        return 'cannot mutate immutable object: ' + what;
    };
}

function ScanError(what) {
    this.toString = function() {
        return 'scan error on ' + what;
    };
}