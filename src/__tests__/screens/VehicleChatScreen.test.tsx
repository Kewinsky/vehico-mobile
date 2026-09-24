import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";

import { i18n } from "../../i18n/i18n";
import { VehicleChatScreen } from "../../screens/header/VehicleChatScreen";
import { streamVehicleChat } from "../../services/ai/vehicleChatRepo";

jest.mock("../../services/ai/vehicleChatRepo", () => ({
  streamVehicleChat: jest.fn(),
}));

jest.mock("../../ui/ThemeProvider", () => ({
  useTheme: () => ({
    theme: jest.requireActual("../../ui/theme").lightTheme,
    mode: "light",
  }),
}));

jest.mock("../../layouts", () => {
  const mockReact = require("react");
  const { View: MockView } = require("react-native");
  return {
    HeaderLayout: ({
      children,
      footer,
    }: {
      children: React.ReactNode;
      footer?: React.ReactNode;
    }) => mockReact.createElement(MockView, null, children, footer),
  };
});

jest.mock("../../ui/components/layout/ContentHeader", () => {
  const mockReact = require("react");
  const { Text: MockText, View: MockView } = require("react-native");
  return {
    ContentHeader: ({ title, subtitle }: { title: string; subtitle?: string }) =>
      mockReact.createElement(
        MockView,
        null,
        mockReact.createElement(MockText, null, title),
        subtitle ? mockReact.createElement(MockText, null, subtitle) : null,
      ),
  };
});

const ANSWER = {
  answer: "Stop safely.",
  urgency: "stop_driving" as const,
  uncertainty: "The cause cannot be confirmed remotely.",
  nextStep: "Arrange roadside assistance.",
};

const mockedStreamVehicleChat = jest.mocked(streamVehicleChat);

function renderScreen() {
  return render(
    <VehicleChatScreen
      navigation={{ goBack: jest.fn() } as never}
      route={{ key: "chat", name: "VehicleChat", params: { vehicleId: "v1" } }}
    />,
  );
}

describe("VehicleChatScreen", () => {
  beforeEach(async () => {
    await i18n.changeLanguage("en");
    mockedStreamVehicleChat.mockReset();
  });

  it("shows the screen description without the removed empty-state subheader", () => {
    const screen = renderScreen();

    expect(screen.getByText("AI assistant")).toBeTruthy();
    expect(screen.getByText("Ask about symptoms and safe next steps.")).toBeTruthy();
    expect(
      screen.getByText(
        "Describe a symptom, warning light, or sound that concerns you.",
      ),
    ).toBeTruthy();
    expect(screen.queryByText("How can I help?")).toBeNull();
  });

  it("adds the user message, renders streamed text, and shows final details", async () => {
    mockedStreamVehicleChat.mockImplementation(async ({ onDelta }) => {
      onDelta("Stop ");
      onDelta("safely.");
      return ANSWER;
    });
    const screen = renderScreen();

    fireEvent.changeText(
      screen.getByLabelText("Message to the AI assistant"),
      "Oil warning light",
    );
    fireEvent.press(screen.getByLabelText("Send message"));

    expect(screen.getByText("Oil warning light")).toBeTruthy();
    await waitFor(() => expect(screen.getByText("Stop safely.")).toBeTruthy());
    expect(screen.getByText("Stop driving")).toBeTruthy();
    expect(
      screen.getByText("The cause cannot be confirmed remotely."),
    ).toBeTruthy();
    expect(screen.getByText("Arrange roadside assistance.")).toBeTruthy();
  });

  it("allows retrying a failed answer without duplicating the user message", async () => {
    mockedStreamVehicleChat
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValueOnce(ANSWER);
    const screen = renderScreen();

    fireEvent.changeText(
      screen.getByLabelText("Message to the AI assistant"),
      "Oil warning light",
    );
    fireEvent.press(screen.getByLabelText("Send message"));

    await waitFor(() =>
      expect(
        screen.getByText("Could not get an answer. Try again."),
      ).toBeTruthy(),
    );
    fireEvent.press(screen.getByText("Try again"));

    await waitFor(() => expect(screen.getByText("Stop safely.")).toBeTruthy());
    expect(screen.getAllByText("Oil warning light")).toHaveLength(1);
    expect(mockedStreamVehicleChat).toHaveBeenCalledTimes(2);
  });

  it("sends completed exchanges as bounded in-session context", async () => {
    mockedStreamVehicleChat.mockResolvedValue(ANSWER);
    const screen = renderScreen();

    fireEvent.changeText(
      screen.getByLabelText("Message to the AI assistant"),
      "Oil warning light",
    );
    fireEvent.press(screen.getByLabelText("Send message"));
    await waitFor(() => expect(mockedStreamVehicleChat).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.getByText("Stop safely.")).toBeTruthy());

    fireEvent.changeText(
      screen.getByLabelText("Message to the AI assistant"),
      "Why?",
    );
    fireEvent.press(screen.getByLabelText("Send message"));

    await waitFor(() => expect(mockedStreamVehicleChat).toHaveBeenCalledTimes(2));
    expect(mockedStreamVehicleChat.mock.calls[1]?.[0].history).toEqual([
      { role: "user", content: "Oil warning light" },
      {
        role: "assistant",
        content:
          "Stop safely.\n\nThe cause cannot be confirmed remotely.\n\nArrange roadside assistance.",
      },
    ]);
    await waitFor(() => expect(screen.getAllByText("Stop safely.")).toHaveLength(2));
  });

  it("aborts the active request and exposes retry", async () => {
    mockedStreamVehicleChat.mockImplementation(
      ({ signal }) =>
        new Promise((_, reject) => {
          signal.addEventListener("abort", () => reject(new Error("aborted")));
        }),
    );
    const screen = renderScreen();

    fireEvent.changeText(
      screen.getByLabelText("Message to the AI assistant"),
      "Oil warning light",
    );
    fireEvent.press(screen.getByLabelText("Send message"));
    fireEvent.press(await screen.findByLabelText("Stop response"));

    await waitFor(() =>
      expect(screen.getByText("The response was stopped.")).toBeTruthy(),
    );
    expect(screen.getByText("Try again")).toBeTruthy();
  });
});
