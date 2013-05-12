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


goog.provide('r5js.tmp.datum');


goog.require('r5js.Environment');
goog.require('r5js.InternalInterpreterError');

/**
 * @constructor
 */
function Datum() {
    /* No need to set this stuff until it's needed, just here for documentation
     this.firstChild = null;
     this.nextSibling = null;
     this.parent = null; // only for last children
     this.type = null;
     this.payload = null;
     this.nonterminals = [];
     this.desugars = null;
    this.nextDesugar = -1;
     this.name = null; // only for procedures
     */
}

// todo bl too many utility functions; reduce to minimal set
Datum.prototype.forEach = function(callback) {
    /* Quotations are like pseudo-leaves in the datum tree, so they should
     be opaque to this function. */
    if (!this.isQuote()) {
        callback(this);
        for (var cur = this.firstChild; cur; cur = cur.nextSibling)
                cur.forEach(callback);
    }
};

Datum.prototype.setImmutable = function() {
    this.immutable = true;
    return this;
};

Datum.prototype.setImmutableOnQuote = function () {
    if (this.firstChild) {
        switch (this.firstChild.type) {
            case '(':
            case '.(':
            case '#(':
                this.firstChild.setImmutable();
        }
    }
    return this;
};

Datum.prototype.isImmutable = function() {
    return this.immutable;
};

// This penetrates quotations because it's used in quasiquote evaluation.
Datum.prototype.replaceChildren = function(predicate, transform) {

    for (var cur = this.firstChild, prev; cur; prev = cur,cur = cur.nextSibling) {
        if (predicate(cur)) {
            var tmp = cur.nextSibling;
            cur.nextSibling = null;
            /* We have to assign to cur so prev will be set correctly
             in the next iteration. */
            if (cur = transform(cur)) {

                if (prev)
                    prev.nextSibling = cur;
                else
                    this.firstChild = cur;

                /* If cur suddenly has a sibling, it must have been inserted
                by the transform. That is, the transform wants to insert
                multiple siblings in place of the single node. (Use case: in

                `(1 ,@(list 2 3) 4)

                the members of the sublist (2 3), not the sublist itself,
                should be inserted into the main list.)

                In this case we should skip ahead to the last sibling inserted
                by the transform in order to avoid accidentally running the
                transform on those newly-inserted siblings, which would
                presumably not be wanted. */
                if (cur.nextSibling)
                    cur = cur.lastSibling();

                cur.nextSibling = tmp;
            }

            /* If transform returned null, that means the current node
            should be spliced out of the list. */
            else {
                prev.nextSibling = tmp;
                cur = prev;
            }
        } else {
            cur.replaceChildren(predicate, transform);
        }
    }
    return this;
};

function newEmptyList() {
    var ans = new Datum();
    ans.type = '(';
    return ans;
}

/**
 * @param {*} payload The payload.
 * @param {string=} type The type tag.
 * @return {!Datum}
 * TODO bl: narrow the type of the payload param.
 */
function newIdOrLiteral(payload, type) {
    // todo bl: we're sometimes creating these with undefined payloads! Investigate.
    var ans = new Datum();
    ans.type = type || 'identifier'; // convenience
    ans.payload = payload;
    return ans;
}

Datum.prototype.isEmptyList = function() {
    return this.isList() && !this.firstChild;
};

Datum.prototype.sameTypeAs = function(other) {
    return this.type === other.type;
};

Datum.prototype.clone = function(parent) {

    /* Invariant: although cyclical Datum structures can be created by
     the programmer (through set-cdr!, etc.), they will never be cloned.
     They are created by mutation, i.e. once a value is already bound in an
     Environment, and once that happens, we never clone it again. */

    var ans = new Datum();

    ans.type = this.type;
    ans.payload = this.payload;

    if (this.parent)
        ans.parent = this.parent;
    if (this.firstChild) {
        var buf = new SiblingBuffer();
        for (var child = this.firstChild; child; child = child.nextSibling) {
            buf.appendSibling(child.clone(ans));
        }
        ans.firstChild = buf.toSiblings();
    }
    // We only need the parent pointer on the last sibling.
    if (!this.nextSibling)
        ans.parent = parent;
    if (this.name)
        ans.name = this.name;
    if (this.immutable)
        ans.immutable = true;

    return ans;
};

