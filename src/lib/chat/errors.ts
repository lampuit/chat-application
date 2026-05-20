type FirebaseLikeError = {
  code?: string;
  message?: string;
};

function getErrorMessage(error: unknown) {
  if (error instanceof Error && error.message.trim()) {
    return error.message.trim();
  }

  if (typeof error === "object" && error !== null) {
    const maybeError = error as FirebaseLikeError;

    if (typeof maybeError.message === "string" && maybeError.message.trim()) {
      return maybeError.message.trim();
    }
  }

  return null;
}

function getErrorCode(error: unknown) {
  if (typeof error === "object" && error !== null) {
    const maybeError = error as FirebaseLikeError;

    if (typeof maybeError.code === "string" && maybeError.code.trim()) {
      return maybeError.code.trim();
    }
  }

  return null;
}

export function normalizeChatError(error: unknown) {
  const code = getErrorCode(error);

  switch (code) {
    case "permission-denied":
    case "storage/unauthorized":
      return "You do not have permission to update this conversation.";
    case "unauthenticated":
      return "Your session has expired. Please sign in again.";
    case "unavailable":
    case "storage/retry-limit-exceeded":
      return "The chat service is temporarily unavailable. Please try again.";
    case "storage/canceled":
      return "The upload was canceled before it finished.";
    case "storage/quota-exceeded":
      return "File uploads are temporarily unavailable because the storage quota has been exceeded.";
    case "not-found":
      return "This conversation could not be found anymore.";
    default:
      return getErrorMessage(error) ?? "Something went wrong while updating the conversation.";
  }
}
