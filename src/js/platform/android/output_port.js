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

goog.provide('r5js.platform.android.OutputPort');

goog.require('r5js.OutputPort');



/**
 * @implements {r5js.OutputPort}
 * @struct
 * @constructor
 */
r5js.platform.android.OutputPort = function() {};
r5js.OutputPort.addImplementation(r5js.platform.android.OutputPort);


/** @override */
r5js.platform.android.OutputPort.prototype.close = goog.nullFunction;


/**
 * TODO bl: defining write directly as AndroidSchemePlatform.print
 * causes an error I've never seen before: "NPMethod called on non-NPObject".
 * Probably has to do with cross-language bindings.
 * @override
 */
r5js.platform.android.OutputPort.prototype.write = function(str) {
  AndroidSchemePlatform.print(str);
};
