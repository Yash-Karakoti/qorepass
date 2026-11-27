import { isValidBech32 } from "@qorechain/sdk";
import { z } from "zod";

type ValidationErrorCode = "INVALID_ADDRESS" | "INVALID_TX_HASH";

export const qorAddressSchema = z
  .string()
  .trim()
  .min(1, "Address is required.")
  .refine((value) => isValidBech32(value, "qor"), {
    message: "Expected a valid qor1… bech32 address.",
  });

export const txHashSchema = z
  .string()
  .trim()
  .transform((value) => value.toLowerCase().replace(/^0x/, ""))
  .refine((value) => /^[0-9a-f]{64}$/.test(value), {
    message: "Expected a 64-character lowercase hex transaction hash.",
  });

export type ParsedQorAddress = z.infer<typeof qorAddressSchema>;
export type ParsedTxHash = z.infer<typeof txHashSchema>;

export function validationFailure(
  code: ValidationErrorCode,
  err: z.ZodError,
): { error: { code: ValidationErrorCode; message: string } } {
  const message =
    err.issues.map((issue) => issue.message).join(" ") || "Invalid input.";
  return { error: { code, message } };
}