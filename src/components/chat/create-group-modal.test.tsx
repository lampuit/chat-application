import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import { CreateGroupModal } from "@/components/chat/create-group-modal";

describe("CreateGroupModal", () => {
  it("validates input and submits the group name with selected members", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const onCreateGroup = vi.fn().mockResolvedValue(undefined);

    render(
      <CreateGroupModal
        isOpen
        isSubmitting={false}
        onClose={onClose}
        onCreateGroup={onCreateGroup}
        users={[
          { uid: "user-2", displayName: "Jane Doe", email: "jane@example.com" },
          { uid: "user-3", displayName: "John Smith", email: "john@example.com" },
        ]}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Create group" }));

    expect(screen.getByText("Enter a group name.")).toBeInTheDocument();
    expect(screen.getByText("Choose at least one member.")).toBeInTheDocument();

    await user.type(screen.getByLabelText("Group name"), "Product Squad");
    await user.click(screen.getByLabelText("Jane Doe"));
    await user.click(screen.getByRole("button", { name: "Create group" }));

    expect(onCreateGroup).toHaveBeenCalledWith({
      groupName: "Product Squad",
      memberIds: ["user-2"],
    });
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
