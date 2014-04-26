goog.provide('r5js.ProcCall');

goog.require('r5js.ContinuableHelper');
goog.require('r5js.Datum');
goog.require('r5js.Environment');
goog.require('r5js.GeneralSyntaxError');
goog.require('r5js.IllegalEmptyApplication');
goog.require('r5js.InternalInterpreterError');
goog.require('r5js.Macro');
goog.require('r5js.ProcCallLike');
goog.require('r5js.Ref');
goog.require('r5js.SiblingBuffer');
goog.require('r5js.ast.CompoundDatum');
goog.require('r5js.ast.Identifier');
goog.require('r5js.ast.Lambda');
goog.require('r5js.ast.List');
goog.require('r5js.ast.Literal');
goog.require('r5js.ast.Macro');
goog.require('r5js.ast.Quote');
goog.require('r5js.ast.SimpleDatum');
goog.require('r5js.ast.String');
goog.require('r5js.parse.Terminals');
goog.require('r5js.runtime.UNSPECIFIED_VALUE');



/**
 * @param {!r5js.ast.Identifier} operatorName
 * @param {r5js.Datum} firstOperand
 * @param {string=} opt_lastResultName Optional name to use for the last result.
 *     If not given, a unique name will be created.
 * @implements {r5js.ProcCallLike}
 * @struct
 * @constructor
 */
r5js.ProcCall = function(operatorName, firstOperand, opt_lastResultName) {

  /** @const @private */ this.operatorName_ = operatorName;
  /** @const @protected */ this.firstOperand = firstOperand;
  /** @protected {r5js.IEnvironment} */ this.env = null;

  /** @private */
  this.resultName_ = opt_lastResultName ||
      ('@' /* TODO bl document */ + goog.getUid(this));

  /** @private {r5js.ProcCallLike} */ this.next_ = null;
};


/** @return {?} TODO bl. */
r5js.ProcCall.prototype.getFirstOperand = function() {
  return this.firstOperand;
};


/** @return {r5js.IEnvironment} */
r5js.ProcCall.prototype.getEnv = function() {
  return this.env;
};


/**
 * @param {!r5js.IEnvironment} env An environment to use.
 * @param {boolean=} opt_override True iff the ProcCall's own environment
 * should be overridden.
 */
r5js.ProcCall.prototype.setEnv = function(env, opt_override) {
  if (this.env && !opt_override)
    throw new r5js.InternalInterpreterError('invariant incorrect');
  this.env = env;
};


/** @override */
r5js.ProcCall.prototype.setStartingEnv = function(env) {
  this.setEnv(env, true /* opt_override */);
};


/**
 * If the ProcCall already has an environment, don't overwrite it.
 * Exception: if this is a continuation "escape call", we do overwrite it.
 * This exception was prompted by things like
 *
 * (call-with-current-continuation
 *   (lambda (exit)
 *     (for-each
 *       (lambda (x)
 *         (if (negative? x) (exit x)))
 *   '(54 0 37 -3 245 19)) #t))
 *
 * At the end of each invocation of (lambda (x) ...), the environment on
 * (exit x) should be updated to reflect the most recent binding of x.
 * Otherwise, the trampoline would see that -3 is negative, but the x in
 * (exit x) would still be bound to 54.
 *
 * This is quite ad-hoc and could contain bugs.
 *
 * @param {!r5js.IEnvironment} env An environment.
 */
r5js.ProcCall.prototype.maybeSetEnv = function(env) {
  if (!this.env) {
    this.env = env;
  }
};


/** TODO bl document */
r5js.ProcCall.prototype.clearEnv = function() {
  this.env = null;
};


/**
 * @return {!r5js.Datum}
 * @private
 */
r5js.ProcCall.prototype.reconstructDatum_ = function() {
  var op = new r5js.ast.Identifier(this.operatorName_.getPayload());
  if (this.firstOperand) {
    op.setNextSibling(this.firstOperand);
  }
  return new r5js.SiblingBuffer().appendSibling(op).toList(r5js.ast.List);
};


/**
 * @return {boolean} True iff the operands are in continuation-passing style.
 * @private
 */
