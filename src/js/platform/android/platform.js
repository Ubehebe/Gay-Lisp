goog.provide('r5js.curPlatform');


goog.require('goog.Promise');
goog.require('r5js.Platform');
goog.require('r5js.SchemeSources');
goog.require('r5js.boot');
goog.require('r5js.platform.android.Evaluator');
goog.require('r5js.test.SchemeSources');



/**
 * @implements {r5js.Platform}
 * @struct
 * @constructor
 * @private
 */
r5js.platform.Android_ = function() {};


/** @override */
r5js.platform.Android_.prototype.getSources = function() {
  return goog.Promise.resolve(new r5js.SchemeSources(
      AndroidSchemePlatform.getR5RSSyntax(),
      AndroidSchemePlatform.getR5RSProcedures()));
};


/** @override */
r5js.platform.Android_.prototype.getTestSources = function() {
  return goog.Promise.resolve(new r5js.test.SchemeSources(
      AndroidSchemePlatform.getTestFramework(),
      AndroidSchemePlatform.getTestFrameworkTests(),
      AndroidSchemePlatform.getR5RSTests(),
      AndroidSchemePlatform.getNegativeTests(),
      AndroidSchemePlatform.getOtherTests()));
};


/** @override */
r5js.platform.Android_.prototype.exit = function(statusCode) {
  AndroidSchemePlatform.exit(statusCode);
};


/**
 * @param {!r5js.InputPort=} opt_inputPort
 * @param {!r5js.OutputPort=} opt_outputPort
 * @return {!goog.Promise<!r5js.Evaluator>}
 * @override TODO bl why is it necessary to repeat the doc?
 */
r5js.platform.Android_.prototype.newEvaluator =
    function(opt_inputPort, opt_outputPort) {
  return this.getSources().then(function(sources) {
    return r5js.boot(
        sources.syntax,
        sources.procedures,
        this,
        opt_inputPort,
        opt_outputPort);
  }, undefined /* opt_onRejected */, this).then(function(syncEvaluator) {
    return new r5js.platform.android.Evaluator(syncEvaluator);
  });
};


/** @return {!r5js.Platform} */
r5js.curPlatform = function() {
  return new r5js.platform.Android_();
};
