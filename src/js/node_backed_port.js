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


goog.provide('r5js.NodeBackedPort');


goog.require('r5js.IOError');

/**
 * @suppress {missingProperties, undefinedVars} For this.fsModule.openSync,
 * this.fsModule.statSync, and require().
 * @implements {r5js.Port}
 * @constructor
 * TODO bl: remove the @suppress annotations when Node interop is better.
 */
r5js.NodeBackedPort = function(filename, mode) {

    /* We set this inside the constructor instead of the usual way
     so that a ReferenceError isn't thrown during parsing. */
    if (!r5js.NodeBackedPort.prototype.fsModule) {
        try {
            /* Of course, require might be defined but do something other
             than what we expect, which is to import the filesystem module.
             We don't check for that. */
            r5js.NodeBackedPort.prototype.fsModule = require('fs');
        } catch (re) {
            if (re instanceof ReferenceError) {
                throw new r5js.IOError("the JavaScript environment lacks filesystem access required for this IO procedure. "
                + "(This probably means you are running in a browser.)");
            }
        }
    }

    this.fd = this.fsModule.openSync(filename, mode);
    this.size = this.fsModule.statSync(filename).size;
    this.offset = 0;
};

/* We name the functions with string literals, not properties, to
 prevent the Google Closure Compiler from renaming them. See comments
 at Port. */


/**
 * @override
 * @suppress {missingProperties} For fsModule.closeSync.
 * TODO bl: remove @suppress once Node interop is better.
 */
r5js.NodeBackedPort.prototype.close = function() {
    this.fsModule.closeSync(this.fd);
};


/**
 * @override
  */
r5js.NodeBackedPort.prototype.isCharReady = function() {
    return true;
};


/**
 * @override
 * @suppress {missingProperties} For this.fsModule.readSync.
 * TODO bl: remove @suppress once Node interop is better.
 */
r5js.NodeBackedPort.prototype.peekChar = function() {
    return this.fsModule.readSync(this.fd, 1, this.offset)[0];
};


/**
 * @override
 * @suppress {missingProperties} For this.fsModule.readSync.
 * TODO bl: remove @suppress once Node interop is better.
 */
r5js.NodeBackedPort.prototype.readChar = function() {
    return this.fsModule.readSync(this.fd, 1, this.offset++)[0];
};


/** @override */
r5js.NodeBackedPort.prototype.toString = function() {
    return String(this.fd);
};


/**
 * @override
 * @suppress {missingProperties} For this.fsModule.writeSync.
 * TODO bl: remove @suppress once Node interop is better.
 */
r5js.NodeBackedPort.prototype.write = function(str) {
    this.fsModule.writeSync(this.fd, str, null);
};


/**
 * @override
 * @suppress {missingProperties} For this.fsModule.writeSync.
 * TODO bl: remove @suppress once Node interop is better.
 */
r5js.NodeBackedPort.prototype.writeChar = function(c) {
    this.fsModule.writeSync(this.fd, c, null);
};