r5js.ProcCall.prototype.operandsInContinuationPassingStyle_ = function() {
  for (var cur = this.firstOperand; cur; cur = cur.getNextSibling()) {
    if (cur instanceof r5js.Datum) {
      if (cur instanceof r5js.ast.List && !cur.getFirstChild()) {
        throw new r5js.IllegalEmptyApplication(this.operatorName_.getPayload());
      } else if (!(cur instanceof r5js.ast.Literal ||
          cur instanceof r5js.ast.Quote)) {
        return false;
      }
    }
  }
  return true;
};


/**
 * If the operator resolves as a primitive or non-primitive procedure,
 * check that the operands are simple. If they're not, rearrange the flow
 * of control to compute them first.
 *
 * Example: (+ (* 2 3) (/ 4 5)) will need to be turned into something like
 *
 * (* 2 3 [_0 (/ 4 5 [_1 (+ _0 _1 [...])])])
 *
 * (We do _not_ do this if the operator resolves as a macro. Macros
 * get their arguments as unevaluated datums.)
 *
 * @param {!r5js.TrampolineHelper} trampolineHelper
 * @param {function(!r5js.Datum):!r5js.Parser} parserProvider Function
 * that will return a new Parser for the given Datum when called.
 * @suppress {checkTypes} TODO bl
 * @private
 */
r5js.ProcCall.prototype.cpsify_ = function(trampolineHelper, parserProvider) {

  var newCallChain = new r5js.ContinuableHelper();
  var finalArgs = new r5js.SiblingBuffer();
  var maybeContinuable;

  for (var arg = this.firstOperand; arg; arg = arg.getNextSibling()) {
    arg.resetDesugars();
    if (arg instanceof r5js.ast.Quote) {
      finalArgs.appendSibling(arg.clone(null /* parent */));
    } else if (arg instanceof r5js.ast.Quasiquote) {
      maybeContinuable = arg.processQuasiquote(
          /** @type {!r5js.IEnvironment} */ (this.env),
          this.resultName_, parserProvider);
      finalArgs.appendSibling(
          new r5js.ast.Identifier(r5js.ProcCallLike.getLast(
          maybeContinuable).getResultName()));
      newCallChain.appendProcCallLike(maybeContinuable);
    } else if (arg instanceof r5js.ast.Lambda) {
      finalArgs.appendSibling(
          new r5js.ast.Identifier(/** @type {string} */ (arg.getName())));
    } else if (arg.isImproperList()) {
      throw new r5js.GeneralSyntaxError(arg);
    } else if ((maybeContinuable = arg.desugar(
        /** @type {!r5js.IEnvironment} */ (this.env))).evalAndAdvance) {
      /* todo bl is it an invariant violation to be a list
             and not to desugar to a Continuable? */
      finalArgs.appendSibling(
          new r5js.ast.Identifier(r5js.ProcCallLike.getLast(
              maybeContinuable).getResultName()));
      newCallChain.appendProcCallLike(maybeContinuable);
    } else {
      var clonedArg = arg.clone(null /* parent */);
      if (clonedArg instanceof r5js.ast.CompoundDatum) {
        clonedArg.clearFirstChild();
      }
      finalArgs.appendSibling(clonedArg);
    }
  }

  newCallChain.appendProcCallLike(
      new r5js.ProcCall(this.operatorName_, finalArgs.toSiblings()));

  var ans = newCallChain.toContinuable();
  ans.setStartingEnv(/** @type {!r5js.IEnvironment} */ (this.env));
  var lastContinuable = r5js.ProcCallLike.getLast(ans);
  if (this.next_) {
    lastContinuable.setNext(this.next_);
  }
  lastContinuable.setResultName(this.resultName_);
  trampolineHelper.setNextProcCallLike(ans);
};


/** @override */
r5js.ProcCall.prototype.evalAndAdvance = function(
    resultStruct, envBuffer, parserProvider) {

  /* If the procedure call has no attached environment, we use
     the environment left over from the previous action on the trampoline. */
  if (!this.env) {
    this.setEnv(/** @type {!r5js.IEnvironment} */ (envBuffer.getEnv()));
  }

  var proc = this.env.getProcedure(/** @type {string} */ (
      this.operatorName_.getPayload()));

  if (r5js.ProcedureLike.isImplementedBy(proc)) {
    if (proc.operandsMustBeInContinuationPassingStyle() &&
        !this.operandsInContinuationPassingStyle_()) {
      this.cpsify_(resultStruct, parserProvider);
    } else {
      proc.evalAndAdvance(this, this, resultStruct, parserProvider);
    }
  } else {
    throw new r5js.EvalError(
        'procedure application: expected procedure, given ' +
        this.operatorName_);
  }

  /* Save the environment we used in case the next action on the trampoline
     needs it (for example branches, which have no environment of their own). */
  envBuffer.setEnv(/** @type {!r5js.IEnvironment} */(this.env));

  // We shouldn't leave the environment pointer hanging around.
  this.clearEnv();
};


