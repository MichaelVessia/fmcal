# Multi-Platform Packaging Spec

## Overview

Package fmcal as standalone executables using Bun's native compilation, distributed via GitHub Releases and Homebrew.

- **Repo**: github.com/MichaelVessia/fmcal (public)
- **Tap**: github.com/MichaelVessia/homebrew-tap
- **License**: MIT

## Build Targets

| Platform | Target | Filename |
|----------|--------|----------|
| Linux x64 | `bun-linux-x64` | `fmcal-linux-x64` |
| macOS x64 | `bun-darwin-x64` | `fmcal-darwin-x64` |
| macOS ARM64 | `bun-darwin-arm64` | `fmcal-darwin-arm64` |

Note: Windows and Linux ARM64 excluded to reduce release size (~300MB vs ~500MB).

## Build Commands

```bash
mkdir -p dist
bun build src/main.ts --compile --target=bun-linux-x64 --outfile dist/fmcal-linux-x64
bun build src/main.ts --compile --target=bun-darwin-x64 --outfile dist/fmcal-darwin-x64
bun build src/main.ts --compile --target=bun-darwin-arm64 --outfile dist/fmcal-darwin-arm64
```

## GitHub Actions Release Workflow

Create `.github/workflows/release.yml`:

```yaml
name: Release

on:
  push:
    tags:
      - 'v*'

permissions:
  contents: write

jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: oven-sh/setup-bun@v2
        with:
          bun-version: latest

      - run: bun install

      - name: Typecheck
        run: bun run typecheck

      - name: Lint
        run: bun run lint

      - name: Test
        run: bun test

      - name: Build all targets
        run: |
          mkdir -p dist
          bun build src/main.ts --compile --target=bun-linux-x64 --outfile dist/fmcal-linux-x64
          bun build src/main.ts --compile --target=bun-darwin-x64 --outfile dist/fmcal-darwin-x64
          bun build src/main.ts --compile --target=bun-darwin-arm64 --outfile dist/fmcal-darwin-arm64

      - name: Create checksums
        run: |
          cd dist
          sha256sum * > checksums.txt

      - name: Release
        uses: softprops/action-gh-release@v2
        with:
          files: dist/*
          generate_release_notes: true

      - name: Update Homebrew tap
        env:
          HOMEBREW_TAP_TOKEN: ${{ secrets.HOMEBREW_TAP_TOKEN }}
        run: |
          VERSION=${GITHUB_REF#refs/tags/v}

          # Get SHA256 values
          SHA_LINUX_X64=$(grep fmcal-linux-x64 dist/checksums.txt | cut -d' ' -f1)
          SHA_DARWIN_X64=$(grep fmcal-darwin-x64 dist/checksums.txt | cut -d' ' -f1)
          SHA_DARWIN_ARM64=$(grep fmcal-darwin-arm64 dist/checksums.txt | cut -d' ' -f1)

          # Clone tap repo
          git clone https://x-access-token:${HOMEBREW_TAP_TOKEN}@github.com/MichaelVessia/homebrew-tap.git tap
          cd tap

          # Create/update formula
          mkdir -p Formula
          cat > Formula/fmcal.rb << 'FORMULA'
          class Fmcal < Formula
            desc "CLI for Fastmail calendars via CalDAV"
            homepage "https://github.com/MichaelVessia/fmcal"
            version "VERSION_PLACEHOLDER"
            license "MIT"

            on_macos do
              on_arm do
                url "https://github.com/MichaelVessia/fmcal/releases/download/vVERSION_PLACEHOLDER/fmcal-darwin-arm64"
                sha256 "SHA_DARWIN_ARM64_PLACEHOLDER"
              end
              on_intel do
                url "https://github.com/MichaelVessia/fmcal/releases/download/vVERSION_PLACEHOLDER/fmcal-darwin-x64"
                sha256 "SHA_DARWIN_X64_PLACEHOLDER"
              end
            end

            on_linux do
              on_intel do
                url "https://github.com/MichaelVessia/fmcal/releases/download/vVERSION_PLACEHOLDER/fmcal-linux-x64"
                sha256 "SHA_LINUX_X64_PLACEHOLDER"
              end
            end

            def install
              if OS.mac?
                bin.install "fmcal-darwin-#{Hardware::CPU.arm? ? "arm64" : "x64"}" => "fmcal"
              else
                bin.install "fmcal-linux-x64" => "fmcal"
              end
            end

            def caveats
              <<~EOS
                fmcal requires Fastmail credentials. Set environment variables:

                  export FMCAL_USERNAME="user@fastmail.com"
                  export FMCAL_PASSWORD="app-specific-password"

                Get an app password:
                  Fastmail → Settings → Privacy & Security → Integrations → New app password
              EOS
            end

            test do
              assert_match "fmcal", shell_output("#{bin}/fmcal --help")
            end
          end
          FORMULA

          # Replace placeholders
          sed -i "s/VERSION_PLACEHOLDER/${VERSION}/g" Formula/fmcal.rb
          sed -i "s/SHA_LINUX_X64_PLACEHOLDER/${SHA_LINUX_X64}/g" Formula/fmcal.rb
          sed -i "s/SHA_DARWIN_X64_PLACEHOLDER/${SHA_DARWIN_X64}/g" Formula/fmcal.rb
          sed -i "s/SHA_DARWIN_ARM64_PLACEHOLDER/${SHA_DARWIN_ARM64}/g" Formula/fmcal.rb

          # Commit and push
          git config user.name "github-actions[bot]"
          git config user.email "github-actions[bot]@users.noreply.github.com"
          git add Formula/fmcal.rb
          git commit -m "fmcal ${VERSION}"
          git push
```

