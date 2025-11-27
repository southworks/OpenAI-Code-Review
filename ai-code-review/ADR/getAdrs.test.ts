import { describe, it, expect, vi, beforeEach } from "vitest";
import { getAdrs } from "./getAdrs";
import { Repository } from "../repository";

// Mock the Repository class
vi.mock("./repository");

describe("getAdrs", () => {
  let mockRepository: Repository;

  beforeEach(() => {
    vi.clearAllMocks();
    mockRepository = {
      GetFilesFromBranch: vi.fn(),
      GetDefaultBranch: vi.fn()
    } as any;
  });

  it("should return ADRs from local repo when exist", async () => {
    const mockAdrContent = ["# ADR 001: Use TypeScript", "# ADR 002: Use Vitest"];

    (mockRepository.GetDefaultBranch as any).mockResolvedValue("main");
    (mockRepository.GetFilesFromBranch as any).mockResolvedValue(mockAdrContent);

    const result = await getAdrs(mockRepository, "docs/adrs");

    expect(result).toEqual(mockAdrContent);
    expect(mockRepository.GetDefaultBranch).toHaveBeenCalledTimes(1);
    expect(mockRepository.GetFilesFromBranch).toHaveBeenCalledWith(
      ["docs/adrs"],
      "main",
      expect.any(Function)
    );
  });

  it("should return empty array when no ADRs are found", async () => {
    (mockRepository.GetDefaultBranch as any).mockResolvedValue("main");
    (mockRepository.GetFilesFromBranch as any).mockResolvedValue([]);

    const result = await getAdrs(mockRepository, "docs/adrs");

    expect(result).toEqual([]);
  });

  it("should propagate errors from repository methods", async () => {
    (mockRepository.GetDefaultBranch as any).mockRejectedValue(new Error("Repository error"));

    await expect(getAdrs(mockRepository, "docs/adrs")).rejects.toThrow("Repository error");
  });
});
