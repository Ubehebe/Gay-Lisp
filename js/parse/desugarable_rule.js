goog.module('r5js.parse.bnf.DesugarableRule');

const {Rule} = require('/js/parse/shim_collect_es6_sources.es6/node_modules/__main__/js/parse/rule');

/**
 * A desugarable rule is a rule that has a {@link #desugar} method.
 * This method allows the parser to specify post-parsing actions ("desugaring")
 * on the successfully parsed AST. The generic type of the desugarable rule
 * is the type of the datum passed to the desugar function.
 * @template T
 */
class DesugarableRule extends Rule {

    constructor() {
        super();
    }

    /**
     * @param {function(T, !IEnvironment): ?} desugarFn TODO: narrow return type
     * @return {!DesugarableRule<T>} This rule, for chaining.
     */
    desugar(desugarFn) {}
}

exports = DesugarableRule;
