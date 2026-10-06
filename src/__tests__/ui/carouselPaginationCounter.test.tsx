import { render } from "@testing-library/react-native";

import { CarouselPaginationCounter } from "../../ui/components/common/CarouselPaginationCounter";

jest.mock("../../ui/ThemeProvider", () => ({
  useTheme: () => ({
    theme: { typography: { small: 12, fontWeight: { semibold: "600" } } },
  }),
}));

jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

describe("CarouselPaginationCounter", () => {
  it("shows the current and total photo count", () => {
    const { getByText } = render(
      <CarouselPaginationCounter activeIndex={19} total={42} />,
    );

    expect(getByText("20 / 42")).toBeTruthy();
  });

  it("does not render for a single photo", () => {
    const { toJSON } = render(
      <CarouselPaginationCounter activeIndex={0} total={1} />,
    );

    expect(toJSON()).toBeNull();
  });
});
