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

goog.provide('r5js.valutil');



goog.require('r5js.Environment');
goog.require('r5js.InputPort');
goog.require('r5js.OutputPort');
goog.require('r5js.UserDefinedProcedure');
goog.require('r5js.ast.Quote');
goog.require('r5js.parse.Terminals');
goog.require('r5js.runtime.UNSPECIFIED_VALUE');


/**
 * Maps Scheme values to idiomatic JavaScript values:
 *
 * Scheme strings -> JS strings
 * Scheme numbers -> JS numbers
 * Scheme booleans -> JS booleans
 * Scheme symbols -> JS strings
 * Scheme characters -> JS strings
 * Scheme proper lists -> JS arrays
 * Scheme vectors -> JS arrays
 *
 * This is just intended as a convenience when using the Scheme interpreter
 * from its JavaScript API. The mapping is somewhat arbitrary;
 * the two languages' type systems don't fit exactly. It is also noninjective,
 * so it won't work in the JS -> Scheme direction.
 *
 * @param {!r5js.runtime.Value} value
 * @return {boolean|number|string|!Array|undefined}
 */
r5js.valutil.toJsValue = function(value) {
  switch (typeof value) {
    case 'number':
    case 'boolean':
    case 'string':
      return value;
    case 'object':
      if (value === r5js.runtime.UNSPECIFIED_VALUE) {
        return undefined;
      } else if (value instanceof r5js.Ref) {
        return r5js.valutil.toJsValue(value.deref());
      } else if (value instanceof r5js.ast.List ||
          value instanceof r5js.ast.Vector) {
        return value.mapChildren(r5js.valutil.toJsValue);
      } else if (value instanceof r5js.ast.String ||
          value instanceof r5js.ast.Character) {
        return value.getPayload();
      } else if (value instanceof r5js.Datum) {
        return value.unwrap();
      }
    default:
      return undefined;
  }
};


/**
 * @param {!r5js.runtime.Value} value
 * @return {string}
 */
r5js.valutil.toDisplayString = function(value) {
  return r5js.valutil.toString_(false /* includeSigils */, value);
};


/**
 * @param {!r5js.runtime.Value} value
 * @return {string}
 */
r5js.valutil.toWriteString = function(value) {
  return r5js.valutil.toString_(true /* includeSigils */, value);
};


/**
 * @param {boolean} includeSigils
 * @param {!r5js.runtime.Value} value
 * @return {string}
 * @private
 */
r5js.valutil.toString_ = function(includeSigils, value) {
  switch (typeof value) {
    case 'number':
      return value + '';
    case 'boolean':
      return value ? '#t' : '#f';
    case 'string':
      return value;
    case 'object':
      if (value === r5js.runtime.UNSPECIFIED_VALUE) {
        return '';
      } else if (value === r5js.runtime.EOF) {
        return '<eof>';
      } else if (value instanceof r5js.Ref) {
        return r5js.valutil.toString_(includeSigils, value.deref());
      } else if (value instanceof r5js.ast.List ||
          value instanceof r5js.ast.DottedList) {
        var children = value.mapChildren(
            goog.partial(r5js.valutil.toString_, includeSigils));
        if ((value instanceof r5js.ast.List && value.isImproperList()) ||
            value instanceof r5js.ast.DottedList) {
          children.splice(children.length - 1, 0, r5js.parse.Terminals.DOT);
        }
        return r5js.parse.Terminals.LPAREN +
            children.join(' ') +
            r5js.parse.Terminals.RPAREN;
      } else if (value instanceof r5js.ast.Vector) {
        var childStrings = value.mapChildren(
            goog.partial(r5js.valutil.toString_, includeSigils)).join(' ');
        return r5js.parse.Terminals.LPAREN_VECTOR +
            childStrings +
            r5js.parse.Terminals.RPAREN;
      } else if (value instanceof r5js.ast.String) {
        return includeSigils ?
            '"' + value.getPayload() + '"' : // TODO bl escape
            value.getPayload();
      } else if (value instanceof r5js.ast.Character) {
        if (includeSigils) {
          // Special cases for space and newline: R5RS 6.3.4
          var payload = value.getPayload();
          if (payload === ' ') {
            return '#\\space';
          } else if (payload === '\n') {
            return '#\\newline';
          } else {
            return '#\\' + payload;
          }
        } else {
          return value.getPayload();
        }
      } else if (value instanceof r5js.ast.Quote) {
        return r5js.parse.Terminals.TICK + r5js.valutil.toString_(
            includeSigils,
            /** @type {!r5js.runtime.Value} */ (value.getFirstChild()));
      } else if (value instanceof r5js.UserDefinedProcedure) {
        return '<proc:' + value.getName() + '>';
      } else if (value instanceof r5js.procspec.PrimitiveProcedure_) {
        return '<proc:' + value.getDebugName() + '>';
      } else if (r5js.InputPort.isImplementedBy(value)) {
        return '<input-port>';
      } else if (r5js.OutputPort.isImplementedBy(value)) {
        return '<output-port>';
      } else if (value instanceof r5js.Datum) {
        return r5js.valutil.toString_(includeSigils, value.unwrap());
      } else if (value instanceof r5js.Environment) {
        return '<environment-specifier>';
      }
    default:
      return '';
  }
};

