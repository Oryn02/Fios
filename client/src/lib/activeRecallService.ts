import { supabase } from './supabase';
import type { ActiveRecallLog, RecallConcept } from '../types/db';
import { IS_DEMO } from './demo';

let demoLogs: ActiveRecallLog[] = [];

export async function getRecallLogs(): Promise<ActiveRecallLog[]> {
  if (IS_DEMO) return [...demoLogs];

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('active_recall_logs')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error loading recall logs:', error);
    return [];
  }
  return (data as ActiveRecallLog[]) || [];
}

export async function saveRecallLog(entry: {
  topic: string;
  moduleCode?: string | null;
  accuracy: number;
  content: string;
  report: RecallConcept[];
}): Promise<void> {
  if (IS_DEMO) {
    demoLogs = [
      {
        id: `demo-${Date.now()}`, user_id: 'demo', topic: entry.topic, module_code: entry.moduleCode || null,
        accuracy: entry.accuracy, content: entry.content, report: entry.report, created_at: new Date().toISOString(),
      },
      ...demoLogs,
    ];
    return;
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const { error } = await supabase.from('active_recall_logs').insert({
    user_id: user.id,
    topic: entry.topic,
    module_code: entry.moduleCode || null,
    accuracy: entry.accuracy,
    content: entry.content,
    report: entry.report,
  });
  if (error) console.error('Failed to save recall log:', error);
}
