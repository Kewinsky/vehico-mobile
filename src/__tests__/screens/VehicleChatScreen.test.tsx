import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";

import { i18n } from "../../i18n/i18n";
import { VehicleChatScreen } from "../../screens/header/VehicleChatScreen";
import { requestVehicleChat } from "../../services/ai/vehicleChatRepo";

jest.mock("../../services/ai/vehicleChatRepo", () => ({
  requestVehicleChat: jest.fn(),
}));

jest.mock("@react-navigation/elements", () => ({
  useHeaderHeight: () => 96,
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
};
const DISPLAYED_ANSWER = ANSWER.answer;

const mockedRequestVehicleChat = jest.mocked(requestVehicleChat);

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
    mockedRequestVehicleChat.mockReset();
  });

  it("shows the broader screen description and predefined prompts", () => {
    const screen = renderScreen();

    expect(screen.getByText("AI assistant")).toBeTruthy();
    expect(
      screen.getByText("Ask about your car, ownership, and safe next steps."),
    ).toBeTruthy();
    expect(
      screen.getByText("How can I check when my vehicle inspection expires?"),
    ).toBeTruthy();
    expect(
      screen.getByText(
        "How can I calculate my average monthly fuel spending?",
      ),
    ).toBeTruthy();
    expect(
      screen.getByText("How often should engine oil be changed?"),
    ).toBeTruthy();
    expect(
      screen.getByText("What should I check when buying a used car?"),
    ).toBeTruthy();
    expect(screen.queryByLabelText("Hide suggested questions")).toBeNull();
    expect(screen.queryByText("How can I help?")).toBeNull();
    expect(
      screen.queryByText(
        "Describe a symptom, warning light, or sound that concerns you.",
      ),
    ).toBeNull();
  });

  it("sends a predefined prompt with one tap", async () => {
    mockedRequestVehicleChat.mockResolvedValue(ANSWER);
    const screen = renderScreen();

    fireEvent.press(
      screen.getByText("How should I prepare my car for a long trip?"),
    );

    await waitFor(() => expect(mockedRequestVehicleChat).toHaveBeenCalledTimes(1));
    expect(mockedRequestVehicleChat.mock.calls[0]?.[0].message).toBe(
      "How should I prepare my car for a long trip?",
    );
    expect(mockedRequestVehicleChat.mock.calls[0]?.[0].vehicleId).toBe("v1");
    expect(mockedRequestVehicleChat.mock.calls[0]?.[0]).not.toHaveProperty(
      "region",
    );
  });

  it("lets the user reopen predefined prompts after the chat starts", async () => {
    mockedRequestVehicleChat.mockResolvedValue(ANSWER);
    const screen = renderScreen();

    fireEvent.changeText(
      screen.getByLabelText("Message to the AI assistant"),
      "Oil warning light",
    );
    fireEvent.press(screen.getByLabelText("Send message"));

    await waitFor(() => expect(screen.getByText(DISPLAYED_ANSWER)).toBeTruthy());
    expect(
      screen.queryByText("How often should engine oil be changed?"),
    ).toBeNull();

    fireEvent.press(screen.getByLabelText("Show suggested questions"));

    expect(
      screen.getByText("How often should engine oil be changed?"),
    ).toBeTruthy();
    expect(screen.getByLabelText("Hide suggested questions")).toBeTruthy();
  });

  it("adds the user message and shows the validated answer", async () => {
    mockedRequestVehicleChat.mockResolvedValue(ANSWER);
    const screen = renderScreen();

    fireEvent.changeText(
      screen.getByLabelText("Message to the AI assistant"),
      "Oil warning light",
    );
    fireEvent.press(screen.getByLabelText("Send message"));

    expect(screen.getByText("Oil warning light")).toBeTruthy();
    await waitFor(() => expect(screen.getByText(DISPLAYED_ANSWER)).toBeTruthy());
  });

  it("allows retrying a failed answer without duplicating the user message", async () => {
    mockedRequestVehicleChat
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

    await waitFor(() => expect(screen.getByText(DISPLAYED_ANSWER)).toBeTruthy());
    expect(screen.getAllByText("Oil warning light")).toHaveLength(1);
    expect(mockedRequestVehicleChat).toHaveBeenCalledTimes(2);
  });

  it("sends completed exchanges as bounded in-session context", async () => {
    mockedRequestVehicleChat.mockResolvedValue(ANSWER);
    const screen = renderScreen();

    fireEvent.changeText(
      screen.getByLabelText("Message to the AI assistant"),
      "Oil warning light",
    );
    fireEvent.press(screen.getByLabelText("Send message"));
    await waitFor(() => expect(mockedRequestVehicleChat).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.getByText(DISPLAYED_ANSWER)).toBeTruthy());

    fireEvent.changeText(
      screen.getByLabelText("Message to the AI assistant"),
      "Why?",
    );
    fireEvent.press(screen.getByLabelText("Send message"));

    await waitFor(() => expect(mockedRequestVehicleChat).toHaveBeenCalledTimes(2));
    expect(mockedRequestVehicleChat.mock.calls[1]?.[0].history).toEqual([
      { role: "user", content: "Oil warning light" },
      {
        role: "assistant",
        content: DISPLAYED_ANSWER,
      },
    ]);
    await waitFor(() =>
      expect(screen.getAllByText(DISPLAYED_ANSWER)).toHaveLength(2),
    );
  });

  it("aborts the active request and exposes retry", async () => {
    mockedRequestVehicleChat.mockImplementation(
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