## Setup Requirements

### 1. Create Personal Access Token

1. Go to GitHub → Settings → Developer settings → Personal access tokens → Fine-grained tokens
2. Create token with:
   - Repository access: `MichaelVessia/homebrew-tap`
   - Permissions: Contents (read/write)
3. Add as secret `HOMEBREW_TAP_TOKEN` in fmcal repo settings

### 2. Add LICENSE file

Create `LICENSE` in repo root with MIT license text.

### 3. Fix test script

Current `package.json` has `"test": "bun test || true"` which always passes. Remove `|| true` before enabling CI gate.

## Release Process

1. Update version in `package.json`
2. Commit: `git commit -am "chore: release vX.Y.Z"`
3. Tag: `git tag vX.Y.Z`
4. Push: `git push && git push --tags`
5. GitHub Actions:
   - Runs typecheck + lint + tests
   - Builds 3 binaries
   - Creates GitHub Release with auto-generated notes
   - Pushes updated formula to homebrew-tap (auto-merges)

## Installation

### Homebrew (Recommended)

```bash
brew tap MichaelVessia/tap
brew install fmcal
```

### Manual Download

```bash
# macOS ARM64 (Apple Silicon)
curl -L https://github.com/MichaelVessia/fmcal/releases/latest/download/fmcal-darwin-arm64 -o fmcal
chmod +x fmcal
mv fmcal /usr/local/bin/

# macOS x64 (Intel)
curl -L https://github.com/MichaelVessia/fmcal/releases/latest/download/fmcal-darwin-x64 -o fmcal
chmod +x fmcal
mv fmcal /usr/local/bin/

# Linux x64
curl -L https://github.com/MichaelVessia/fmcal/releases/latest/download/fmcal-linux-x64 -o fmcal
chmod +x fmcal
sudo mv fmcal /usr/local/bin/
```

### Verify Checksum

```bash
curl -L https://github.com/MichaelVessia/fmcal/releases/latest/download/checksums.txt
sha256sum -c checksums.txt --ignore-missing
```

## Configuration

```bash
# Add to ~/.bashrc, ~/.zshrc, or equivalent
export FMCAL_USERNAME="user@fastmail.com"
export FMCAL_PASSWORD="app-specific-password"
```

**Getting an app password:**
1. Log in to Fastmail web
2. Settings → Privacy & Security → Integrations
3. Create new app password with CalDAV access

## Decisions Log

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Platforms | macOS + Linux x64 | Reduce release size; ARM Linux/Windows can be added later |
| Tap updates | Auto-push | Faster releases, less manual work |
| Token type | PAT | Simpler than GitHub App for single-repo access |
| CI gate | Full (test+lint+typecheck) | Prevent broken releases |
| License | MIT | Standard permissive license |
| Release notes | Auto-generated | Less manual work per release |
| Provider scope | Fastmail only | Keep FMCAL_* env vars, tool is purpose-built |
