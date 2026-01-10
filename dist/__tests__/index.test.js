"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const core = __importStar(require("@actions/core"));
// Mock @actions/core
globals_1.jest.mock('@actions/core');
// Store the original fetch
const originalFetch = global.fetch;
(0, globals_1.describe)('get-github-token action', () => {
    let mockFetch;
    let consoleLogSpy;
    let getInputMock;
    let setOutputMock;
    let setSecretMock;
    let setFailedMock;
    let infoMock;
    let warningMock;
    let debugMock;
    (0, globals_1.beforeEach)(() => {
        // Setup mocks
        mockFetch = globals_1.jest.fn();
        global.fetch = mockFetch;
        consoleLogSpy = globals_1.jest.spyOn(console, 'log').mockImplementation(() => { });
        getInputMock = core.getInput;
        setOutputMock = core.setOutput;
        setSecretMock = core.setSecret;
        setFailedMock = core.setFailed;
        infoMock = core.info;
        warningMock = core.warning;
        debugMock = core.debug;
        // Default input values
        getInputMock.mockImplementation((name, options) => {
            switch (name) {
                case 'sfp-server-url':
                    return 'https://test.sfp-server.com';
                case 'sfp-server-token':
                    return 'test-token-123';
                case 'repository':
                    return 'owner/repo';
                default:
                    return '';
            }
        });
        // Mock implementations
        setOutputMock.mockImplementation(() => { });
        setSecretMock.mockImplementation(() => { });
        setFailedMock.mockImplementation(() => { });
        infoMock.mockImplementation(() => { });
        warningMock.mockImplementation(() => { });
        debugMock.mockImplementation(() => { });
        // Clear environment variables
        delete process.env.GITHUB_REPOSITORY;
        // Clear all mock calls
        globals_1.jest.clearAllMocks();
    });
    (0, globals_1.afterEach)(() => {
        // Restore original fetch
        global.fetch = originalFetch;
        consoleLogSpy.mockRestore();
    });
    (0, globals_1.test)('should successfully fetch GitHub token on first attempt', async () => {
        // Arrange
        const { run } = await Promise.resolve().then(() => __importStar(require('../index')));
        const mockResponse = {
            token: 'ghs_test_token_abc123',
            expiresAt: '2025-11-18T12:00:00Z',
            type: 'installation',
            provider: 'github',
            scope: 'owner/repo'
        };
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => mockResponse,
            status: 200,
            statusText: 'OK'
        });
        // Act
        await run();
        // Assert
        (0, globals_1.expect)(mockFetch).toHaveBeenCalledTimes(1);
        (0, globals_1.expect)(mockFetch).toHaveBeenCalledWith('https://test.sfp-server.com/sfp/api/repository/auth-token?repositoryIdentifier=owner%2Frepo', globals_1.expect.objectContaining({
            method: 'GET',
            headers: globals_1.expect.objectContaining({
                'Authorization': 'Bearer test-token-123',
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            })
        }));
        (0, globals_1.expect)(setOutputMock).toHaveBeenCalledWith('token', 'ghs_test_token_abc123');
        (0, globals_1.expect)(setSecretMock).toHaveBeenCalledWith('ghs_test_token_abc123');
        (0, globals_1.expect)(infoMock).toHaveBeenCalledWith(globals_1.expect.stringContaining('Successfully retrieved GitHub token'));
        (0, globals_1.expect)(setFailedMock).not.toHaveBeenCalled();
    });
    (0, globals_1.test)('should use GITHUB_REPOSITORY when repository input is not provided', async () => {
        // Arrange
        const { run } = await Promise.resolve().then(() => __importStar(require('../index')));
        process.env.GITHUB_REPOSITORY = 'test-org/test-repo';
        getInputMock.mockImplementation((name) => {
            switch (name) {
                case 'sfp-server-url':
                    return 'https://test.sfp-server.com';
                case 'sfp-server-token':
                    return 'test-token-123';
                case 'repository':
                    return ''; // Empty repository input
                default:
                    return '';
            }
        });
        const mockResponse = {
            token: 'ghs_test_token',
            expiresAt: '2025-11-18T12:00:00Z',
            type: 'installation',
            provider: 'github',
            scope: 'test-org/test-repo'
        };
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => mockResponse
        });
        // Act
        await run();
        // Assert
        (0, globals_1.expect)(mockFetch).toHaveBeenCalledWith(globals_1.expect.stringContaining('repositoryIdentifier=test-org%2Ftest-repo'), globals_1.expect.any(Object));
    });
    (0, globals_1.test)('should retry on failure and succeed on second attempt', async () => {
        // Arrange
        const { run } = await Promise.resolve().then(() => __importStar(require('../index')));
        mockFetch
            .mockRejectedValueOnce(new Error('Network error'))
            .mockResolvedValueOnce({
            ok: true,
            json: async () => ({
                token: 'ghs_retry_token',
                expiresAt: '2025-11-18T12:00:00Z',
                type: 'installation',
                provider: 'github',
                scope: 'owner/repo'
            })
        });
        // Mock setTimeout to avoid waiting
        globals_1.jest.useFakeTimers();
        // Act
        const runPromise = run();
        await globals_1.jest.runAllTimersAsync();
        await runPromise;
        // Assert
        (0, globals_1.expect)(mockFetch).toHaveBeenCalledTimes(2);
        (0, globals_1.expect)(warningMock).toHaveBeenCalledWith(globals_1.expect.stringContaining('Attempt 1 failed'));
        (0, globals_1.expect)(setOutputMock).toHaveBeenCalledWith('token', 'ghs_retry_token');
        (0, globals_1.expect)(setFailedMock).not.toHaveBeenCalled();
        globals_1.jest.useRealTimers();
    });
    (0, globals_1.test)('should fail after maximum retries', async () => {
        // Arrange
        const { run } = await Promise.resolve().then(() => __importStar(require('../index')));
        mockFetch.mockRejectedValue(new Error('Persistent network error'));
        globals_1.jest.useFakeTimers();
        // Act
        const runPromise = run();
        await globals_1.jest.runAllTimersAsync();
        await runPromise;
        // Assert
        (0, globals_1.expect)(mockFetch).toHaveBeenCalledTimes(3); // MAX_RETRIES = 3
        (0, globals_1.expect)(setFailedMock).toHaveBeenCalledWith(globals_1.expect.stringContaining('Failed to get GitHub token after 3 attempts'));
        (0, globals_1.expect)(setOutputMock).not.toHaveBeenCalled();
        globals_1.jest.useRealTimers();
    });
    (0, globals_1.test)('should handle HTTP error responses', async () => {
        // Arrange
        const { run } = await Promise.resolve().then(() => __importStar(require('../index')));
        mockFetch.mockResolvedValue({
            ok: false,
            status: 404,
            statusText: 'Not Found',
            json: async () => ({ message: 'Repository not found' }),
            text: async () => ''
        });
        globals_1.jest.useFakeTimers();
        // Act
        const runPromise = run();
        await globals_1.jest.runAllTimersAsync();
        await runPromise;
        // Assert
        (0, globals_1.expect)(setFailedMock).toHaveBeenCalledWith(globals_1.expect.stringContaining('Repository not found'));
        globals_1.jest.useRealTimers();
    });
    (0, globals_1.test)('should handle response without token', async () => {
        // Arrange
        const { run } = await Promise.resolve().then(() => __importStar(require('../index')));
        mockFetch.mockResolvedValue({
            ok: true,
            status: 200,
            statusText: 'OK',
            json: async () => ({
                expiresAt: '2025-11-18T12:00:00Z',
                type: 'installation'
                // Missing token field
            })
        });
        globals_1.jest.useFakeTimers();
        // Act
        const runPromise = run();
        await globals_1.jest.runAllTimersAsync();
        await runPromise;
        // Assert
        (0, globals_1.expect)(setFailedMock).toHaveBeenCalledWith(globals_1.expect.stringContaining('Response did not contain a token'));
        globals_1.jest.useRealTimers();
    });
    (0, globals_1.test)('should fail when repository is not provided', async () => {
        // Arrange
        const { run } = await Promise.resolve().then(() => __importStar(require('../index')));
        getInputMock.mockImplementation((name) => {
            switch (name) {
                case 'sfp-server-url':
                    return 'https://test.sfp-server.com';
                case 'sfp-server-token':
                    return 'test-token-123';
                case 'repository':
                    return '';
                default:
                    return '';
            }
        });
        delete process.env.GITHUB_REPOSITORY;
        // Act
        await run();
        // Assert
        (0, globals_1.expect)(setFailedMock).toHaveBeenCalledWith(globals_1.expect.stringContaining('Repository not specified and GITHUB_REPOSITORY not set'));
        (0, globals_1.expect)(mockFetch).not.toHaveBeenCalled();
    });
});
