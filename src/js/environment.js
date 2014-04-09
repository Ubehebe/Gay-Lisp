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


goog.provide('r5js.Environment');


goog.require('r5js.Continuation');
goog.require('r5js.Datum');
goog.require('r5js.EvalError');
goog.require('r5js.IEnvironment');
goog.require('r5js.InputPort');
goog.require('r5js.InternalInterpreterError');
goog.require('r5js.JsObjOrMethod');
goog.require('r5js.Macro');
goog.require('r5js.OutputPort');
goog.require('r5js.PrimitiveProcedure');
goog.require('r5js.Procedure');
goog.require('r5js.Ref');
goog.require('r5js.UnboundVariable');
goog.require('r5js.ast.Lambda');
goog.require('r5js.runtime.UNSPECIFIED_VALUE');



/**
 * @param {r5js.IEnvironment} enclosingEnv The enclosing environment, if any.
 * @constructor
 * @implements {r5js.IEnvironment}
 */
r5js.Environment = function(enclosingEnv) {

  /** @const @private */ this.enclosingEnv_ = enclosingEnv;

  /** @const @private {!Object.<string,!r5js.runtime.Value>} */
  this.bindings_ = {};

  /** @private {!Object.<string, !r5js.Procedure>} */ this.closures_ = {};

  /** @private */ this.redefsOk_ = false;
};
r5js.IEnvironment.addImplementation(r5js.Environment);


/** @override */
r5js.Environment.prototype.seal = function() {
  this.sealed = true;
};


/**
 * @return {!r5js.Environment} This object, for chaining.
 */
r5js.Environment.prototype.allowRedefs = function() {
  this.redefsOk_ = true;
  return this;
};


/** @return {!r5js.Environment} A clone of this environment. */
r5js.Environment.prototype.clone = function() {

  if (this.enclosingEnv_) {
    throw new r5js.InternalInterpreterError(
        'clone should only be used during ' +
            'interpreter bootstrapping');
  }

  var cloned = new r5js.Environment(null /* enclosingEnv */);

  for (var name_ in this.bindings_) {
    var val = this.bindings_[name_];
    cloned.bindings_[name_] = val instanceof r5js.Macro ?
        val.clone(cloned) :
        val;
  }

  return cloned;
};


/** @override */
r5js.Environment.prototype.hasBinding = function(name) {
  return name in this.bindings_;
};


/** @override */
r5js.Environment.prototype.hasBindingRecursive = function(name) {
  return this.hasBinding(name) ||
      (!!this.enclosingEnv_ && this.enclosingEnv_.hasBindingRecursive(name));
};


/** @override */
r5js.Environment.prototype.get = function(name) {
  if (name in this.bindings_) {
    var binding = this.bindings_[name];
    if (r5js.IEnvironment.isImplementedBy(binding) &&
            binding.hasBindingRecursive(name)) {
      // Redirects for free ids in macro transcriptions
      return binding.get(name);
    } else if (r5js.PrimitiveProcedure.isImplementedBy(binding) ||
            binding instanceof r5js.Procedure) {
      /* We store primitive and non-primitive procedures unwrapped,
             but wrap them in a Datum if they are requested through get.
             (getProcedure, which is intended just for evaluating the operator
             on the trampoline, will return the unwrapped procedures.) */
      return new r5js.ast.Lambda(name,
          /** @type {!r5js.PrimitiveProcedure|!r5js.Procedure} */ (
          binding));
    } else if (binding === r5js.runtime.UNSPECIFIED_VALUE) {
      return binding;
    } else if (binding instanceof r5js.Datum) {
      return new r5js.Ref(binding);
    } else {
      return binding;
    }
  } else if (name in this.closures_) {
    /* I think this is only used for ProcCall.prototype.cpsify, where
         identifiers are used to keep track of things while the structure
         is changed. Semantic use of procedures should be gated by
         Environment.prototype.getProcedure, and since that doesn't check
         the closures map, there should be no danger of accidentally
         returning a closure. */
    return this.closures_[name];
  } else if (this.enclosingEnv_) {
    // If the current environment has no binding for the name, look one level up
    return this.enclosingEnv_.get(name);
  } else {
    throw new r5js.UnboundVariable(name + ' in env');
  }
};


/** @override */
r5js.Environment.prototype.getProcedure = function(name) {
  if (name in this.bindings_) {
    var binding = this.bindings_[name];
    if (r5js.IEnvironment.isImplementedBy(binding)) {
      return binding.getProcedure(name);
    } else if (r5js.PrimitiveProcedure.isImplementedBy(binding) ||
            binding instanceof r5js.Procedure ||
            binding instanceof r5js.Macro ||
            binding instanceof r5js.Continuation ||
            binding instanceof r5js.JsObjOrMethod) {
      return binding;
    } else {
      throw new r5js.EvalError('expected procedure, given ' + name);
    }
  } else if (this.enclosingEnv_) {
    return this.enclosingEnv_.getProcedure(name);
  } else {
    return null;
  }
};


