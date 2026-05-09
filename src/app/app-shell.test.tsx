import React from "react";
import { render, screen } from "@testing-library/react";
import { AppBrand } from "@/components/app/app-brand";

describe("AppBrand", () => {
  it("renders the application name", () => {
    render(<AppBrand />);

    expect(screen.getByText("Realtime Chat")).toBeInTheDocument();
  });
});
