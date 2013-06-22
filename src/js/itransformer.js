/* Copyright 2011-2013 Brendan Linn

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


goog.provide('r5js.ITransformer');


/**
 * @interface
 */
r5js.ITransformer = function() {};

/**
 * @param {Function} callback Function to call on each subtransformer.
 * @param {!Array.<*>} args Additional arguments to pass to the callback.
 * TODO bl: tighten the type of the array elements.
 */
r5js.ITransformer.prototype.forEachSubtransformer = function(callback, args) {};


/**
 * @param {!r5js.Datum} inputDatum The input datum.
 * @param {!Object.<string, boolean>} literalIds Dictionary of literal identifiers.
 * @param {!r5js.IEnvironment} definitionEnv Definition environment.
 * @param {!r5js.IEnvironment} useEnv Use environment.
 * @param {!r5js.TemplateBindings} bindings Template bindings.
 * @return {boolean} True iff the transformer is a match (?)
 * TODO bl: what is the use of the value type in the literalIds dictionary?
 */
r5js.ITransformer.prototype.matchInput = function(
    inputDatum, literalIds, definitionEnv, useEnv, bindings) {};

/**
 * @param {!r5js.TemplateBindings} bindings Template bindings.
 */
r5js.ITransformer.prototype.toDatum = function(bindings) {};