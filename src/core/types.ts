/** QorePass scan check derived from on-chain reads only. */
export interface ScanCheck {
  id: string;
  label: string;
  passed: boolean;
  weight: number;
  explanation: string;
}

/** Letter grade from weighted scan score. */
export type PassportGrade = "A" | "B" | "C" | "D" | "F";

export interface ScanResult {
  address: string;
  network: string;
  balanceQor: string;
  balanceUqor: string;
  pqcKeyRegistered: boolean;
  /** True when a successful tx with a compact QorePass memo exists for this address. */
  hasPassport: boolean;
  checks: ScanCheck[];
  score: number;
  grade: PassportGrade;
  scannedAt: string;
  /** Latest successful on-chain QorePass memo tx hash for this address, if any. */
  passportTxHash?: string;
}

export interface PassportV1 {
  v: 1;
  address: string;
  score: number;
  grade: PassportGrade;
  checks: Array<{ id: string; passed: boolean }>;
  issuedAt: string;
}

export interface BuildPassportResult {
  passport: PassportV1;
  passportHash: string;
  memo: string;
}

export interface AccountStatus {
  address: string;
  network: string;
  balances: Array<{ denom: string; amount: string }>;
  balanceUqor: string;
  balanceQor: string;
  pqcKeyRegistered: boolean;
  pqcAlgorithmId?: number;
  pqcPossessionProven?: boolean;
}

export interface VerifyPassportResult {
  status: "VALID" | "INVALID";
  valid: boolean;
  reasons: string[];
  passport?: PassportV1;
  memo?: string;
  memoHash?: string;
  recomputedHash?: string;
  signer?: string;
  height?: number;
  time?: string;
  explorerUrl?: string;
  txCode?: number;
}

export interface CoreError {
  code: string;
  message: string;
}