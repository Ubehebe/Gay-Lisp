goog.module('r5js.test.SchemeTest');
goog.setTestOnly('r5js.test.SchemeTest');

const CallbackBackedPort = goog.require('r5js.CallbackBackedPort');
const InputPort = goog.require('r5js.InputPort');
const LogLevel = goog.require('tdd.LogLevel');
const LogRecord = goog.require('tdd.LogRecord');
const SchemeSources = goog.require('r5js.test.SchemeSources');
const curPlatform = goog.require('r5js.curPlatform');
const log = goog.require('goog.log');
const testSuite = goog.require('goog.testing.testSuite');
const {stringToResultStruct, TestFramework} = goog.require('r5js.test.TestFramework');
goog.require('goog.testing.jsunit');

const logger = log.getLogger('r5js.test.SchemeTest!');
const sources = SchemeSources.get();
const evaluator = curPlatform().newEvaluator(InputPort.NULL, new CallbackBackedPort(handleWriteFromScheme));

/**
 * Runs the unit tests written in Scheme (//scm/r5rs-tests.scm, etc.).
 * 
 * The Scheme unit tests do not correctly propagate their counts (number of tests
 * run/failed/succeeded) to jsunit. However, they do correctly propagate whether they succeeded
 * or failed, and jsunit propagates this to bazel, so they are an effective pre-commit hook.
 * 
 * TODO: write a Skylark scheme_test macro or rule that hides all the JS implementation details.
 * It could just invoke node and have the Scheme tests write a proto or JSON.
 * But we need better node support before doing that. 
 */
testSuite({
  testFramework() {
    return new TestFramework(sources).execute(logger).then(result => {
      assertNotNull(result); // TODO propagate count to jsunit
    });
  },

  testR5RSTests() {
    return evaluator.evaluate(sources.testFramework + sources.r5RSTests).then(result => {
      assertNotNull(result); // TODO propagate count to jsunit
    });
  },

  testNegativeTests() {
    return evaluator.evaluate(sources.testFramework + sources.negativeTests).then(result => {
      assertNotNull(result); // TODO propagate count to jsunit
    });
  },

  testOtherTests() {
    return evaluator.evaluate(sources.testFramework + sources.otherTests).then(result => {
      assertNotNull(result); // TODO propagate count to jsunit
    });
  }
});

function handleWriteFromScheme(str) {
  let result = stringToResultStruct(str);
  if (result) {
    logger.logRecord(
      new LogRecord(
        result.getNumFailed()
          ? LogLevel.FAILURE
          : LogLevel.SUCCESS,
          'r5js.test.SchemeTest',
          result.getName()));
  } else if (result = stringToFailureMessage(str)) {
    logger.logRecord(new LogRecord(
      LogLevel.FAILURE,
      'r5js.test.SchemeTest',
      result));
  }
}

/**
 * Parses a Scheme test framework output like this:
 * (fail foo-tests (input (+ 1 1)) (want 3) (got 2))
 * into a string, returning null if the parse failed.
 * @param {string} str
 * @return {?string}
 * @private
 */
function stringToFailureMessage(str) {
  const match = /\(fail .+ \(input (.*)\) \(want (.*)\) \(got (.*)\)\)/.exec(str);
  if (!match) {
    return null;
  }
  const input = match[1];
  const want = match[2];
  const got = match[3];
  return 'input ' + input + ': want ' + want + ', got ' + got;
}