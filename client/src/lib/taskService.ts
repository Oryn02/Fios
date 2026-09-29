import { supabase } from './supabase';
import type { Task } from '../types/db';
import { IS_DEMO, demoTasks, DEMO_USER } from './demo';
import { clearEntityCache, dedupeAsync, peekEntityCache, writeEntityCache } from './entityCache';

let demoTaskState: Task[] = [...demoTasks];

const TASKS_CACHE_KEY = 'fios_cache_tasks';

export interface CreateTaskInput {
  title: string;
  /** ISO datetime — required for timed agenda placement when provided. */
  dueAt?: string | null;
  startAt?: string | null;
  /** Legacy free-text fallback */
  dueDate?: string | null;
  moduleCode?: string | null;
}

/** Sync peek for instant Overview / Modules / Tasks paint. */
export function peekCachedTasks(): Task[] | null {
  if (IS_DEMO) return [...demoTaskState];
  const cached = peekEntityCache<Task[]>(TASKS_CACHE_KEY);
  return cached ? [...cached] : null;
}

function setTasksCache(tasks: Task[]): void {
  if (IS_DEMO) return;
  writeEntityCache(TASKS_CACHE_KEY, tasks);
}

export async function getTasks(): Promise<Task[]> {
  if (IS_DEMO) return [...demoTaskState];

  return dedupeAsync('tasks', async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return peekCachedTasks() || [];

      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .order('due_at', { ascending: true, nullsFirst: false });

      if (error) {
        console.error('Error loading tasks:', error);
        return peekCachedTasks() || [];
      }
      const tasks = (data as Task[]) || [];
      setTasksCache(tasks);
      return tasks;
    } catch (err) {
      console.error('Error loading tasks:', err);
      return peekCachedTasks() || [];
    }
  });
}

export async function createTask(
  titleOrInput: string | CreateTaskInput,
  dueDate?: string,
  moduleCode?: string | null
): Promise<Task> {
  const input: CreateTaskInput =
    typeof titleOrInput === 'string'
      ? { title: titleOrInput, dueDate, moduleCode }
      : titleOrInput;

  const title = input.title.trim();
  if (!title) throw new Error('Task title is required.');

  const dueAt = input.dueAt?.trim() || null;
  const startAt = input.startAt?.trim() || null;
  const dueLabel = input.dueDate?.trim() || (dueAt ? new Date(dueAt).toLocaleString() : null);

  if (IS_DEMO) {
    const task: Task = {
      id: `demo-${Date.now()}`,
      title,
      due_date: dueLabel,
      due_at: dueAt,
      start_at: startAt,
      module_code: input.moduleCode || null,
      completed: false,
      created_at: new Date().toISOString(),
    };
    demoTaskState = [task, ...demoTaskState];
    return task;
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Authentication required.');

  const { data, error } = await supabase
    .from('tasks')
    .insert({
      user_id: user.id,
      title,
      due_date: dueLabel,
      due_at: dueAt,
      start_at: startAt,
      module_code: input.moduleCode || null,
    })
    .select()
    .single();

  if (error) throw error;
  const task = data as Task;
  setTasksCache([task, ...(peekCachedTasks() || []).filter((t) => t.id !== task.id)]);
  return task;
}

export async function updateTask(
  id: string,
  patch: Partial<Pick<Task, 'title' | 'due_at' | 'start_at' | 'due_date' | 'module_code' | 'completed'>>
): Promise<void> {
  if (IS_DEMO) {
    demoTaskState = demoTaskState.map((t) => (t.id === id ? { ...t, ...patch } : t));
    return;
  }
  const { error } = await supabase.from('tasks').update(patch).eq('id', id);
  if (error) throw error;
  const prev = peekCachedTasks() || [];
  setTasksCache(prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));
}

export async function toggleTask(id: string, completed: boolean): Promise<void> {
  return updateTask(id, { completed });
}

export async function deleteTask(id: string): Promise<void> {
  if (IS_DEMO) {
    demoTaskState = demoTaskState.filter((t) => t.id !== id);
    return;
  }
  const { error } = await supabase.from('tasks').delete().eq('id', id);
  if (error) throw error;
  setTasksCache((peekCachedTasks() || []).filter((t) => t.id !== id));
}

export function clearTasksCache(): void {
  clearEntityCache(TASKS_CACHE_KEY);
}

export { DEMO_USER };
