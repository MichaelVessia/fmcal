# fmcal - Fastmail Calendar CLI

Agent-controllable CLI for Fastmail calendars via CalDAV, built with Effect.

## Tech Stack

- **Runtime**: Bun
- **Framework**: `@effect/cli` + `@effect/platform-bun`
- **CalDAV**: `tsdav`
- **iCal Parsing**: `ical.js`

## Commands

| Command | Description |
|---------|-------------|
| `fmcal calendars` | List all calendars |
| `fmcal events --from <date> --to <date> <calendarId>` | List events |
| `fmcal event <calendarId> <eventId>` | Get single event details |
| `fmcal create <calendarId> --summary --start --end [...]` | Create event |
| `fmcal update <calendarId> <eventId> [options]` | Update event |
| `fmcal delete <calendarId> <eventId>` | Delete event |
| `fmcal freebusy <calendarIds> --from --to` | Check free/busy |

**Important**: Options must come BEFORE positional arguments (this is an @effect/cli convention). Use `--` after `bun run` to pass args correctly:
```bash
nix develop -c bun run src/main.ts -- events --from 2025-01-01T00:00:00 --to 2025-01-01T23:59:59 Calendar
```

**Note**: `bun` is only available inside the nix shell. Use `nix develop -c <command>` or enter the shell first with `nix develop`.

## Environment Variables

```bash
FMCAL_USERNAME=user@fastmail.com
FMCAL_PASSWORD=app-specific-password
```

## Development

```bash
nix develop          # Enter dev shell
bun install          # Install dependencies
bun run dev          # Run CLI
bun run typecheck    # Type check
bun run build        # Build executable
```

<!-- effect-solutions:start -->
## Effect Best Practices

**Before implementing Effect features**, run `effect-solutions list` and read the relevant guide.

Topics include: services and layers, data modeling, error handling, configuration, testing, HTTP clients, CLIs, observability, and project structure.

**Effect Source Reference:** `~/.local/share/effect-solutions/effect`
Search here for real implementations when docs aren't enough.
<!-- effect-solutions:end -->

## Landing the Plane (Session Completion)

**When ending a work session**, you MUST complete ALL steps below. Work is NOT complete until `git push` succeeds.

**MANDATORY WORKFLOW:**

1. **File issues for remaining work** - Create issues for anything that needs follow-up
2. **Run quality gates** (if code changed) - Tests, linters, builds
3. **Update issue status** - Close finished work, update in-progress items
4. **PUSH TO REMOTE** - This is MANDATORY:
   ```bash
   git pull --rebase
   bd sync
   git push
   git status  # MUST show "up to date with origin"
   ```
5. **Clean up** - Clear stashes, prune remote branches
6. **Verify** - All changes committed AND pushed
7. **Hand off** - Provide context for next session

**CRITICAL RULES:**
- Work is NOT complete until `git push` succeeds
- NEVER stop before pushing - that leaves work stranded locally
- NEVER say "ready to push when you are" - YOU must push
- If push fails, resolve and retry until it succeeds
Use 'bd' for task tracking
