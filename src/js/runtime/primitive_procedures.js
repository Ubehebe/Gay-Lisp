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

goog.provide('r5js.PrimitiveProcedures');


goog.require('goog.log');
goog.require('r5js.CallWithCurrentContinuation');
goog.require('r5js.CallbackBackedPort');
goog.require('r5js.CdrHelper');
goog.require('r5js.Continuation');
goog.require('r5js.Datum');
goog.require('r5js.DatumType');
goog.require('r5js.DynamicWindContinuation');
goog.require('r5js.Environment');
goog.require('r5js.IEnvironment');
goog.require('r5js.IdShim');
goog.require('r5js.InputPort');
goog.require('r5js.OutputPort');
goog.require('r5js.PrimitiveProcedureError');
goog.require('r5js.ProcCall');
goog.require('r5js.ProcCallLike');
goog.require('r5js.SiblingBuffer');
goog.require('r5js.TooManyVarargs');
goog.require('r5js.UnimplementedOptionError');
goog.require('r5js.ast.Boolean');
goog.require('r5js.ast.Character');
goog.require('r5js.ast.CompoundDatum');
goog.require('r5js.ast.DottedList');
goog.require('r5js.ast.Identifier');
goog.require('r5js.ast.Lambda');
goog.require('r5js.ast.List');
goog.require('r5js.ast.Number');
goog.require('r5js.ast.Quote');
goog.require('r5js.ast.String');
goog.require('r5js.ast.Vector');
goog.require('r5js.parse.Terminals');
goog.require('r5js.procspec');
goog.require('r5js.runtime.EOF');
goog.require('r5js.runtime.UNSPECIFIED_VALUE');


/** @private {r5js.IEnvironment} */ r5js.PrimitiveProcedures.nullEnv_;

/** @private {r5js.IEnvironment} */ r5js.PrimitiveProcedures.r5RSEnv_;

/** @private {r5js.js.Environment} */ r5js.PrimitiveProcedures.jsEnv_;


/** @const @private {!Object.<string, !r5js.procspec.PrimitiveProcedure_>} */
r5js.PrimitiveProcedures.registry_ = {};


