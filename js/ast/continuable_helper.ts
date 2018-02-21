import {ProcCallLike, getLastProcCallLike} from './datum';

/**
 * A buffer to accumulate a Continuable-Continuation chain
 * without the caller having to do the pointer arithmetic.
 */
export class ContinuableHelper {

  private firstProcCallLike: ProcCallLike | null = null;
  private lastProcCallLike: ProcCallLike | null = null;

  appendProcCallLike(procCallLike: ProcCallLike) {
    if (!this.firstProcCallLike) {
      this.firstProcCallLike = procCallLike;
    } else {
      this.lastProcCallLike!.setNext(procCallLike);
    }
    this.lastProcCallLike = getLastProcCallLike(procCallLike);
  }

  toContinuable(): ProcCallLike | null {
    return this.firstProcCallLike;
  }
}