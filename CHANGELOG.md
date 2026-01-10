# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.0.0] - 2025-01-10

### Added

- Initial release as standalone Marketplace action
- Fetch GitHub installation tokens from SFP Server
- Automatic retry logic with 3 attempts and 5-second delays
- Token masking in GitHub Actions logs
- Comprehensive test coverage
- TypeScript implementation with Node.js 20 runtime

### Security

- Tokens are automatically masked using `core.setSecret()`
- Secure HTTPS communication with SFP Server
- Bearer token authentication for API calls

[Unreleased]: https://github.com/flxbl-io/get-github-token/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/flxbl-io/get-github-token/releases/tag/v1.0.0
