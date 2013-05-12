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


goog.provide('r5js.tmp.sibling_buffer');

/**
 * Just a buffer to accumulate siblings without the client having to do
 * the pointer arithmetic.
 * @constructor
 */
function SiblingBuffer() {}

/**
 * @type {Datum}
 */
SiblingBuffer.prototype.first;

/**
 * @type {Datum}
 */
SiblingBuffer.prototype.last;

/**
 * @return {boolean} True iff the buffer is empty.
 */
SiblingBuffer.prototype.isEmpty = function() {
    return !this.first;
};

/**
 * @param {!Datum} node Node to append.
 * @return {!SiblingBuffer} This object, for chaining.
 */
SiblingBuffer.prototype.appendSibling = function(node) {
    if (node) {
        if (!this.first) {
            this.first = node;
            this.last = node.lastSibling();
        } else {
            this.last.nextSibling = node;
            this.last = node.lastSibling();
        }
    }
    return this;
};

/**
 * @return {Datum}
 */
SiblingBuffer.prototype.toSiblings = function() {
    return this.first;
};

/**
 * @param {*=} type
 * TODO bl: narrow the type of the parameter.
 */
SiblingBuffer.prototype.toList = function(type) {
  var ans = newEmptyList();
    ans.firstChild = this.first;
    if (type)
        ans.type = type; // default is (
    return ans;
};

/** @override */
SiblingBuffer.prototype.toString = function() {
    var tmp = newEmptyList();
    tmp.appendChild(this.first);
    return tmp.toString();
};