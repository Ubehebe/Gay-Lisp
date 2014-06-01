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

goog.provide('r5js.Terminal');



/**
 * "Dumb" terminal that {@link r5js.Repl} can read to and write from.
 * In contrast to a Repl, a Terminal knows nothing about Scheme.
 * @interface
 */
r5js.Terminal = function() {};


/** @return {!goog.Promise.<string>} The next line of input. */
r5js.Terminal.prototype.getNextLineOfInput = function() {};


/** @param {string} str String to print. */
r5js.Terminal.prototype.print = function(str) {};


/** @param {string} str Error message to print. */
r5js.Terminal.prototype.error = function(str) {};
