import ICAL from 'ical.js';
import { supabase } from './supabase';

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

export async function fetchAndParseCalendar(icalUrl: string): Promise<CalendarEvent[]> {
  const backendProxyUrl = `http://localhost:5000/ical-proxy?url=${encodeURIComponent(icalUrl)}`;

  const response = await fetch(backendProxyUrl);
  if (!response.ok) {
    const errJson = await response.json().catch(() => ({}));
    throw new Error(errJson.error || 'Failed to fetch timetable feed from server proxy.');
  }

  const icsData = await response.text();
  return parseIcsText(icsData);
}