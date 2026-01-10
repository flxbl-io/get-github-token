# Get GitHub Token Action

[![CI](https://github.com/flxbl-io/get-github-token/actions/workflows/ci.yml/badge.svg)](https://github.com/flxbl-io/get-github-token/actions/workflows/ci.yml)
[![Release](https://github.com/flxbl-io/get-github-token/actions/workflows/release.yml/badge.svg)](https://github.com/flxbl-io/get-github-token/actions/workflows/release.yml)

A GitHub Action that fetches a GitHub installation token from [SFP Server](https://docs.flxbl.io/sfp-server) for repository authentication. This provides secure, scoped access tokens for your CI/CD workflows.



## Usage

```yaml
- name: Get GitHub Token
  id: get-token
  uses: flxbl-io/get-github-token@v1
  with:
    sfp-server-url: ${{ secrets.SFP_SERVER_URL }}
    sfp-server-token: ${{ secrets.SFP_SERVER_TOKEN }}

- name: Use the token
  run: |
    git clone https://x-access-token:${{ steps.get-token.outputs.token }}@github.com/owner/repo.git
```

### With GitHub API

```yaml
- name: Get GitHub Token
  id: get-token
  uses: flxbl-io/get-github-token@v1
  with:
    sfp-server-url: ${{ secrets.SFP_SERVER_URL }}
    sfp-server-token: ${{ secrets.SFP_SERVER_TOKEN }}

- name: Create Issue
  uses: actions/github-script@v7
  with:
    github-token: ${{ steps.get-token.outputs.token }}
    script: |
      await github.rest.issues.create({
        owner: context.repo.owner,
        repo: context.repo.repo,
        title: 'Automated Issue',
        body: 'Created via GitHub Action'
      });
```

### Cross-Repository Access

```yaml
- name: Get Token for Another Repo
  id: get-token
  uses: flxbl-io/get-github-token@v1
  with:
    sfp-server-url: ${{ secrets.SFP_SERVER_URL }}
    sfp-server-token: ${{ secrets.SFP_SERVER_TOKEN }}
    repository: 'my-org/another-repo'

- name: Checkout Another Repo
  uses: actions/checkout@v4
  with:
    repository: my-org/another-repo
    token: ${{ steps.get-token.outputs.token }}
```

## Inputs

| Input | Description | Required | Default |
|-------|-------------|----------|---------|
| `sfp-server-url` | URL to the SFP Server instance (e.g., `https://your-org.flxbl.io`) | Yes | - |
| `sfp-server-token` | SFP Server application token | Yes | - |
| `repository` | Repository name (`owner/repo` format) | No | Current repository |

## Outputs

| Output | Description |
|--------|-------------|
| `token` | GitHub installation token (masked in logs) |

## How It Works

1. The action calls the SFP Server API endpoint `/sfp/api/repository/auth-token`
2. SFP Server uses the configured GitHub App to generate an installation token
3. The token is scoped to the specified repository
4. Tokens are cached on SFP Server for 50 minutes to reduce API calls
5. The action retries up to 3 times with 5-second delays on failure

## Prerequisites

- [SFP Server](https://docs.flxbl.io/sfp-server) instance configured with a GitHub App
- Repository registered as a project in SFP Server
- Application token from SFP Server

## Error Handling

| Error | Cause | Resolution |
|-------|-------|------------|
| `Repository not found` | Repository not registered in SFP Server | Add repository as a project in SFP Server |
| `403 Forbidden` | Invalid or expired SFP Server token | Verify application token in SFP Server |
| `Network errors` | Temporary connectivity issues | Action will automatically retry |

## Development

### Prerequisites

- Node.js 20+
- npm

### Setup

```bash
npm install
```

### Build

```bash
npm run build
```

### Test

```bash
npm test
npm run test:coverage
```

### Lint & Format

```bash
npm run lint
npm run format
```

## License

Copyright 2025 flxbl-io. All rights reserved. See [LICENSE](LICENSE) for details.

## Support

- [Documentation](https://docs.flxbl.io)
- [Issues](https://github.com/flxbl-io/get-github-token/issues)
- [flxbl.io](https://flxbl.io)
