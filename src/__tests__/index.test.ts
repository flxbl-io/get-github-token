import {
  describe,
  test,
  expect,
  jest,
  beforeEach,
  afterEach,
} from "@jest/globals";
import * as core from "@actions/core";

// Mock @actions/core
jest.mock("@actions/core");

// Store the original fetch
const originalFetch = global.fetch;

describe("get-github-token action", () => {
  let mockFetch: jest.MockedFunction<typeof fetch>;
  let consoleLogSpy: jest.SpiedFunction<typeof console.log>;
  let getInputMock: jest.MockedFunction<typeof core.getInput>;
  let setOutputMock: jest.MockedFunction<typeof core.setOutput>;
  let setSecretMock: jest.MockedFunction<typeof core.setSecret>;
  let setFailedMock: jest.MockedFunction<typeof core.setFailed>;
  let infoMock: jest.MockedFunction<typeof core.info>;
  let warningMock: jest.MockedFunction<typeof core.warning>;
  let debugMock: jest.MockedFunction<typeof core.debug>;

  beforeEach(() => {
    // Setup mocks
    mockFetch = jest.fn() as jest.MockedFunction<typeof fetch>;
    global.fetch = mockFetch;

    consoleLogSpy = jest.spyOn(console, "log").mockImplementation(() => {});

    getInputMock = core.getInput as jest.MockedFunction<typeof core.getInput>;
    setOutputMock = core.setOutput as jest.MockedFunction<
      typeof core.setOutput
    >;
    setSecretMock = core.setSecret as jest.MockedFunction<
      typeof core.setSecret
    >;
    setFailedMock = core.setFailed as jest.MockedFunction<
      typeof core.setFailed
    >;
    infoMock = core.info as jest.MockedFunction<typeof core.info>;
    warningMock = core.warning as jest.MockedFunction<typeof core.warning>;
    debugMock = core.debug as jest.MockedFunction<typeof core.debug>;

    // Default input values
    getInputMock.mockImplementation(
      (name: string, options?: core.InputOptions) => {
        switch (name) {
          case "sfp-server-url":
            return "https://test.sfp-server.com";
          case "sfp-server-token":
            return "test-token-123";
          case "repository":
            return "owner/repo";
          default:
            return "";
        }
      },
    );

    // Mock implementations
    setOutputMock.mockImplementation(() => {});
    setSecretMock.mockImplementation(() => {});
    setFailedMock.mockImplementation(() => {});
    infoMock.mockImplementation(() => {});
    warningMock.mockImplementation(() => {});
    debugMock.mockImplementation(() => {});

    // Clear environment variables
    delete process.env.GITHUB_REPOSITORY;

    // Clear all mock calls
    jest.clearAllMocks();
  });

  afterEach(() => {
    // Restore original fetch
    global.fetch = originalFetch;
    consoleLogSpy.mockRestore();
  });

  test("should successfully fetch GitHub token on first attempt", async () => {
    // Arrange
    const { run } = await import("../index");

    const mockResponse = {
      token: "ghs_test_token_abc123",
      expiresAt: "2025-11-18T12:00:00Z",
      type: "installation",
      provider: "github",
      scope: "owner/repo",
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
      status: 200,
      statusText: "OK",
    } as Response);

    // Act
    await run();

    // Assert
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockFetch).toHaveBeenCalledWith(
      "https://test.sfp-server.com/sfp/api/repository/auth-token?repositoryIdentifier=owner%2Frepo",
      expect.objectContaining({
        method: "GET",
        headers: expect.objectContaining({
          Authorization: "Bearer test-token-123",
          "Content-Type": "application/json",
          Accept: "application/json",
        }),
      }),
    );

    expect(setOutputMock).toHaveBeenCalledWith(
      "token",
      "ghs_test_token_abc123",
    );
    expect(setSecretMock).toHaveBeenCalledWith("ghs_test_token_abc123");
    expect(infoMock).toHaveBeenCalledWith(
      expect.stringContaining("Successfully retrieved GitHub token"),
    );
    expect(setFailedMock).not.toHaveBeenCalled();
  });

  test("should use GITHUB_REPOSITORY when repository input is not provided", async () => {
    // Arrange
    const { run } = await import("../index");

    process.env.GITHUB_REPOSITORY = "test-org/test-repo";

    getInputMock.mockImplementation((name: string) => {
      switch (name) {
        case "sfp-server-url":
          return "https://test.sfp-server.com";
        case "sfp-server-token":
          return "test-token-123";
        case "repository":
          return ""; // Empty repository input
        default:
          return "";
      }
    });

    const mockResponse = {
      token: "ghs_test_token",
      expiresAt: "2025-11-18T12:00:00Z",
      type: "installation",
      provider: "github",
      scope: "test-org/test-repo",
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    } as Response);

    // Act
    await run();

    // Assert
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("repositoryIdentifier=test-org%2Ftest-repo"),
      expect.any(Object),
    );
  });

  test("should retry on failure and succeed on second attempt", async () => {
    // Arrange
    const { run } = await import("../index");

    mockFetch
      .mockRejectedValueOnce(new Error("Network error"))
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          token: "ghs_retry_token",
          expiresAt: "2025-11-18T12:00:00Z",
          type: "installation",
          provider: "github",
          scope: "owner/repo",
        }),
      } as Response);

    // Mock setTimeout to resolve immediately
    jest
      .spyOn(global, "setTimeout")
      .mockImplementation((callback: Function) => {
        callback();
        return 0 as unknown as NodeJS.Timeout;
      });

    // Act
    await run();

    // Assert
    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(warningMock).toHaveBeenCalledWith(
      expect.stringContaining("Attempt 1 failed"),
    );
    expect(setOutputMock).toHaveBeenCalledWith("token", "ghs_retry_token");
    expect(setFailedMock).not.toHaveBeenCalled();

    jest.restoreAllMocks();
  });

  test("should fail after maximum retries", async () => {
    // Arrange
    const { run } = await import("../index");

    mockFetch.mockRejectedValue(new Error("Persistent network error"));

    // Mock setTimeout to resolve immediately
    jest
      .spyOn(global, "setTimeout")
      .mockImplementation((callback: Function) => {
        callback();
        return 0 as unknown as NodeJS.Timeout;
      });

    // Act
    await run();

    // Assert
    expect(mockFetch).toHaveBeenCalledTimes(3); // MAX_RETRIES = 3
    expect(setFailedMock).toHaveBeenCalledWith(
      expect.stringContaining("Failed to get GitHub token after 3 attempts"),
    );
    expect(setOutputMock).not.toHaveBeenCalled();

    jest.restoreAllMocks();
  });

  test("should handle HTTP error responses", async () => {
    // Arrange
    const { run } = await import("../index");

    mockFetch.mockResolvedValue({
      ok: false,
      status: 404,
      statusText: "Not Found",
      json: async () => ({ message: "Repository not found" }),
      text: async () => "",
    } as Response);

    // Mock setTimeout to resolve immediately
    jest
      .spyOn(global, "setTimeout")
      .mockImplementation((callback: Function) => {
        callback();
        return 0 as unknown as NodeJS.Timeout;
      });

    // Act
    await run();

    // Assert
    expect(setFailedMock).toHaveBeenCalledWith(
      expect.stringContaining("Repository not found"),
    );

    jest.restoreAllMocks();
  });

  test("should handle response without token", async () => {
    // Arrange
    const { run } = await import("../index");

    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      statusText: "OK",
      json: async () => ({
        expiresAt: "2025-11-18T12:00:00Z",
        type: "installation",
        // Missing token field
      }),
    } as Response);

    // Mock setTimeout to resolve immediately
    jest
      .spyOn(global, "setTimeout")
      .mockImplementation((callback: Function) => {
        callback();
        return 0 as unknown as NodeJS.Timeout;
      });

    // Act
    await run();

    // Assert
    expect(setFailedMock).toHaveBeenCalledWith(
      expect.stringContaining("Response did not contain a token"),
    );

    jest.restoreAllMocks();
  });

  test("should fail when repository is not provided", async () => {
    // Arrange
    const { run } = await import("../index");

    getInputMock.mockImplementation((name: string) => {
      switch (name) {
        case "sfp-server-url":
          return "https://test.sfp-server.com";
        case "sfp-server-token":
          return "test-token-123";
        case "repository":
          return "";
        default:
          return "";
      }
    });

    delete process.env.GITHUB_REPOSITORY;

    // Act
    await run();

    // Assert
    expect(setFailedMock).toHaveBeenCalledWith(
      expect.stringContaining(
        "Repository not specified and GITHUB_REPOSITORY not set",
      ),
    );
    expect(mockFetch).not.toHaveBeenCalled();
  });
});