goog.scope(function() {
var _ = r5js.procspec;
var PrimitiveProcedures = r5js.PrimitiveProcedures.registry_;

// Equivalence-related procedures

/* From the description of eq? at R5RS 6.1, it looks like it is
     permissible for eq? to have exactly the same semantics as eqv?. */
PrimitiveProcedures['eqv?'] = PrimitiveProcedures['eq?'] =
    _.binary(function(p, q) { return p.eqv(q); });

// Type-related procedures

PrimitiveProcedures['boolean?'] = _.unary(function(node) {
  return node instanceof r5js.ast.Boolean;
});

PrimitiveProcedures['char?'] = _.unary(function(node) {
  return node instanceof r5js.ast.Character;
});

PrimitiveProcedures['input-port?'] = _.unary(function(port) {
  return r5js.InputPort.isImplementedBy(port);
});

PrimitiveProcedures['null?'] = _.unary(function(node) {
  return node instanceof r5js.ast.List && !node.getFirstChild();
});

PrimitiveProcedures['number?'] = _.unary(function(node) {
  return node instanceof r5js.ast.Number;
});

PrimitiveProcedures['output-port?'] = _.unary(function(port) {
  return r5js.OutputPort.isImplementedBy(port);
});

PrimitiveProcedures['pair?'] = _.unary(function(node) {
  return r5js.Pair.isImplementedBy(node) &&
      !!node.getFirstChild(); // 3.2: (pair? '()) => #f
});

PrimitiveProcedures['port?'] = _.unary(function(port) {
  return r5js.InputPort.isImplementedBy(port) ||
      r5js.OutputPort.isImplementedBy(port);
});

PrimitiveProcedures['procedure?'] = _.unary(function(node) {
  /* R5RS 6.4: "The procedure call-with-current-continuation
         packages up the current continuation as an "escape procedure"
         and passes it as an argument to proc." Thus a Continuation
         must count as a procedure. */
  return node instanceof r5js.ast.Lambda ||
      node instanceof r5js.Continuation;
});

PrimitiveProcedures['string?'] = _.unary(function(node) {
  return node instanceof r5js.ast.String;
});

PrimitiveProcedures['symbol?'] = _.unary(function(node) {
  return node instanceof r5js.ast.Identifier;
});

PrimitiveProcedures['vector?'] = _.unary(function(node) {
  return node instanceof r5js.ast.Vector;
});

// Number-related procedures

PrimitiveProcedures['='] = _.varargsAtLeast0(function() {
  for (var i = 0; i < arguments.length - 1; ++i) {
    if (arguments[i] !== arguments[i + 1]) {
      return false;
    }
  }
  return true;
}, r5js.DatumType.NUMBER);

PrimitiveProcedures['/'] = _.varargsAtLeast1(function() {
  if (arguments.length === 1) { // unary
    return 1 / arguments[0];
  } else { // varargs: (x1 / x2) / x3 etc
    var ans = arguments[0];
    for (var i = 1; i < arguments.length; ++i)
      ans /= arguments[i];
    return ans;
  }
}, r5js.DatumType.NUMBER);

PrimitiveProcedures['-'] = _.varargsAtLeast1(function() {
  if (arguments.length === 1) { // unary
    return -1 * arguments[0];
  } else { // varargs: (x1 - x2) - x3 etc
    var ans = arguments[0];
    for (var i = 1; i < arguments.length; ++i) {
      ans -= arguments[i];
    }
    return ans;
  }
}, r5js.DatumType.NUMBER);

PrimitiveProcedures['*'] = _.varargsAtLeast0(function() {
  var product = 1;
  for (var i = 0; i < arguments.length; ++i) {
    product *= arguments[i];
  }
  return product;
}, r5js.DatumType.NUMBER);

PrimitiveProcedures['+'] = _.varargsAtLeast0(function() {
  var sum = 0;
  for (var i = 0; i < arguments.length; ++i) {
    sum += arguments[i];
  }
  return sum;
}, r5js.DatumType.NUMBER);

PrimitiveProcedures['>='] = _.varargsAtLeast0(function() {
  for (var i = 0; i < arguments.length - 1; ++i) {
    if (arguments[i] < arguments[i + 1]) {
      return false;
    }
  }
  return true;
}, r5js.DatumType.NUMBER);

PrimitiveProcedures['>'] = _.varargsAtLeast0(function() {
  for (var i = 0; i < arguments.length - 1; ++i) {
    if (arguments[i] <= arguments[i + 1]) {
      return false;
    }
  }
  return true;
}, r5js.DatumType.NUMBER);

PrimitiveProcedures['<='] = _.varargsAtLeast0(function() {
  for (var i = 0; i < arguments.length - 1; ++i) {
    if (arguments[i] > arguments[i + 1]) {
      return false;
    }
  }
  return true;
}, r5js.DatumType.NUMBER);

PrimitiveProcedures['<'] = _.varargsAtLeast0(function() {
  for (var i = 0; i < arguments.length - 1; ++i) {
    if (arguments[i] >= arguments[i + 1]) {
      return false;
    }
  }
  return true;
}, r5js.DatumType.NUMBER);

PrimitiveProcedures['angle'] = _.unary(function(z) {
  throw new r5js.UnimplementedOptionError('angle');
}, r5js.DatumType.NUMBER);

PrimitiveProcedures['acos'] = _.unary(Math.acos, r5js.DatumType.NUMBER);

PrimitiveProcedures['asin'] = _.unary(Math.asin, r5js.DatumType.NUMBER);

PrimitiveProcedures['atan'] = _.varargsAtLeast1(function() {
  /* Oddly, R5RS overloads atan for both one and two arguments,
             rather than having a separate atan2. */
  switch (arguments.length) {
    case 1:
      return Math.atan(arguments[0]);
    case 2:
      return Math.atan2(arguments[0], arguments[1]);
    default:
      throw new r5js.TooManyVarargs('atan', 2, arguments.length);
  }
}, r5js.DatumType.NUMBER);

PrimitiveProcedures['ceiling'] = _.unary(Math.ceil, r5js.DatumType.NUMBER);

PrimitiveProcedures['complex?'] = _.unary(function(node) {
  return node instanceof r5js.ast.Number;
});

PrimitiveProcedures['cos'] = _.unary(Math.cos, r5js.DatumType.NUMBER);

PrimitiveProcedures['exact?'] = _.unary(function(x) {
  return false; // In JavaScript every number is a double.
}, r5js.DatumType.NUMBER);

PrimitiveProcedures['exact->inexact'] = _.unary(function(x) {
  return x; // In JavaScript every number is inexact
}, r5js.DatumType.NUMBER);

PrimitiveProcedures['exp'] = _.unary(Math.exp, r5js.DatumType.NUMBER);

PrimitiveProcedures['expt'] = _.binary(
    Math.pow, r5js.DatumType.NUMBER, r5js.DatumType.NUMBER);

PrimitiveProcedures['floor'] = _.unary(Math.floor, r5js.DatumType.NUMBER);

PrimitiveProcedures['imag-part'] = _.unary(function(z) {
  throw new r5js.UnimplementedOptionError('imag-part');
}, r5js.DatumType.NUMBER);

PrimitiveProcedures['inexact?'] = _.unary(function(x) {
  return true;
}, r5js.DatumType.NUMBER);

PrimitiveProcedures['inexact->exact'] = _.unary(function(x) {
  return x; // TODO bl
}, r5js.DatumType.NUMBER);

PrimitiveProcedures['magnitude'] = _.unary(function(z) {
  throw new r5js.UnimplementedOptionError('magnitude');
}, r5js.DatumType.NUMBER);

PrimitiveProcedures['make-polar'] = _.binary(function(x, y) {
  throw new r5js.UnimplementedOptionError('make-polar');
}, r5js.DatumType.NUMBER, r5js.DatumType.NUMBER);

PrimitiveProcedures['make-rectangular'] = _.binary(function(r, theta) {
  throw new r5js.UnimplementedOptionError('make-rectangular');
}, r5js.DatumType.NUMBER, r5js.DatumType.NUMBER);

PrimitiveProcedures['number->string'] = _.unary(function(x) {
  return new r5js.ast.String(x + '');
}, r5js.DatumType.NUMBER);

PrimitiveProcedures['integer?'] = _.unary(function(node) {
  return node instanceof r5js.ast.Number &&
      Math.round(node.getPayload()) === node.getPayload();
});

PrimitiveProcedures['log'] = _.unary(Math.log, r5js.DatumType.NUMBER);

PrimitiveProcedures['modulo'] = _.binary(function(p, q) {
  var remainder = p % q;
  var sign = p * q;
  var ans = remainder;
  if (sign > 0) {
    // Both positive or both negative: remainder and modulo are the same
    return remainder;
  } else if (p > 0) {
    /* If p is positive and q is negative,
                 remainder will be positive and modulo will be negative */
    while (ans > 0)
      ans += q;
    return ans;
  } else {
    /* If p is negative and q is positive,
                 remainder will be negative and modulo will be positive */
    while (ans < 0) {
      ans += q;
    }
    return ans;
  }
}, r5js.DatumType.NUMBER, r5js.DatumType.NUMBER);

PrimitiveProcedures['quotient'] = _.binary(function(p, q) {
  /* In Scheme, quotient rounds towards zero, which is unfortunately
                 not what JavaScript's Math.round() does. */
  var unrounded = p / q;
  return unrounded > 0 ? Math.floor(unrounded) : Math.ceil(unrounded);
}, r5js.DatumType.NUMBER, r5js.DatumType.NUMBER);

PrimitiveProcedures['rational?'] = _.unary(function(node) {
  return node instanceof r5js.ast.Number;
});

PrimitiveProcedures['real?'] = _.unary(function(node) {
  return node instanceof r5js.ast.Number;
});

PrimitiveProcedures['real-part'] = _.unary(function(z) {
  throw new r5js.UnimplementedOptionError('real-part');
}, r5js.DatumType.NUMBER);

PrimitiveProcedures['remainder'] = _.binary(function(p, q) {
  // The JavaScript % semantics are precisely the Scheme remainder semantics.
  return p % q;
}, r5js.DatumType.NUMBER, r5js.DatumType.NUMBER);

PrimitiveProcedures['round'] = _.unary(function(x) {
  /* R5RS 6.2.5: "Round returns the closest integer to x,
             rounding to even when x is halfway between two integers." */
  var down = Math.floor(x);
  var downDiff = Math.abs(x - down);
  var up = Math.ceil(x);
  var upDiff = Math.abs(up - x);

  if (upDiff < downDiff) {
    return up;
  } else if (downDiff < upDiff) {
    return down;
  } else {
    return up % 2 ? down : up;
  }
}, r5js.DatumType.NUMBER);

PrimitiveProcedures['sin'] = _.unary(Math.sin, r5js.DatumType.NUMBER);

PrimitiveProcedures['sqrt'] = _.unary(Math.sqrt, r5js.DatumType.NUMBER);

PrimitiveProcedures['string->number'] = _.unary(
    parseFloat, r5js.DatumType.STRING);

PrimitiveProcedures['tan'] = _.unary(Math.tan, r5js.DatumType.NUMBER);

PrimitiveProcedures['truncate'] = _.unary(function(x) {
  /* R5RS 6.2.5: "Truncate returns the integer closest to x
   whose absolute value is not larger than the absolute value of x." */
  return x > 0 ? Math.floor(x) : Math.ceil(x);
}, r5js.DatumType.NUMBER);

// Pair-related procedures

PrimitiveProcedures['car'] = _.unary(
    function(p) { return p.car(); },
    r5js.DatumType.PAIR);

PrimitiveProcedures['cdr'] = _.unary(
    function(p) { return p.cdr(); },
    r5js.DatumType.PAIR);

PrimitiveProcedures['cons'] = _.binary(function(car, cdr) {
  // todo bl this is really expensive! can we cut down on the copying?
  var realCar = car.clone();
  var realCdr = cdr.clone();
  // Since cdr already has a "head of list" node, reuse that. Convoluted eh?
  if (realCdr instanceof r5js.ast.List || realCdr.isImproperList()) {
    var oldFirstChild = realCdr.getFirstChild();
    realCdr.setFirstChild(realCar);
    realCar.setNextSibling(oldFirstChild);
    return realCdr;
  } else {
    return new r5js.SiblingBuffer().
        appendSibling(realCar).
        appendSibling(realCdr).
        toList(r5js.ast.DottedList);
  }
});

PrimitiveProcedures['set-car!'] = _.binary(function(p, car) {
  if (!(p instanceof r5js.ast.List || p.isImproperList())) {
    throw new r5js.ArgumentTypeError(
        p, 0, 'set-car!', r5js.parse.Terminals.LPAREN);
  }
  if (p.isImmutable()) {
    throw new r5js.ImmutableError(p.toString());
  }

  car.setNextSibling(p.getFirstChild().getNextSibling());
  p.setFirstChild(car);

  var helper = (/** @type {!r5js.ast.CompoundDatum} */ (p)).getCdrHelper();
  if (helper) {
    helper.setCar(car);
  }

  return r5js.runtime.UNSPECIFIED_VALUE;
});

PrimitiveProcedures['set-cdr!'] = _.binary(function(p, cdr) {
  if (!(p instanceof r5js.ast.List || p.isImproperList())) {
    throw new r5js.ArgumentTypeError(
        p, 0, 'set-cdr!', r5js.parse.Terminals.LPAREN);
  }

  if (p.isImmutable()) {
    throw new r5js.ImmutableError(p.toString());
  }

  if (cdr instanceof r5js.ast.List) {
    p.getFirstChild().setNextSibling(cdr.getFirstChild());
  } else {
    p.getFirstChild().setNextSibling(cdr);
  }

  var helper = (/** @type {!r5js.ast.CompoundDatum} */ (p)).getCdrHelper();
  if (helper) {
    helper.setCdr(cdr);
  }

  if (p instanceof r5js.ast.List) {
    p.markDirty();
  }

  return r5js.runtime.UNSPECIFIED_VALUE;
});

// Vector-related procedures

PrimitiveProcedures['make-vector'] = _.varargsRange(
    function(numberNode, fillNode) {
      if (!(numberNode instanceof r5js.ast.Number)) {
        throw new r5js.ArgumentTypeError(
            numberNode, 0, 'make-vector', r5js.DatumType.NUMBER);
      }
      var n = numberNode.getPayload();
      /* R5RS 6.3.6: "If a second argument is given, then each element
         is initialized to fill. Otherwise the initial contents of each element
         is unspecified." False seems like a good default. */
      fillNode = fillNode || new r5js.ast.Boolean(false);
      var buf = [];
      for (var i = 0; i < n; ++i) {
        buf.push(fillNode.clone());
      }
      return new r5js.ast.Vector(buf);
    }, 1, 2);

PrimitiveProcedures['vector-length'] = _.unary(function(v) {
  return v.vectorLength();
}, 'vector' /* TODO bl */);

PrimitiveProcedures['vector-ref'] = _.binary(function(v, k) {
  return v.vectorRef(k);
}, 'vector' /* TODO bl */, r5js.DatumType.NUMBER);

PrimitiveProcedures['vector-set!'] = _.ternary(function(v, k, fill) {
  if (!(v instanceof r5js.ast.Vector)) {
    throw new r5js.ArgumentTypeError(
        v, 0, 'vector-set!', r5js.DatumType.VECTOR);
  }
  if (!(k instanceof r5js.ast.Number)) {
    throw new r5js.ArgumentTypeError(
        k, 1, 'vector-set!', r5js.DatumType.NUMBER);
  }
  if (v.isImmutable()) {
    throw new r5js.ImmutableError(v.toString());
  }
  v.vectorSet(k.getPayload(), fill);
  // todo bl requires a cycle-labeling procedure like set-car! and set-cdr!
  return r5js.runtime.UNSPECIFIED_VALUE;
});

// Symbol-related procedures

PrimitiveProcedures['symbol->string'] = _.unary(function(sym) {
  return new r5js.ast.String(sym).setImmutable();
}, r5js.DatumType.SYMBOL);

PrimitiveProcedures['string->symbol'] = _.unary(function(node) {
  // TODO bl it doesn't seem right to be creating Identifiers instead of Symbols
  return new r5js.ast.Identifier(node.getPayload());
});

// Character-related procedures

PrimitiveProcedures['char=?'] = _.binary(function(node1, node2) {
  return node1.getPayload() === node2.getPayload();
}, r5js.DatumType.CHARACTER, r5js.DatumType.CHARACTER);

PrimitiveProcedures['char<?'] = _.binary(function(node1, node2) {
  return node1.getPayload() < node2.getPayload();
}, r5js.DatumType.CHARACTER, r5js.DatumType.CHARACTER);

PrimitiveProcedures['char>?'] = _.binary(function(node1, node2) {
  return node1.getPayload() > node2.getPayload();
}, r5js.DatumType.CHARACTER, r5js.DatumType.CHARACTER);

PrimitiveProcedures['char<=?'] = _.binary(function(node1, node2) {
  return node1.getPayload() <= node2.getPayload();
}, r5js.DatumType.CHARACTER, r5js.DatumType.CHARACTER);

PrimitiveProcedures['char>=?'] = _.binary(function(node1, node2) {
  return node1.getPayload() >= node2.getPayload();
}, r5js.DatumType.CHARACTER, r5js.DatumType.CHARACTER);

PrimitiveProcedures['char->integer'] = _.unary(function(node) {
  return node.getPayload().charCodeAt(0);
}, r5js.DatumType.CHARACTER);

PrimitiveProcedures['integer->char'] = _.unary(function(i) {
  return new r5js.ast.Character(String.fromCharCode(i));
}, r5js.DatumType.NUMBER);

PrimitiveProcedures['char-upcase'] = _.unary(function(node) {
  return new r5js.ast.Character(node.getPayload().toUpperCase());
}, r5js.DatumType.CHARACTER);

PrimitiveProcedures['char-downcase'] = _.unary(function(node) {
  return new r5js.ast.Character(node.getPayload().toLowerCase());
}, r5js.DatumType.CHARACTER);

// String-related procedures

PrimitiveProcedures['make-string'] = _.varargsRange(
    function(numberNode, charNode) {
      /* R5RS 6.3.5: "If char is given, then all elements of the
             string are initialized to char, otherwise the contents
             of the string are unspecified." */
      var c = goog.isDef(charNode) ? charNode.getPayload() : ' ';
      var n = numberNode.getPayload();
      var s = '';
      for (var i = 0; i < n; ++i) {
        s += c;
      }
      return new r5js.ast.String(s);
    }, 1, 2);

PrimitiveProcedures['string-length'] = _.unary(function(node) {
  return node.getPayload().length;
}, r5js.DatumType.STRING);

PrimitiveProcedures['string-ref'] = _.binary(function(node, i) {
  return new r5js.ast.Character(node.getPayload().charAt(i));
}, r5js.DatumType.STRING, r5js.DatumType.NUMBER);

PrimitiveProcedures['string-set!'] = _.ternary(function(str, k, c) {
  if (str.isImmutable()) {
    throw new r5js.ImmutableError(/** @type {string} */ (str.getPayload()));
  }
  var s = str.getPayload();
  str.setPayload(s.substr(0, k) + c.getPayload() + s.substr(k + 1));
  return r5js.runtime.UNSPECIFIED_VALUE;
}, r5js.DatumType.STRING,
r5js.DatumType.NUMBER,
r5js.DatumType.CHARACTER);

// Vector-related procedures

// Evaluation-related procedures

PrimitiveProcedures['eval'] = _.binaryWithCurrentPorts(
    /** @suppress {accessControls} */function(
        inputPort, outputPort, expr, envSpec) {
      if (!(expr instanceof r5js.Datum))
        throw new r5js.ArgumentTypeError(
            expr, 0, 'eval', 'ref' /* TODO bl is this right? */);
      if (!r5js.IEnvironment.isImplementedBy(envSpec)) {
        throw new r5js.ArgumentTypeError(
            envSpec, 1, 'eval', r5js.DatumType.ENVIRONMENT_SPECIFIER);
      }
      /* An interesting special case. If we're about to evaluate a wrapped
  procedure (primitive JavaScript or SchemeProcedure), return its name
  (= external representation) instead. Example:

  (eval + (null-environment 5))

  The answer is (the external representation) +, even though the identifier
  + is not bound in the null environment. Why? eval, like every procedure,
  receives its arguments already evaluated, and the value of the identifier
  + in the regular environment is the primitive procedure for addition.
  But if we were to pass this Datum-wrapped procedure into the parser,
  it would not know what to do with it and parsing would fail.

  todo bl: are there any other cases where a procedure can
  escape into the parser? */

      if (expr instanceof r5js.ast.Lambda)
        return new r5js.ast.Identifier(/** @type {string} */ (expr.getName()));

      else {
        /* Call the parse/desugar/eval portions of the interpreter pipeline
    manually. It would be nice to reuse the code in api.js, but it made
    for some awkward forward references. Reasoning about this copy/pasted
    code is simpler than reasoning about the build process. */

        var env = /** @type {!r5js.IEnvironment} */ (envSpec);
        // don't accidentally evaluate the next expr!
        expr.nextSibling_ = null;

        var parsed = new r5js.ParserImpl(expr).parse();
        if (!parsed)
          throw new r5js.ParseError(expr);
        var continuable = /** @type {!r5js.ProcCallLike} */ (
            parsed.desugar(env));
        return r5js.trampoline(continuable, env, inputPort, outputPort);
      }
    });

/* This is not part of any Scheme standard, but it should be useful to
     test Scheme expressions that should not evaluate. */
PrimitiveProcedures['will-eval?'] = _.binary(
    /** @suppress {accessControls} */function(expr) {
      try {
        PrimitiveProcedures['eval'].fn_.call(null, expr);
        return true;
      } catch (e) {
        return false;
      }
    });

// I/O related procedures

PrimitiveProcedures['char-ready?'] = _.nullaryOrUnaryWithCurrentPorts(
    function(inputPort, outputPort, maybeUserSuppliedInputPort) {
      var inputPortToUse = maybeUserSuppliedInputPort || inputPort;
      if (!r5js.InputPort.isImplementedBy(inputPortToUse)) {
        throw new r5js.ArgumentTypeError(
            inputPortToUse, 0, 'char-ready?', r5js.DatumType.INPUT_PORT);
      }
      return inputPortToUse.isCharReady();
    });

PrimitiveProcedures['close-input-port'] = _.unary(function(datum) {
  datum.close();
  return r5js.runtime.UNSPECIFIED_VALUE;
}, r5js.DatumType.INPUT_PORT);

PrimitiveProcedures['close-output-port'] = _.unary(function(datum) {
  datum.close();
  return r5js.runtime.UNSPECIFIED_VALUE;
}, r5js.DatumType.OUTPUT_PORT);

PrimitiveProcedures['current-input-port'] = _.nullaryWithCurrentPorts(
    function(inputPort, outputPort) { return inputPort; });

PrimitiveProcedures['current-output-port'] = _.nullaryWithCurrentPorts(
    function(inputPort, outputPort) { return outputPort; });

/* According to R5RS 6.6.3, display is supposed to be a library
     procedure. Since the only non-library output routine is write-char,
     display would presumably have to be written in terms of write-char.
     That's not too efficient, so I decided to write it in JavaScript. */
PrimitiveProcedures['display'] = _.unaryOrBinaryWithCurrentPorts(
    function(inputPort, outputPort, datum, maybeUserSuppliedOutputPort) {
      var outputPortToUse = maybeUserSuppliedOutputPort || outputPort;
      if (!r5js.OutputPort.isImplementedBy(outputPortToUse)) {
        throw new r5js.ArgumentTypeError(
            outputPortToUse, 1, 'display', r5js.DatumType.OUTPUT_PORT);
      }
      (/** @type {!r5js.OutputPort} */ (outputPortToUse)).display(datum);
      return r5js.runtime.UNSPECIFIED_VALUE;
    });

PrimitiveProcedures['eof-object?'] = _.unary(function(port) {
  return port === r5js.runtime.EOF;
});

PrimitiveProcedures['open-input-file'] = _.unary(function(datum) {
  return r5js.PrimitiveProcedures.jsEnv_.newInputPort(datum.getPayload());
}, r5js.DatumType.STRING);

PrimitiveProcedures['open-output-file'] = _.unary(function(datum) {
  return r5js.PrimitiveProcedures.jsEnv_.newOutputPort(datum.getPayload());
}, r5js.DatumType.STRING);

PrimitiveProcedures['peek-char'] = _.nullaryOrUnaryWithCurrentPorts(
    function(inputPort, outputPort, maybeUserSuppliedInputPort) {
      var inputPortToUse = maybeUserSuppliedInputPort || inputPort;
      if (!r5js.InputPort.isImplementedBy(inputPortToUse)) {
        throw new r5js.ArgumentTypeError(
            inputPortToUse, 0, 'peek-char', r5js.DatumType.INPUT_PORT);
      }
      return inputPortToUse.peekChar() || r5js.runtime.EOF;
    });

PrimitiveProcedures['read'] = _.nullaryOrUnaryWithCurrentPorts(
    function(inputPort, outputPort, maybeUserSuppliedInputPort) {
      var inputPortToUse = maybeUserSuppliedInputPort || inputPort;
      if (!r5js.InputPort.isImplementedBy(inputPortToUse)) {
        throw new r5js.ArgumentTypeError(
            inputPortToUse, 0, 'read', r5js.DatumType.INPUT_PORT);
      }
      return inputPortToUse.read() || r5js.runtime.EOF;
    });

PrimitiveProcedures['read-char'] = _.nullaryOrUnaryWithCurrentPorts(
    function(inputPort, outputPort, maybeUserSuppliedInputPort) {
      var inputPortToUse = maybeUserSuppliedInputPort || inputPort;
      if (!r5js.InputPort.isImplementedBy(inputPortToUse)) {
        throw new r5js.ArgumentTypeError(
            inputPortToUse, 0, 'read-char', r5js.DatumType.INPUT_PORT);
      }
      return inputPortToUse.readChar() || r5js.runtime.EOF;
    });

PrimitiveProcedures['write'] = _.unaryOrBinaryWithCurrentPorts(
    function(inputPort, outputPort, datum, maybeUserSuppliedOutputPort) {
      var outputPortToUse = maybeUserSuppliedOutputPort || outputPort;
      if (!r5js.OutputPort.isImplementedBy(outputPortToUse)) {
        throw new r5js.ArgumentTypeError(
            outputPortToUse, 1, 'write', r5js.DatumType.OUTPUT_PORT);
      }
      outputPortToUse.writeValue(datum);
      return r5js.runtime.UNSPECIFIED_VALUE;
    });

PrimitiveProcedures['write-char'] = _.unaryOrBinaryWithCurrentPorts(
    function(inputPort, outputPort, charNode, maybeUserSuppliedOutputPort) {
      if (!(charNode instanceof r5js.ast.Character)) {
        throw new r5js.ArgumentTypeError(
            charNode, 0, 'write-char', r5js.DatumType.CHARACTER);
      }
      var outputPortToUse = maybeUserSuppliedOutputPort || outputPort;
      if (!r5js.OutputPort.isImplementedBy(outputPortToUse)) {
        throw new r5js.ArgumentTypeError(
            outputPortToUse, 1, 'write-char', r5js.DatumType.OUTPUT_PORT);
      }
      outputPortToUse.writeChar(charNode.getPayload());
      return r5js.runtime.UNSPECIFIED_VALUE;
    });

// Control flow related procedures


/**
 * R5RS 6.4: (apply proc arg1 ... args)
 * "Proc must be a procedure and args must be a list.
 * Calls proc with the elements of the list
 * (append (list arg1 ...) args) as the actual arguments.
 */
PrimitiveProcedures['apply'] = _.atLeastNWithSpecialEvalLogic(2, function() {
  var mustBeProc = arguments[0];
  if (!(mustBeProc instanceof r5js.ast.Lambda)) {
    throw new r5js.ArgumentTypeError(
        mustBeProc, 0, 'apply', r5js.parse.Terminals.LAMBDA);
  }

  var procName = new r5js.ast.Identifier(mustBeProc.getName());
  var procCallLike = arguments[arguments.length - 2];
  var resultStruct = /** @type {!r5js.TrampolineHelper} */ (
      arguments[arguments.length - 1]);

  var lastRealArgIndex = arguments.length - 3;
  var mustBeList = arguments[lastRealArgIndex];
  if (!(mustBeList instanceof r5js.ast.List)) {
    throw new r5js.ArgumentTypeError(
        mustBeList, lastRealArgIndex, 'apply', r5js.parse.Terminals.LPAREN);
  }

  // (apply foo '(x y z))
  if (lastRealArgIndex === 1) {
    var newArgs = new r5js.SiblingBuffer();
    // todo bl document why we are quoting the arguments
    for (var arg = mustBeList.getFirstChild(); arg; arg = arg.getNextSibling())
      newArgs.appendSibling(new r5js.ast.Quote(arg));
    var actualProcCall = new r5js.ProcCall(
        procName, newArgs.toSiblings());
    actualProcCall.setNext(procCallLike.getNext());
    actualProcCall.setResultName(procCallLike.getResultName());
    resultStruct.setNext(actualProcCall);
  } else {
    // (apply foo a b c '(1 2 3))
    for (var i = 1; i < lastRealArgIndex - 1; ++i) {
      arguments[i].setNextSibling(arguments[i + 1]);
    }
    arguments[lastRealArgIndex - 1].setNextSibling(mustBeList.getFirstChild());

    var newArgs = new r5js.SiblingBuffer().
        appendSibling(arguments[1]).
        toSiblings();
    var actualProcCall = new r5js.ProcCall(procName, newArgs);
    actualProcCall.setNext(procCallLike.getNext());
    actualProcCall.setResultName(procCallLike.getResultName());
    resultStruct.setNext(actualProcCall);
  }

  return r5js.runtime.UNSPECIFIED_VALUE;
});


/**
 * Semantics of dynamic-wind (as I understand it):
 * (dynamic-wind foo bar baz) means execute bar with the
 * following modifications:
 *
 * - Whenever I'm about to go into bar, do foo first
 * - Whenever I'm about to go out of bar, do baz first
 *
 * In simple cases, this is the same as (begin foo bar baz)
 * (except that the return value is that of bar, not baz).
 * The situation is complicated by continuations captured inside
 * a call/cc and later reentered; these must trigger the before
 * and after thunks. For example:
 *
 * (define cont #f)
 * (define (foo) (display 'foo))
 * (define (bar) (display 'bar))
 * (dynamic-wind
 * foo
 * (lambda ()
 * (call-with-current-continuation
 * (lambda (c)
 * (set! cont c))))
 * bar)
 * (cont 42)
 *
 * This will print "foo", "bar", "foo", "bar", and return
 * an unspecified value (because there's nothing in the body
 * of the lambda after the call/cc, for the call/cc to deliver the
 * 42 to).
 */
PrimitiveProcedures['dynamic-wind'] = _.ternaryWithSpecialEvalLogic(
    function(before, thunk, after, procCallLike, resultStruct) {

      var procCall = /** @type {!r5js.ProcCall} */ (procCallLike);
      // None of the three thunks have any arguments.

      // todo bl use a ContinuableBuffer for efficiency

      var procCallBefore = new r5js.ProcCall(
          procCall.getFirstOperand(), null /* no arguments */);

      var procCallAfter = new r5js.ProcCall(
          procCall.getFirstOperand().getNextSibling().getNextSibling(),
          null /* no arguments */);

      var procCallThunk = new r5js.ProcCall(
          procCall.getFirstOperand().getNextSibling(),
          null /* no arguments */);

      r5js.ProcCallLike.appendProcCallLike(
          procCallAfter,
          new r5js.IdShim(
              new r5js.ast.Identifier(procCallThunk.getResultName())));
      r5js.ProcCallLike.getLast(procCallAfter).setNext(
          /** @type {!r5js.ProcCallLike} */ (procCallLike.getNext()));


      r5js.ProcCallLike.appendProcCallLike(
          procCallThunk, procCallAfter);
      r5js.ProcCallLike.appendProcCallLike(
          procCallBefore, procCallThunk);

      resultStruct.setNext(procCallBefore);
      /* We use the TrampolineResultStruct to store the thunk.
         This should be okay because dynamic-wind is the only one
         who writes to it, and call/cc is the only one who reads it.
         todo bl document why we cannot reuse procCallBefore. */
      resultStruct.setBeforeThunk(new r5js.ProcCall(
          procCall.getFirstOperand(),
          null /* no arguments */, procCallBefore.getResultName()));
      return r5js.runtime.UNSPECIFIED_VALUE;
    });


/**
 * R5RS 6.4: (call-with-values producer consumer)
 * "Calls its producer argument with no values and a continuation that,
 * when passed some values, calls the consumer procedure with those values
 * as arguments. The continuation for the call to consumer is the continuation
 * of the call to call-with-values."
 */
PrimitiveProcedures['call-with-values'] = _.binaryWithSpecialEvalLogic(
    function(producer, consumer, procCallLike, resultStruct) {
      var procCall = /** @type {!r5js.ProcCall} */ (procCallLike);
      var producerCall = new r5js.ProcCall(
          procCall.getFirstOperand(), null /* no arguments */);
      var consumerCall = new r5js.ProcCall(
          procCall.getFirstOperand().getNextSibling(),
          new r5js.ast.Identifier(producerCall.getResultName()));
      consumerCall.setNext(/** @type {!r5js.ProcCallLike} */ (
          procCallLike.getNext()));
      producerCall.setNext(consumerCall);
      resultStruct.setNext(producerCall);
      return r5js.runtime.UNSPECIFIED_VALUE;
    });


/**
 * Semantics of call/cc:
 *
 * (call-with-current-continuation foo)
 *
 * means create a new procedure call,
 *
 * (foo cc)
 *
 * where cc is the current continuation. Then inside the procedure body,
 * if we see
 *
 * (cc x)
 *
 * (that is, if the trampoline determines that the identifier is bound to a
 * Continuation object), this means bind x to cc's lastResultName and set
 * the next continuable to cc's nextContinuable.
 *
 * TODO bl: type checking is turned off because of the continuation argument
 * to new r5js.ProcCall. Subclass and correct.
 */
PrimitiveProcedures['call-with-current-continuation'] =
    _.unaryWithSpecialEvalLogic(/** @suppress {checkTypes} */ function(
        procedure, procCallLike, resultStruct) {
      var procCall = /** @type {!r5js.ProcCall} */ (procCallLike);
      var next = procCallLike.getNext();
      var resultName = procCallLike.getResultName();
      var beforeThunk = resultStruct.getBeforeThunk();
      /* If this continuation is inside a call to dynamic-wind but
         escapes and then is later re-called, we have to remember
         to execute the associated before and after thunks. */
      var continuation = beforeThunk ?
          new r5js.DynamicWindContinuation(
              beforeThunk, next, resultName) :
          new r5js.Continuation(resultName, next);
      var dummyProcCall = new r5js.CallWithCurrentContinuation(
          procCall.getFirstOperand(), continuation);
      if (next) {
            dummyProcCall.setNext(next);
      }
      dummyProcCall.setResultName(procCallLike.getResultName());
      resultStruct.setNext(dummyProcCall);
      return r5js.runtime.UNSPECIFIED_VALUE;
    });


// TODO bl: This can be implemented as a macro. See R5RS p. 34.
PrimitiveProcedures['values'] = _.atLeastNWithSpecialEvalLogic(1, function() {
  // Varargs procedures that also have special eval logic are a pain.
  var resultStruct = arguments[arguments.length - 1];
  var procCallLike = arguments[arguments.length - 2];
  var procCall = arguments[arguments.length - 2];
  var numUserArgs = arguments.length - 2;

  /* If there's just one user-supplied argument, that works fine
     with the existing machinery. Example:

     (values 1 [_0 ...])

     should just bind 1 to _0 and continue. */
  if (numUserArgs === 1) {
    procCall.getEnv().addBinding(procCallLike.getResultName(), arguments[0]);
  } else {
    /* If there's more than one argument, we bind the whole array
       to the continuation's lastResultName. This means later, when we're
       evaluating the arguments to a procedure call, we have to remember
       that a single name like _0 could specify a whole list of arguments. */

    var userArgs = [];

    for (var i = 0; i < numUserArgs; ++i) {
      userArgs.push(arguments[i]);
    }

    procCall.getEnv().addBinding(procCallLike.getResultName(), userArgs);
  }
  var nextContinuable = procCallLike.getNext();
  if (nextContinuable) {
    nextContinuable.setStartingEnv(procCall.getEnv());
  }
  resultStruct.setNext(nextContinuable);
  return r5js.runtime.UNSPECIFIED_VALUE;
});


// Environment-related procedures

PrimitiveProcedures['null-environment'] = _.unary(function(num) {
  if (num !== 5) {
    throw new r5js.UnimplementedOptionError(
        '(null-environment ' + num + ')');
  }
  return new r5js.Environment(r5js.PrimitiveProcedures.nullEnv_);
}, r5js.DatumType.NUMBER);

PrimitiveProcedures['scheme-report-environment'] = _.unary(function(num) {
  if (num !== 5) {
    throw new r5js.UnimplementedOptionError(
        '(scheme-report-environment ' + num + ')');
  }
  return new r5js.Environment(r5js.PrimitiveProcedures.r5RSEnv_);
}, r5js.DatumType.NUMBER);


});  // goog.scope


