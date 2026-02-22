import type { NextAction } from "./types.ts"

export const listCalendars = (): NextAction => ({
  command: "fmcal calendars",
  description: "List all calendars",
})

export const listEvents = (calendarId: string): NextAction => ({
  command: `fmcal events ${calendarId}`,
  description: "List events in this calendar",
  params: {
    "--from": { description: "ISO-8601 start datetime", required: false },
    "--to": { description: "ISO-8601 end datetime", required: false },
    "--max": { description: "Maximum number of events", required: false },
    "--query": { description: "Search query", required: false },
  },
})

export const getEvent = (calendarId: string, eventId: string): NextAction => ({
  command: `fmcal event ${calendarId} ${eventId}`,
  description: "View full event details",
})

export const createEvent = (calendarId: string): NextAction => ({
  command: `fmcal create ${calendarId} --summary <summary> --start <datetime> --end <datetime>`,
  description: "Create a new event",
  params: {
    "--summary": { description: "Event title", required: true },
    "--start": { description: "ISO-8601 start datetime", required: true },
    "--end": { description: "ISO-8601 end datetime", required: true },
    "--description": { description: "Event description", required: false },
    "--location": { description: "Event location", required: false },
    "--all-day": { description: "All-day event flag", required: false },
  },
})

export const updateEvent = (calendarId: string, eventId: string): NextAction => ({
  command: `fmcal update ${calendarId} ${eventId}`,
  description: "Update this event",
  params: {
    "--summary": { description: "New title", required: false },
    "--start": { description: "New start datetime", required: false },
    "--end": { description: "New end datetime", required: false },
    "--description": { description: "New description", required: false },
    "--location": { description: "New location", required: false },
    "--all-day": { description: "Toggle all-day", required: false },
  },
})

export const deleteEvent = (calendarId: string, eventId: string): NextAction => ({
  command: `fmcal delete ${calendarId} ${eventId}`,
  description: "Delete this event",
})

export const freeBusy = (calendarIds?: string): NextAction => ({
  command: `fmcal freebusy ${calendarIds ?? "<calendarIds>"} --from <datetime> --to <datetime>`,
  description: "Check free/busy availability",
  params: {
    calendarIds: {
      description: "Comma-separated calendar IDs",
      required: true,
      ...(calendarIds ? { value: calendarIds } : {}),
    },
    "--from": { description: "ISO-8601 start datetime", required: true },
    "--to": { description: "ISO-8601 end datetime", required: true },
  },
})
