/* Copyright 2011-2015 Brendan Linn

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


goog.provide('r5js.curPlatform');


goog.require('r5js.Platform');
goog.require('r5js.platform.Android');
goog.require('r5js.platform.Html5');
goog.require('r5js.platform.Node');


/** @return {!r5js.Platform} */
r5js.curPlatform = function() {
  // Because the Closure Compiler does aggressive dead code elimination,
  // this switch is effectively evaluated at compile time, not runtime.
  // r5js.PLATFORM can be defined as a command-line flag to the compiler,
  // so the switch simplifies to string literal comparisons, which can be done
  // by the compiler.
  // Note: small changes in this function (for example, adding a default case)
  // can defeat the compiler's dead code elimination. Modify with care
  // and ensure the size of the compiled JS makes sense.
  switch (r5js.PLATFORM) {
    case 'html5':
      return new r5js.platform.Html5(arguments[0] /* TODO bl improve */);
    case 'node':
      return new r5js.platform.Node();
    case 'android': // TODO bl this is increasing the size of other targets!
      return new r5js.platform.Android();
  }
};