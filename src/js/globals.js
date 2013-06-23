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


goog.provide('r5js.globals');


/**
 * Global variables and state.
 */
r5js.globals = {};


/**
 * This is (null-environment 5).
 * @type {r5js.IEnvironment}
 */
r5js.globals.nullEnv;


/**
 * This is (scheme-report-environment 5).
 * @type {r5js.IEnvironment}
 */
r5js.globals.r5RSEnv;


/**
 *  Setting this to true shows every bounce of the trampoline.
 * @type {boolean}
 */
r5js.globals.debug = Function('return "console" in this;')() && false;


/**
 * mostly for getting fresh temp variable names.
 * @type {number}
 */
r5js.globals.uniqueNodeCounter = 0;
