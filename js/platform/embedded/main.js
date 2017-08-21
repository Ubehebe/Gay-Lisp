goog.module('r5js.platform.embedded.main');

const SchemeSources = goog.require('r5js.SchemeSources');
const SyncEvaluator = goog.require('r5js.sync.Evaluator');
const boot = goog.require('r5js.boot');

/** @type {SyncEvaluator} */ let evaluator = null;

/**
 * Minimal entry point for embedded environments.
 * @param {string} input
 * @return {string}
 */
function main(input) {
    if (!evaluator) {
        const sources = SchemeSources.get();
        evaluator = boot(sources.syntax, sources.procedures);
    }
    return evaluator.evaluate(input);
}

goog.exportSymbol('EVAL', main);