goog.module('r5js.platform.node.repl');

const CallbackBackedPort = goog.require('r5js.CallbackBackedPort');
const curPlatform = goog.require('r5js.curPlatform');
const InputPort = goog.require('r5js.InputPort');
const Promise = goog.require('goog.Promise');
const Node = goog.require('r5js.platform.Node');
const Repl = goog.require('r5js.Repl');
const replutil = goog.require('r5js.replutil');
const Terminal = goog.require('r5js.platform.node.Terminal');

/** The main REPL method. */
function repl() {
    const platform = /** @type {!Node} */ (curPlatform());
    /** @type {Terminal} */ let terminal = null;
    const stdin = InputPort.NULL;
    const stdout = new CallbackBackedPort(output => terminal.print(output));
    platform.newEvaluator(stdin, stdout).then(evaluator => {
        terminal = platform.getTerminal();
        new Repl(terminal, evaluator, isLineComplete).start();
    });
}

function isLineComplete(line) {
    return Promise.resolve(replutil.isLineComplete(line));
}

goog.exportSymbol('r5js.repl.main', repl);
// nodejs hack. See comment in goog.promise.testSuiteAdapter.
goog.exportSymbol('setTimeout', setTimeout);
