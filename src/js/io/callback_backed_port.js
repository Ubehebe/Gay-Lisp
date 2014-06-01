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


goog.provide('r5js.CallbackBackedPort');


goog.require('r5js.OutputPort');



/**
 * @param {function(!r5js.runtime.Value)} onOutput Callback that will be called
 * whenever output is available.
 * @implements {r5js.OutputPort}
 * @struct
 * @constructor
 */
r5js.CallbackBackedPort = function(onOutput) {
  /** @const @private */ this.onOutput_ = onOutput;
};
r5js.OutputPort.addImplementation(r5js.CallbackBackedPort);


/** @override */
r5js.CallbackBackedPort.prototype.close = goog.nullFunction;


/** @override */
r5js.CallbackBackedPort.prototype.writeValue = function(value) {
  this.onOutput_(value);
};


/** @override */
r5js.CallbackBackedPort.prototype.writeChar = goog.nullFunction;


/** @override */
r5js.CallbackBackedPort.prototype.display = function(value) {
  this.onOutput_(value);
};
