export const VERIFY_VALID_INTERPRETATION =
  "VALID: this address signed this transaction and the QorePass memo is internally consistent (hash matches the embedded claim). This is not an independent guarantee — compare currentState to see whether the claim still matches the chain today.";

export const VERIFY_INVALID_INTERPRETATION =
  "INVALID: this transaction is not a verifiable QorePass claim (missing tx, bad memo, failed execution, or hash mismatch).";