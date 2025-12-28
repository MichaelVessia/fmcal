# fmcal

CLI for managing Fastmail calendars via CalDAV. Designed for both humans and AI agents.

## Features

- List calendars and events
- Create, update, and delete events
- Check free/busy status
- JSON output for easy parsing by scripts and AI agents
- Simple, predictable interface ideal for agentic workflows

## Installation

### With Nix (recommended)

```bash
# Run directly
nix run github:michaelvessia/fmcal -- calendars

# Or install
nix profile install github:michaelvessia/fmcal
```

### From Source

Requires [Bun](https://bun.sh/).

```bash
git clone https://github.com/michaelvessia/fmcal
cd fmcal
bun install
bun run build  # Creates ./fmcal binary
```

## Configuration

Set environment variables:

```bash
export FMCAL_USERNAME=you@fastmail.com
export FMCAL_PASSWORD=your-app-password  # Generate at Fastmail > Settings > Password & Security > App Passwords
```

## Usage

```bash
# List calendars
fmcal calendars

# List events in a date range
fmcal events --from 2025-01-01T00:00:00 --to 2025-01-31T23:59:59 "Calendar Name"

# Get single event
fmcal event "Calendar Name" event-uid

# Create event
fmcal create "Calendar Name" --summary "Meeting" --start 2025-01-15T10:00:00 --end 2025-01-15T11:00:00

# Create all-day event
fmcal create "Calendar Name" --summary "Holiday" --start 2025-01-20 --end 2025-01-21 --all-day

# Update event
fmcal update "Calendar Name" event-uid --summary "New Title"

# Delete event
fmcal delete "Calendar Name" event-uid

# Check free/busy
fmcal freebusy "Calendar1,Calendar2" --from 2025-01-15T00:00:00 --to 2025-01-15T23:59:59
```

**Note**: Options must come BEFORE positional arguments (e.g., `--from` before calendar name).

## Built With

- [Bun](https://bun.sh/) - Runtime
- [Effect](https://effect.website/) - Framework (`@effect/cli`, `@effect/platform-bun`)
- [tsdav](https://github.com/natelindev/tsdav) - CalDAV client
- [ical.js](https://github.com/kewisch/ical.js) - iCal parsing

## Development

```bash
nix develop          # Enter dev shell (or use direnv)
bun install
bun run dev          # Run CLI
bun run typecheck    # Type check
bun run test         # Run tests
bun run lint         # Lint
```

## License

MIT
