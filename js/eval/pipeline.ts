import {Environment} from "../runtime/environment";
import {Error} from "../error";
import {TokenStream} from "../scan/token_stream";
import {Datum, ProcCallLike, UNSPECIFIED_VALUE, VACUOUS_PROGRAM} from "../ast/datum";
import {Reader} from "../eval/reader"; // TODO should be read/reader
import {ParserImpl} from "../parse/parser_impl";
import {Nonterminal, PROGRAM} from "../parse/nonterminals";
import {InputPort} from "../io/input_port";
import {OutputPort} from "../io/output_port";
import {trampoline} from "../eval/trampoline";

export class Pipeline {

  private readonly env_: IEnvironment;

  constructor(rootEnv: IEnvironment) {
    this.env_ = new Environment(rootEnv);
  }

  scan(string: string): TokenStream {
    return TokenStream.forText(string);
  }

  read(tokenStream: TokenStream): Datum {
    return Reader.forTokenStream(tokenStream).read();
  }

  /** @param nonterminal The nonterminal that should be the root of the parse tree. */
  parse(root: Datum, nonterminal: Nonterminal = PROGRAM): Datum {
    const ans = new ParserImpl(root).parse(nonterminal);
    if (!ans) {
      throw Error.parse(root);
    }
    return ans;
  }

  desugar(root: Datum): ProcCallLike {
    return /** @type {!ProcCallLike} */ (root.desugar(this.env_, false));
  }

  Eval(continuable: ProcCallLike, inputPort: InputPort, outputPort: OutputPort): Value {
    // VACUOUS_PROGRAM isn't a ProcCallLike, but this is enough of
    // a special case that I don't care.
    return continuable as any === VACUOUS_PROGRAM
      ? UNSPECIFIED_VALUE
      : trampoline(continuable, this.env_, inputPort, outputPort);
  }
}