Datum.prototype.unescapeStringLiteral = function() {
    this.payload = this.payload.replace(/\\(["\\])/g, "$1");
    return this;
};

Datum.prototype.setParse = function(type) {
    if (!this.nonterminals)
        this.nonterminals = [];
    this.nonterminals.push(type);
};

Datum.prototype.setDesugar = function(desugarFunc) {
    if (!this.desugars) {
        this.desugars = [];
        this.nextDesugar = -1;
    }
    this.desugars.push(desugarFunc);
    ++this.nextDesugar;
};

Datum.prototype.unsetParse = function() {
    this.nonterminals = null;
    for (var child = this.firstChild; child; child = child.nextSibling)
        child.unsetParse();
};

Datum.prototype.peekParse = function() {
    if (this.nonterminals) {
        var len = this.nonterminals.length;
        if (len > 0)
            return this.nonterminals[len - 1];
    }
    return null;
};

Datum.prototype.hasParse = function(nonterminal) {
    if (this.nonterminals) {
        var len = this.nonterminals.length;
        for (var i = 0; i < len; ++i)
            if (this.nonterminals[i] === nonterminal)
                return true;
    }
    return false;
};

Datum.prototype.at = function(type) {
    for (var cur = this.firstChild; cur; cur = cur.nextSibling) {
        /* The first clause is a convenience for things like node.at('(');
         the second is a convenience for things like node.at('expression') */
        if (cur.type === type || cur.peekParse() === type)
            return cur;
    }
    return null;
};

Datum.prototype.appendSibling = function(sibling) {
    if (!this.nextSibling) {
        if (this.parent) {
            // Propagate the parent field
            sibling.parent = this.parent;
            // Only the last sibling needs a link back to the parent
            this.parent = null;
        }
        this.nextSibling = sibling;
    }
    else
        this.nextSibling.appendSibling(sibling);
};

/* If we used this to append n children in a row, it would take time O(n^2).
 But we don't actually use it like that. When building a list like (X*), we build
 up the list of X's in linear time, then call appendChild once to append the
 whole list as a child of the list root. We do incur some overhead when building
 a list like (X+ . X): in this case, the X+ list is appended in one go, and then
 we have to re-traverse that list once to append the final X. I expect this to be
 rare enough not to matter in practice, but if necessary we could keep track of
 the root's final child. */
Datum.prototype.appendChild = function(child) {
    if (!this.firstChild)
        this.firstChild = child;
    else this.firstChild.appendSibling(child);
};

// todo bl deprecate in favor of prependSiblings
Datum.prototype.prependChild = function(child) {
    var oldFirstChild = this.firstChild;
    this.firstChild = child;
    child.nextSibling = oldFirstChild;
};

/* Map isn't the best word, since the function returns an array but the children
 are represented as a linked list. */
Datum.prototype.mapChildren = function(f) {
    var ans = [];
    for (var cur = this.firstChild; cur; cur = cur.nextSibling)
        ans.push(f(cur));
    return ans;
};

// Convenience functions
Datum.prototype.isImproperList = function() {
    return this.type === '.(';
};

Datum.prototype.resetDesugars = function() {
    if (this.nextDesugar === -1)
        this.nextDesugar += this.desugars.length;
    for (var cur = this.firstChild; cur; cur = cur.nextSibling)
        cur.resetDesugars();
};

Datum.prototype.desugar = function(env, forceContinuationWrapper) {
    var desugarFn = this.desugars
        && this.nextDesugar >= 0
        && this.desugars[this.nextDesugar--];
    var ans;
    if (desugarFn)
        ans = desugarFn(this, env);
    else if (this.firstChild && this.firstChild.payload === 'begin') {
        ans = this.firstChild.nextSibling ? this.firstChild.nextSibling.sequence(env) : null;
    }
    else
        ans = this;

    if (forceContinuationWrapper && !(ans instanceof Continuable))
        ans = newIdShim(ans, newCpsName());
    return ans;
};

function newProcedureDatum(name, procedure) {
    var ans = new Datum();
    ans.type = 'lambda';
    ans.payload = procedure;
    ans.name = name;
    return ans;
}

function newInputPortDatum(mustImplementPort) {
    var ans = new Datum();
    ans.type = 'input-port';
    ans.payload = portImplCheck(mustImplementPort);
    return ans;
}

function newOutputPortDatum(mustImplementPort) {
    var ans = new Datum();
    ans.type = 'output-port';
    ans.payload = portImplCheck(mustImplementPort);
    return ans;
}

function newDatumRef(deref) {
    var ans = new Datum();
    ans.type = 'ref';
    ans.payload = deref;
    return ans;
}

Datum.prototype.maybeDeref = function () {
    return this.type === 'ref'
        ? this.payload
        : this;
};

function newMacroDatum(macro) {
    var ans = new Datum();
    ans.type = 'macro';
    ans.payload = macro;
    return ans;
}

function newEnvironmentSpecifier(version) {
    return newIdOrLiteral(new r5js.Environment('', version), 'environment-specifier');
}

Datum.prototype.getMacro = function() {
    if (this.payload instanceof SchemeMacro)
        return this.payload.setIsLetOrLetrecSyntax();
    else
        throw new r5js.InternalInterpreterError('invariant incorrect');
};

function newVectorDatum(array) {
    var ans = new Datum();
    ans.type = '#(';
    ans.payload = array;
    return ans;
}

Datum.prototype.isProcedure = function() {
  return this.type === 'lambda';
};

Datum.prototype.isPort = function() {
    return this.isInputPort() || this.isOutputPort();
};

Datum.prototype.isInputPort = function() {
    return this.type === 'input-port';
};

Datum.prototype.isOutputPort = function() {
    return this.type === 'output-port';
};

Datum.prototype.isMacro = function() {
    return this.type === 'macro';
};

Datum.prototype.isEnvironmentSpecifier = function() {
    return this.type === 'environment-specifier';
};

Datum.prototype.sequence = function(env) {
    var first, tmp, curEnd;
    for (var cur = this; cur; cur = cur.nextSibling) {
        // todo bl do we need this check anymore?
        if (tmp = cur.desugar(env)) {

            /* Nodes that have no desugar functions (for example, variables
             and literals) desugar as themselves. Sometimes this is OK
             (for example in Datum.sequenceOperands), but here we need to be
             able to connect the Continuable objects correctly, so we
             wrap them. */
            if (!(tmp instanceof Continuable))
                tmp = newIdShim(tmp, newCpsName());

            if (!first)
                first = tmp;
            else if (curEnd) {
                curEnd.nextContinuable = tmp;
            }

            curEnd = tmp.getLastContinuable().continuation;
        }
    }

    return first; // can be undefined
};

// todo bl once we have hidden these types behind functions, we can
// switch their representations to ints instead of strings

/**
 * @param {*} result A result
 * @param {*=} type An optional type.
 * TODO bl: narrow the types of the parameters.
 */
function maybeWrapResult(result, type) {

    if (result === null
        || result instanceof Datum
        || result instanceof Continuation
        || result instanceof SchemeMacro
        || result instanceof JsObjOrMethod /* JS interop (experimental) */)
        return result; // no-op, strictly for convenience

    var ans = new Datum();
    ans.payload = result;
    if (type)
        ans.type = type;
    // If no type was supplied, we can deduce it in most (not all) cases
    else {
        var inferredType = typeof result;
        switch (inferredType) {
            case 'boolean':
            case 'number':
                ans.type = inferredType;
                break;
            case 'string':
                ans.type = 'identifier';
                break;
            case 'object':
                if (result instanceof SchemeProcedure) {
                    ans.type = 'lambda';
                    break;
                }
            default:
                throw new r5js.InternalInterpreterError('cannot deduce type from value '
                    + result + ': noninjective mapping from values to types');
        }
    }
    return ans;
}

Datum.prototype.isList = function() {
    return this.type === '(';
};

Datum.prototype.isVector = function() {
    return this.type === '#(';
};

Datum.prototype.isArrayBacked = function() {
    return this.payload;
};

/* Vector literals are constructed by the reader as linked lists
 with no random access, while vectors created programmatically
 via make-vector can just use JavaScript arrays. Instead of building
 logic into the reader to convert its inefficient vectors to array-backed
 ones, we check in every primitive vector procedure if the vector
 is array-backed, and mutate it in place if it isn't. There may
 be bugs involving the lost child/sibling pointers.*/
Datum.prototype.convertVectorToArrayBacked = function () {
    this.payload = [];
    for (var cur = this.firstChild; cur; cur = cur.nextSibling)
        this.payload.push(cur);
    this.firstChild = null;
    return this;
};

Datum.prototype.isBoolean = function() {
    return this.type === 'boolean';
};

Datum.prototype.isIdentifier = function() {
    return this.type === 'identifier';
};

Datum.prototype.isCharacter = function() {
    return this.type === 'character';
};

Datum.prototype.isNumber = function() {
    return this.type === 'number';
};

Datum.prototype.isString = function() {
    return this.type === 'string';
};

Datum.prototype.isLiteral = function() {
    switch (this.type) {
        case 'boolean':
        case 'identifier':
        case 'character':
        case 'number':
        case 'string':
        case 'lambda':
        case "'":
            return true;
        default:
        return false;
    }
};

Datum.prototype.isQuote = function() {
    return this.type === "'"
        || (this.isList()
        && this.firstChild
        && this.firstChild.payload === 'quote'); // todo bl should datums know about this?
};

Datum.prototype.isQuasiquote = function() {
    return this.type === '`';
};

Datum.prototype.isUndefined = function() {
  return this.type === null;
};

/* In most situations, we want to detect both unquote (,) and
unquote-splicing (,@) */
Datum.prototype.isUnquote = function() {
    return this.type === ',' || this.type === ',@';
};

Datum.prototype.isUnquoteSplicing = function() {
    return this.type === ',@';
};

/* todo bl this is intended to have the exact semantics of the library
 procedure equal?, but I'm not sure that it does. (I put it in JavaScript
 for fast access from the macro subsystem, which needs it in one case.)  */
Datum.prototype.isEqual = function(other) {
    if (other instanceof Datum
        && this.type === other.type
        && this.payload === other.payload) {
        var thisChild, otherChild;
        for (thisChild = this.firstChild,otherChild = other.firstChild;
             thisChild && otherChild;
             thisChild = thisChild.nextSibling,otherChild = otherChild.nextSibling)
            if (!thisChild.isEqual(otherChild))
                return false;

        return !(thisChild || otherChild);

    } else return false;
};

Datum.prototype.quote = function() {
    var ans = new Datum();
    ans.type = "'";
    ans.firstChild = this;
    return ans;
};

Datum.prototype.unwrap = function() {
    /* Datums representing identifiers, strings, and characters
     all have payloads of type string. If they all unwrapped as JavaScript
     strings, it would be impossible to re-wrap them correctly
     (noninjective mapping). We choose to store identifiers unwrapped
     because they're expected to be more common than the other two.

     Environment specifiers cannot be unwrapped to their Environment
     payloads because Environment values in Environments already have
     a meaning, namely, a redirect to look up the name in some other
     Environment.

     Finally, the vector stuff may need to be overhauled. */
    return (this.payload !== undefined
        && !this.isVector() // watch out for 0's and falses
        && !this.isEnvironmentSpecifier()
        && !this.isString()
        && !this.isCharacter()
        && !this.isUndefined()
        && !this.isPort())
        ? this.payload
        : this;
};

Datum.prototype.lastSibling = function() {
    return this.nextSibling ? this.nextSibling.lastSibling() : this;
};

/*
    (x . ()) is equivalent to (x). It is useful to perform this normalization
    prior to evaluation time to simplify the Scheme procedure "list?".
    With normalization, we can merely say, (list? x) iff x.isList().
    Without normalization, we would also have to check if x is an
    improper list, and if so, whether its last element was an empty list.

    This is also an opportune time to do these:

    (quote x) -> 'x
    (quasiquote x) -> `x
    (unquote x) -> ,x
    (unquote-splicing x) -> ,@x

    so we don't have to worry about these synonyms during evaluation proper. */
Datum.prototype.normalizeInput = function() {

    if (this.firstChild) {
        switch (this.firstChild.payload) {
            case 'quote':
                this.type = "'";
                this.firstChild = this.firstChild.nextSibling;
                break;
            case 'quasiquote':
                this.type = "`";
                this.firstChild = this.firstChild.nextSibling;
                break;
            case 'unquote':
                this.type = ',';
                this.firstChild = this.firstChild.nextSibling;
                break;
            case 'unquote-splicing':
                this.type = ',@';
                this.firstChild = this.firstChild.nextSibling;
                break;
        }
    }

    var isImproperList = this.isImproperList();

    for (var child = this.firstChild; child; child = child.nextSibling) {
        child.normalizeInput();
        if (isImproperList && child.nextSibling && !child.nextSibling.nextSibling) {
            var maybeEmptyList = child.nextSibling;
            if (maybeEmptyList.isList() && !maybeEmptyList.firstChild) {
                child.parent = child.nextSibling.parent;
                child.nextSibling = null;
                this.type = '(';
            }
        }
    }

    if (this.isString())
        this.unescapeStringLiteral();

    return this.setImmutableOnQuote();
};

/* Example:
    `(a `(b ,(+ x y) ,(foo ,(+ z w) d) e) f)

    should be decorated as

    `1(a `2(b ,2(+ x y) ,2(foo ,1(+ z w) d) e) f) */
Datum.prototype.decorateQuasiquote = function(qqLevel) {

    if (this.isQuasiquote()) {
        this.qqLevel = qqLevel;
    } else if (this.isUnquote()) {
        this.qqLevel = qqLevel+1;
    }

    for (var cur = this.firstChild; cur; cur = cur.nextSibling) {
        if (cur.isQuasiquote()) {
            cur.decorateQuasiquote(qqLevel+1);
        } else if (cur.isUnquote()) {
            cur.decorateQuasiquote(qqLevel-1);
        } else {
            cur.decorateQuasiquote(qqLevel);
        }
    }

    return this;
};

/* Notice that our representation of lists is not recursive: the "second element"
 of (x y z) is y, not (y z). So we provide this function as an aid whenever
 we want that recursive property. Mainly, this is for cdr: we allocate a new
 head-of-list object and point it to the second element of the list in question.

 Unfortunately, this approach breaks referential transparency: (cdr x) does not
 point to the same region of memory as x.firstChild.nextSibling. So we have to
 build in special logic to the primitive equivalence predicates, and especially
 into the primitive mutation procedures (set-car! and set-cdr!). That is what
 the CdrHelper class does.

 Conceptually, it would not be difficult to switch to an internal car/cdr
 representation, and the performance would be similar. But practically,
 it would involve a lot of refactoring, because the pointers are manipulated
 directly (without function calls) all over the place. So it's a "nice to have". */
Datum.prototype.siblingsToList = function(dotted) {
    var ans = new Datum();
    ans.type = dotted ? '.(' : '(';
    ans.firstChild = this;
    return ans;
};

Datum.prototype.setCdrHelper = function(cdrHelper) {
    this.cdrHelper = cdrHelper;
    return this;
};

Datum.prototype.getCdrHelper = function() {
    return this.cdrHelper;
};

function newCpsName() {
    return cpsPrefix + (uniqueNodeCounter++);
}

function newAnonymousLambdaName() {
    return 'proc' + (uniqueNodeCounter++);
}

// Not a valid identifier prefix so we can easily tell these apart
var cpsPrefix = '@';

// Example: `(1 ,(+ 2 3)) should desugar as (+ 2 3 [_0 (id (1 _0) [_2 ...])])
Datum.prototype.processQuasiquote = function(env, cpsName) {

    var newCalls = new ContinuableHelper();

    var qqLevel = this.qqLevel;

    this.replaceChildren(
        function(node) {
            return node.isUnquote() && (node.qqLevel === qqLevel);
        },
        function(node) {
            var asContinuable = new Parser(node.firstChild).parse('expression').desugar(env, true);
            var continuation = asContinuable.getLastContinuable().continuation;
            /* Throw out the last result name and replace it with another
             identifier (also illegal in Scheme) that will let us know if it's
             unquotation or unquotation with splicing. */
            continuation.lastResultName = node.type + (uniqueNodeCounter++);
            newCalls.appendContinuable(asContinuable);
            return newIdOrLiteral(continuation.lastResultName);
        });

        this.type = "'";

    newCalls.appendContinuable(newIdShim(this, cpsName));
    var ans = newCalls.toContinuable();
    return ans && ans.setStartingEnv(env);
};

Datum.prototype.shouldUnquote = function() {
    return this.isIdentifier() && this.payload.charAt(0) === ',';
};

/* This is a subcase of shouldUnquote, because unquotes
and unquote-splicings have pretty much the same logic. */
Datum.prototype.shouldUnquoteSplice = function() {
    return this.isIdentifier() && this.payload.charAt(1) === '@';
};

/* Munges definitions to get them in a form suitable for let-type
bindings. Example:

(define (foo x y z) ...) => (foo (lambda (x y z) ...))
*/
Datum.prototype.extractDefinition = function() {
    var variable = this.at('variable');
    var list = newEmptyList();
    if (variable) {
        list.prependChild(this.at('expression'));
    } else {
        var formalsList = this.firstChild.nextSibling;
        variable = formalsList.firstChild;
        var bodyStart = formalsList.nextSibling;
        var lambda = newEmptyList();
        lambda.firstChild = bodyStart;
        var newFormalsList = formalsList;
        newFormalsList.firstChild = newFormalsList.firstChild.nextSibling;
        if (newFormalsList.isImproperList() && !newFormalsList.firstChild.nextSibling)
            lambda.prependChild(newIdOrLiteral(newFormalsList.firstChild.payload));
        else
            lambda.prependChild(newFormalsList);
        lambda.prependChild(newIdOrLiteral('lambda'));
        list.prependChild(lambda);
    }
    list.prependChild(variable);
    return list;
};

Datum.prototype.closestAncestorSibling = function() {
    if (this.nextSibling)
        return this.nextSibling;
    else if (!this.parent)
        return null;
    else
        return this.parent.closestAncestorSibling();
};

/* R5RS 4.3.1: "Let-syntax and letrec-syntax are analogous to let and letrec,
 but they bind syntactic keywords to macro transformers instead of binding
 variables to locations that contain values."

 In this implementation, a macro is just another kind of object that can
 be stored in an environment, so we reuse the existing let machinery.
 For example:

 (let-syntax ((foo (syntax-rules () ((foo) 'hi)))) ...)

 desugars as

 (let ((foo [SchemeMacro object])) ...)

 We just need to be sure that the SchemeMacro object inserted directly
 into the parse tree plays well when the tree is transcribed and reparsed.
 See comments in TemplateBindings.prototype.getTemplateBinding(). */
Datum.prototype.desugarMacroBlock = function(env, operatorName) {

    var letBindings = new SiblingBuffer();

    for (var spec = this.at('(').firstChild; spec; spec = spec.nextSibling) {
        var kw = spec.at('keyword').clone();
        var macro = spec.at('transformer-spec').desugar(env);
        var buf = new SiblingBuffer();
        /* We have to wrap the SchemeMacro object in a Datum to get it into
            the parse tree. */
        buf.appendSibling(kw);
        buf.appendSibling(newMacroDatum(macro));
        letBindings.appendSibling(buf.toList());
    }

    var _let = new SiblingBuffer();
    _let.appendSibling(letBindings.toList());
    _let.appendSibling(this.at('(').nextSibling);

    return newProcCall(newIdOrLiteral(operatorName), _let.toSiblings(), new Continuation(newCpsName()));
};

// See comments at the top of Parser.
function isParserSensitiveId(name) {
    switch (name) {
        case 'begin':
        case 'define':
        case 'define-syntax':
        case 'if':
        case 'lambda':
        case 'let-syntax':
        case 'letrec-syntax':
        case 'quasiquote':
        case 'quote':
        case 'set!':
        case 'unquote':
        case 'unquote-splicing':
            return true;
        default:
            return false;
    }
}

Datum.prototype.fixParserSensitiveIdsLambda = function(helper) {
    var formalRoot = this.at('formals');

    var newHelper = new RenameHelper(helper);
    var cur;

    // (lambda (x y) ...) or (lambda (x . y) ...)
    if (formalRoot.firstChild) {
        for (cur = formalRoot.firstChild; cur; cur = cur.nextSibling)
            if (isParserSensitiveId(cur.payload))
                cur.payload = newHelper.addRenameBinding(cur.payload);
    }

    // (lambda x ...)
    else if (cur && isParserSensitiveId(formalRoot.payload))
        cur.payload = newHelper.addRenameBinding(formalRoot.payload);

    formalRoot.nextSibling.fixParserSensitiveIds(newHelper);
};

Datum.prototype.fixParserSensitiveIdsDef = function(helper) {
    var maybeVar = this.at('variable');

    if (maybeVar) {
        if (isParserSensitiveId(maybeVar.payload))
            maybeVar.payload = helper.addRenameBinding(maybeVar.payload);
    } else {
        var vars = this.firstChild.nextSibling;
        var name = vars.firstChild;
        var newHelper = new RenameHelper(helper);
        for (var cur = name.nextSibling; cur; cur = cur.nextSibling)
            if (isParserSensitiveId(cur.payload))
                cur.payload = newHelper.addRenameBinding(cur.payload);
        vars.nextSibling.fixParserSensitiveIds(newHelper);
        if (isParserSensitiveId(name.payload))
            name.payload = helper.addRenameBinding(name.payload);
    }
};

Datum.prototype.fixParserSensitiveIds = function(helper) {

    if (this.hasParse('lambda-expression')) {
        this.fixParserSensitiveIdsLambda(helper);
    } else if (this.hasParse('definition')) {
        this.fixParserSensitiveIdsDef(helper);
    } else if (isParserSensitiveId(this.payload)) {
        this.payload = helper.getRenameBinding(this.payload) || this.payload;
    } else if (this.isQuote()) {
        ; // no-op
    } else {
        for (var cur = this.firstChild; cur; cur = cur.nextSibling)
            cur.fixParserSensitiveIds(helper);
    }

    if (this.nextSibling)
        this.nextSibling.fixParserSensitiveIds(helper);
};

