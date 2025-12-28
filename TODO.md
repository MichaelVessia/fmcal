# fmcal - Remaining Work

## Integration Testing

The current test suite covers unit tests with mocked services. To fully test the software against a real CalDAV server:

### Setup Required

1. **Fastmail Account with App Password**
   - Create a Fastmail account or use existing
   - Generate an app-specific password at: https://www.fastmail.com/settings/security/tokens
   - Set environment variables:
     ```bash
     export FMCAL_USERNAME="your-email@fastmail.com"
     export FMCAL_PASSWORD="your-app-specific-password"
     ```

2. **Test Calendar Setup**
   - Create a dedicated test calendar in Fastmail for integration tests
   - This prevents pollution of production calendars

### Integration Test Cases to Implement

1. **Authentication Tests**
   - Test successful login with valid credentials
   - Test failure with invalid credentials
   - Test failure with missing credentials

2. **Calendar Operations**
   - Fetch all calendars and verify structure
   - Verify calendar properties (displayName, color, timezone)

3. **Event CRUD Operations**
   - Create event and verify it appears in calendar
   - Fetch created event by ID
   - Update event and verify changes persist
   - Delete event and verify removal
   - Handle concurrent modifications (etag conflicts)

4. **Query Operations**
   - Fetch events within date range
   - Verify free/busy calculation accuracy

5. **Edge Cases**
   - All-day events across timezones
   - Recurring events with exceptions
   - Events with special characters in summary/description
   - Very long event descriptions
   - Events spanning multiple days

### Running Integration Tests

```bash
# Set credentials
export FMCAL_USERNAME="..."
export FMCAL_PASSWORD="..."

# Run CLI manually
bun run dev calendars
bun run dev events "Calendar Name" --from 2025-01-01 --to 2025-01-31
```

## Coverage Notes

Current coverage focuses on:
- Config loading from environment (100%)
- Error type construction (100%) 
- Domain model validation (100%)
- Service interface via mocks (100%)
- iCal parsing/generation helpers (tested)

Not covered (requires live connection):
- `CalDavClientLive` layer (lines 188-540)
- Actual tsdav DAVClient interactions
- Network error handling in production

## Future Enhancements

- [ ] Add retry logic for transient network failures
- [ ] Implement caching for calendar list
- [ ] Add support for calendar creation/deletion
- [ ] Add attendee management
- [ ] Add reminder/alarm support
- [ ] Implement proper timezone handling
- [ ] Add batch operations for efficiency
