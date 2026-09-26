import ICAL from 'ical.js';
import { supabase } from './supabase';
import { apiUrl } from './apiBase';

export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  location?: string;
  startDate: Date;
  endDate: Date;
}

export async function saveCalendarUrl(url: string): Promise<void> {
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) throw new Error('Authentication required.');

  const { error } = await supabase.auth.updateUser({
    data: { ical_url: url.trim() }
  });

  if (error) throw new Error(error.message);
}

export async function getSavedCalendarUrl(): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser();
  return user?.user_metadata?.ical_url || null;
}

export function parseIcsText(icsData: string): CalendarEvent[] {
  const parsedData = ICAL.parse(icsData);
  const comp = new ICAL.Component(parsedData);
  const vevents = comp.getAllSubcomponents('vevent');

  const events: CalendarEvent[] = vevents.map((vevent, index) => {
    const event = new ICAL.Event(vevent);
    return {
      id: event.uid || `event-${index}`,
      title: event.summary || 'Untitled Lecture / Event',
      description: event.description || '',
      location: event.location || '',
      startDate: event.startDate.toJSDate(),
      endDate: event.endDate.toJSDate(),
    };
  });

  return events.sort((a, b) => a.startDate.getTime() - b.startDate.getTime());
}

/**
 * Fetch an iCal/WebCAL feed via the Express proxy on Render (or local Vite proxy).
 * Uses VITE_API_URL when the static site and API are split services.
 */
export async function fetchAndParseCalendar(icalUrl: string): Promise<CalendarEvent[]> {
  const trimmed = icalUrl.trim();
  if (!trimmed) throw new Error('Calendar URL is required.');

  let response = await fetch(apiUrl('/api/ical-proxy'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url: trimmed }),
  });

  if (response.status === 405 || response.status === 404) {
    response = await fetch(`${apiUrl('/api/ical-proxy')}?url=${encodeURIComponent(trimmed)}`, {
      method: 'GET',
    });
  }

  if (!response.ok) {
    const errJson = await response.json().catch(() => ({} as { error?: string }));
    throw new Error(
      errJson.error || `Timetable sync failed (HTTP ${response.status})`
    );
  }

  const icsData = await response.text();
  if (!icsData || !/BEGIN:VCALENDAR/i.test(icsData)) {
    throw new Error('Timetable proxy returned an empty or invalid calendar feed.');
  }

  return parseIcsText(icsData);
}
