import { logger } from "../core/logger";
import { prisma } from "./prisma";

function isRetryablePrismaConnectionError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error ?? "");
  const code =
    typeof error === "object" && error !== null && "code" in error
      ? String((error as { code?: unknown }).code)
      : "";

  return (
    code === "P1001" ||
    code === "P1017" ||
    code === "P2024" ||
    message.includes("P1001") ||
    message.includes("P1017") ||
    message.includes("P2024") ||
    message.includes("Server has closed the connection") ||
    message.includes("Timed out fetching a new connection") ||
    message.includes("forcibly closed by the remote host")
  );
}

export async function withPrismaRetry<T>(
  operationName: string,
  fn: () => Promise<T>,
  attempts = 5,
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (!isRetryablePrismaConnectionError(error) || attempt === attempts) {
        throw error;
      }

      logger.warn(
        { operationName, attempt, attempts },
        "Retrying Prisma operation after transient connection error",
      );
      await prisma.$disconnect().catch(() => undefined);
      await new Promise((resolve) => setTimeout(resolve, 1_500 * attempt));
    }
  }

  throw lastError;
}
