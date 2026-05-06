import { resolveMarketplacePostContent } from "../../services/marketplace/marketplaceRepo";

describe("resolveMarketplacePostContent", () => {
  it("picks language from bilingual object", () => {
    const content = { pl: "PL text", en: "EN text" };
    expect(resolveMarketplacePostContent(content, "pl")).toBe("PL text");
    expect(resolveMarketplacePostContent(content, "en")).toBe("EN text");
  });

  it("parses legacy JSON string", () => {
    const raw = JSON.stringify({ pl: "A", en: "B" });
    expect(resolveMarketplacePostContent(raw, "en")).toBe("B");
  });

  it("returns plain string when JSON parse fails", () => {
    expect(resolveMarketplacePostContent("hello", "pl")).toBe("hello");
  });

  it("returns empty string for unexpected shapes", () => {
    expect(resolveMarketplacePostContent({} as any, "pl")).toBe("");
  });
});
