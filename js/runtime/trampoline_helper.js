goog.module('r5js.TrampolineHelper');

const {InputPort} = require('/js/io/io_collect_es6_sources.es6/node_modules/__main__/js/io/input_port');
const {OutputPort} = require('/js/io/io_collect_es6_sources.es6/node_modules/__main__/js/io/output_port');
const {ProcCallLike, ProcCallResult, UNSPECIFIED_VALUE} = require('/js/runtime/shim_collect_es6_sources.es6/node_modules/__main__/js/ast/datum');

class TrampolineHelper extends ProcCallResult {
    /**
     * @param {!InputPort} inputPort
     * @param {!OutputPort} outputPort
     */
    constructor(inputPort, outputPort) {
        super();
        /** @const @private */ this.inputPort_ = inputPort;
        /** @const @private */ this.outputPort_ = outputPort;
        /** @private {?ProcCallLike} */ this.beforeThunk_ = null;
        /** @private {?ProcCallLike} */ this.nextContinuable_ = null;
        /** @private {!Value} */ this.value_ = UNSPECIFIED_VALUE;
    }

    /** Clears the object's state. TODO bl: not {@link beforeThunk}? */
    clear() {
        this.nextContinuable_ = null;
    }

    /** @return {?ProcCallLike} */
    getBeforeThunk() {
        return this.beforeThunk_;
    }

    /** @param {!ProcCallLike} beforeThunk */
    setBeforeThunk(beforeThunk) {
        this.beforeThunk_ = beforeThunk;
    }

    /** @override */
    getNextProcCallLike() {
        return this.nextContinuable_;
    }

    /** @override */
    setNext(procCallLike) {
        this.nextContinuable_ = procCallLike;
    }

    /** @return {!Value} */
    getValue() {
        return this.value_;
    }

    /** @override */
    setValue(value) {
        this.value_ = value;
    }

    /** @return {!InputPort} */
    getInputPort() {
        return this.inputPort_;
    }

    /** @return {!OutputPort} */
    getOutputPort() {
        return this.outputPort_;
    }
}

exports = TrampolineHelper;