/**
 * @param {!r5js.IEnvironment} other Environment to add closures from.
 * @return {!r5js.IEnvironment} This environment, for chaining.
 * @see {r5js.IEnvironment#addClosure}.
 */
r5js.Environment.prototype.addClosuresFrom = function(other) {
  /* todo bl: we have to clone the SchemeProcedures to prevent
     some kind of infinite loop. I'm not entirely clear about what loop, though,
     since SchemeProcedure.prototype.cloneWithEnv itself does not do a lot
     of copying. */
  for (var name in other.closures_) {
    this.addBinding(name, other.closures_[name].cloneWithEnv(this));
  }
  return this;
};


/** @override */
r5js.Environment.prototype.addClosure = function(name, proc) {
  if (this.sealed) {
    throw new r5js.InternalInterpreterError('tried to bind ' +
        name +
        ' in sealed environment');
  } else if (!(proc instanceof r5js.Procedure)) {
    throw new r5js.InternalInterpreterError('invariant incorrect');
  } else if (this.closures_[name]) {
    throw new r5js.InternalInterpreterError('invariant incorrect');
  } else {
    this.closures_[name] = proc;
  }
};


/**
 * @param {string} name
 * @return {boolean}
 * @private
 * @suppress {accessControls} for r5js.Datum.CPS_PREFIX_.
 */
r5js.Environment.prototype.bindingIsAcceptable_ = function(name) {
  return !(name in this.bindings_) ||
      this.redefsOk_ ||
      name.charAt(0) === r5js.Datum.CPS_PREFIX_;
};


/**
 * @override
 */
r5js.Environment.prototype.addBinding = function(name, val) {
  if (this.sealed) {
    throw new r5js.InternalInterpreterError(
        'tried to bind ' +
            name +
            ' in sealed environment ' +
            this);
  }

  if (!this.bindingIsAcceptable_(name)) {
    throw new r5js.InternalInterpreterError(
        'redefining ' +
        name +
                ' in same env, not allowed');
  }

  /* Macros require a backlink to the environment they were defined in
    to resolve literal identifiers.
    todo bl: is there a better place to put this? */
  if (val instanceof r5js.Macro) {
    val.setDefinitionEnv(this);
  }

  // Store primitive values directly.
  if (typeof val === 'number' ||
      typeof val === 'string' ||
      val === true ||
      val === false ||
      val === r5js.runtime.UNSPECIFIED_VALUE ||
      r5js.IEnvironment.isImplementedBy(val) ||
      r5js.InputPort.isImplementedBy(val) ||
      r5js.OutputPort.isImplementedBy(val) ||
      r5js.PrimitiveProcedure.isImplementedBy(val) ||
      val instanceof r5js.Procedure /* non-primitive procedure */ ||
      val instanceof r5js.Continuation /* call/cc, etc. */ ||
      val instanceof Array /* values and call-with-values */ ||
      val instanceof r5js.Macro /* macros */ ||
      val instanceof r5js.JsObjOrMethod /* JavaScript interop */) {
    this.bindings_[name] = val;
  } else if (val instanceof r5js.Datum) {
    // lots of stuff, including wrapped procedures
    /* r5js.Environment.prototype.get should honor requests to store
             both unwrapped procedures (= JavaScript functions and
             SchemeProcedure objects) and those things wrapped in a Datum.
             In the latter case, we should store the unwrapped thing.

             We can see the first pathway in the desugar functions
             for procedures: they explicitly call addBinding with
             a SchemeProcedure as the second argument. The second pathway
             happens on the trampoline, for example:

             (define foo +)

             r5js.Environment.protoype.get will return + wrapped in a Datum,
             then the trampoline will call
             r5js.Environment.prototype.addBinding with this wrapped procedure
             as the second argument. */
    this.bindings_[name] = val.unwrap();
  } else {
    throw new r5js.InternalInterpreterError('tried to store ' +
        name +
        ' = ' +
        val +
        ', which is not an acceptable value');
  }
};


/** @override */
r5js.Environment.prototype.mutate = function(name, newVal, isTopLevel) {
  var maybeBinding = this.bindings_[name];
  if (maybeBinding != null || isTopLevel) {
    if (r5js.IEnvironment.isImplementedBy(maybeBinding)) {
      maybeBinding.mutate(name, newVal, isTopLevel);
    } else {
      delete this.bindings_[name];
      this.addBinding(name, newVal);
    }
  } else if (this.enclosingEnv_) {
    this.enclosingEnv_.mutate(name, newVal, isTopLevel);
  } else throw new r5js.UnboundVariable(name);
};


/**
 * @param {!r5js.Environment} otherEnv Environment whose closures
 * this environment should use.
 * TODO bl: this method is only used once. Can I eliminate it?
 */
r5js.Environment.prototype.setClosuresFrom = function(otherEnv) {
  this.closures_ = otherEnv.closures_;
};
