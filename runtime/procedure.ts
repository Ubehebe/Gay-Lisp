import {ProcCallLike, ProcCallResult} from "../ast/proc_call_like";
import {ObjectValue, Value} from "../base/value";
import {Environment} from "./environment";

export class /* TODO interface */ Procedure implements ObjectValue {
  evaluate(args: Value[], procCall: ProcCallLike, resultStruct: ProcCallResult, env: Environment) {}
}
