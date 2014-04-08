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


goog.provide('r5js.RootEnvironment');


goog.require('r5js.UnboundVariable');
goog.require('r5js.IEnvironment');

/**
 * @param {!r5js.IEnvironment} delegate Environment used for most lookups.
 * @constructor
 * @implements {r5js.IEnvironment}
 */
r5js.RootEnvironment = function(delegate) {
    /**
     * @type {!r5js.IEnvironment}
     * @private
     */
    this.delegate_ = delegate;
};
r5js.IEnvironment.addImplementation(r5js.RootEnvironment);


/** @override */
r5js.RootEnvironment.prototype.toString = function() {
    return this.delegate_.toString();
};

/** @override */
r5js.RootEnvironment.prototype.get = function(name) {
    return this.delegate_.get(name);
};

/** @override */
r5js.RootEnvironment.prototype.getProcedure = function(name) {
  return this.delegate_.getProcedure(name);
};

/** @override */
r5js.RootEnvironment.prototype.addClosure = function(name, proc) {
    this.delegate_.addClosure(name, proc);
};

/** @override */
r5js.RootEnvironment.prototype.addBinding = function(name, val) {
    this.delegate_.addBinding(name, val);
};

/** @override */
r5js.RootEnvironment.prototype.mutate = function(name, newVal, isTopLevel) {
    this.delegate_.mutate(name, newVal, isTopLevel);
};


/** @override */
r5js.RootEnvironment.prototype.seal = function() {
    this.delegate_.seal();
};

/** @override */
r5js.RootEnvironment.prototype.hasBinding = function(name) {
    return this.delegate_.hasBinding(name);
};


/** @override */
r5js.RootEnvironment.prototype.hasClosure = function(name) {
    return this.delegate_.hasClosure(name);
};

/** @override */
r5js.RootEnvironment.prototype.hasBindingRecursive = function(name) {
    return this.delegate_.hasBindingRecursive(name);
};


/** @override */
r5js.RootEnvironment.prototype.newChildEnv = function(name) {
    return this.delegate_.newChildEnv(name);
};