/** @override */
r5js.ProcCall.prototype.getNext = function() {
  return this.next_;
};


/** @override */
r5js.ProcCall.prototype.setNext = function(next) {
  this.next_ = next;
};


/** @override */
r5js.ProcCall.prototype.getResultName = function() {
  return this.resultName_;
};


/**
 * @override
 * @suppress {const|accessControls} TODO bl remove
 */
r5js.ProcCall.prototype.setResultName = function(resultName) {
  this.resultName_ = resultName;
};


/**
 * @param {!r5js.ProcCallLike} procCallLike
 * @param {!r5js.runtime.Value} val
 */
r5js.ProcCall.prototype.bindResult = function(procCallLike, val) {

  var name = procCallLike.getResultName();
  var nextProcCall = procCallLike.getNext();

  if (nextProcCall instanceof r5js.ProcCall) {
    var maybeEnv = nextProcCall.env;
    /* If the next procedure call already has an environment,
         bind the result there. Otherwise, bind it in the current
         environment; it will be carried forward by the EnvBuffer. */
    if (maybeEnv) {
      maybeEnv.addBinding(name, val);
    } else {
      this.env.addBinding(name, val);
    }
  }

/* If the next thing is not a procedure call, it will reuse this procedure
     call's environment, so just bind the result here. */
  else {
    this.env.addBinding(name, val);
  }
};


/**
 * @return {!Array.<!r5js.runtime.Value>}
 * TODO bl: this method is too long.
 */
r5js.ProcCall.prototype.evalArgs = function() {
  var maybeArray;
  if (maybeArray = this.evalArgsCallWithValues_()) {
    return maybeArray;
  }

  var args = [];

  for (var cur = this.firstOperand; cur; cur = cur.nextSibling_) {
    if (cur instanceof r5js.ast.Identifier) {
      var name = cur.getPayload();
      var toPush = this.env.get(name);
      /* Macros are not first-class citizens in Scheme; they cannot
             be passed as arguments. Internally, however, we do just that
             for convenience. The isLetOrLetrecSyntax flag discriminates
             between the programmer and the implementation. */
      if (toPush instanceof r5js.Macro &&
          !toPush.isLetOrLetrecSyntax()) {
        throw new r5js.MacroError(name, 'bad syntax');
      }
      args.push(toPush);
    } else if (cur instanceof r5js.ast.Quote) {
      args.push(cur.getFirstChild());
    } else if (cur instanceof r5js.ast.Lambda) {
      args.push(cur);
    } else if (cur instanceof r5js.ast.SimpleDatum) {
      args.push(cur.clone(null /* parent */));
    } else {
      throw new r5js.InternalInterpreterError('unexpected datum ' + cur);
    }
  }

  return args;
};


/**
 * Special logic for values and call-with-values. Example:
 *
 * (call-with-values (lambda () (values 1 2 3)) +)
 *
 * The "producer" procedure, (lambda () (values 1 2 3)), will desugar to
 * something like
 *
 * (values 1 2 3 [_0 ...])
 *
 * In this implementation, this will bind the JavaScript array [1, 2, 3] to _0.
 * Later on the trampoline, we reach (+ _0). We have to know that _0 refers
 * to an array of values, not a single value.
 *
 * @return {Array.<!r5js.runtime.Value>}
 * @private
 */
r5js.ProcCall.prototype.evalArgsCallWithValues_ = function() {
  if (this.firstOperand instanceof r5js.ast.Identifier &&
      !this.firstOperand.getNextSibling()) {
    var maybeArray = this.env.get(
        /** @type {string} */ (this.firstOperand.getPayload()));
    if (maybeArray instanceof Array) {
      return maybeArray;
    }
  }
  return null;
};


