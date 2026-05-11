import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import { MessageComposer } from "@/components/chat/message-composer";

describe("MessageComposer", () => {
  it("renders the current upload error message", () => {
    render(
      <MessageComposer
        disabled={false}
        errorMessage="Files must be 1 MB or smaller."
        isUploading={false}
        value=""
        onChange={() => undefined}
        onSend={() => undefined}
      />,
    );

    expect(screen.getByText("Files must be 1 MB or smaller.")).toBeInTheDocument();
  });

  it("shows an immediate error and skips onSend for files larger than 1 MB", async () => {
    const onSend = vi.fn();
    const user = userEvent.setup();
    const oversizedFile = new File(["small"], "large.jpg", { type: "image/jpeg" });
    Object.defineProperty(oversizedFile, "size", {
      configurable: true,
      value: 1_048_577,
    });

    render(
      <MessageComposer
        disabled={false}
        errorMessage={null}
        isUploading={false}
        value=""
        onChange={() => undefined}
        onSend={onSend}
      />,
    );

    await user.upload(screen.getByLabelText("Attach file"), oversizedFile);

    expect(screen.getByText("Files must be 1 MB or smaller.")).toBeInTheDocument();
    expect(onSend).not.toHaveBeenCalled();
  });

  it("allows selecting non-image files within the size limit", async () => {
    const onSend = vi.fn();
    const user = userEvent.setup();

    render(
      <MessageComposer
        disabled={false}
        errorMessage={null}
        isUploading={false}
        value=""
        onChange={() => undefined}
        onSend={onSend}
      />,
    );

    await user.upload(
      screen.getByLabelText("Attach file"),
      new File(["report"], "notes.pdf", { type: "application/pdf" }),
    );

    expect(onSend).toHaveBeenCalledWith(expect.objectContaining({ name: "notes.pdf" }));
  });

  it("disables text, file input, and send button while uploading", () => {
    render(
      <MessageComposer
        disabled={false}
        errorMessage={null}
        isUploading
        value="hello"
        onChange={() => undefined}
        onSend={() => undefined}
      />,
    );

    expect(screen.getByPlaceholderText("Type your message...")).toBeDisabled();
    expect(screen.getByLabelText("Attach file")).toBeDisabled();
    expect(screen.getByRole("button", { name: "Uploading..." })).toBeDisabled();
  });
});