/**
 * @param {!r5js.runtime.Value} arg
 * @return {!r5js.Type}
 * @private
 * @suppress {accessControls|checkTypes} TODO bl
 */
r5js.PrimitiveProcedures.getActualType_ = function(arg) {
  var types = goog.object.getValues(r5js.DatumType);
  for (var i = 0; i < types.length; ++i) {
    var type = types[i];
    var predicateName = type + '?';
    if (predicateName in r5js.PrimitiveProcedures.registry_ &&
            r5js.PrimitiveProcedures.registry_[predicateName].fn_.call(
                null, arg)) {
      return /** @type {!r5js.Type} */ (type);
    }
  }
  return 'unknown type';
};


/**
 * @param {!r5js.IEnvironment} nullEnv
 * @param {!r5js.IEnvironment} r5RSEnv
 * @param {!r5js.js.Environment} jsEnv JavaScript execution environment.
 */
r5js.PrimitiveProcedures.install = function(nullEnv, r5RSEnv, jsEnv) {
  r5js.PrimitiveProcedures.nullEnv_ = nullEnv;
  r5js.PrimitiveProcedures.r5RSEnv_ = r5RSEnv;
  r5js.PrimitiveProcedures.jsEnv_ = jsEnv;
  for (var name in r5js.PrimitiveProcedures.registry_) {
    var proc = r5js.PrimitiveProcedures.registry_[name];
    proc.setDebugName(name);
    r5RSEnv.addBinding(name, proc);
  }
};

