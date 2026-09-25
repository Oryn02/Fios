import { supabase } from './supabase';
import type { Task } from '../types/db';
import { IS_DEMO, demoTasks, DEMO_USER } from './demo';

let demoTaskState: Task[] = [...demoTasks];

export async function getTasks(): Promise<Task[]> {
  if (IS_DEMO) return [...demoTaskState];

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error loading tasks:', error);
    return [];
  }
  return (data as Task[]) || [];
}

export async function createTask(
  title: string,
  dueDate?: string,
  moduleCode?: string | null
): Promise<Task> {
  if (IS_DEMO) {
    const task: Task = {
      id: `demo-${Date.now()}`,
      title,
      due_date: dueDate || null,
      module_code: moduleCode || null,
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
      title: title.trim(),
      due_date: dueDate?.trim() || null,
      module_code: moduleCode || null,
    })
    .select()
    .single();

  if (error) throw error;
  return data as Task;
}

export async function toggleTask(id: string, completed: boolean): Promise<void> {
  if (IS_DEMO) {
    demoTaskState = demoTaskState.map((t) => (t.id === id ? { ...t, completed } : t));
    return;
  }
  const { error } = await supabase.from('tasks').update({ completed }).eq('id', id);
  if (error) throw error;
}

export async function deleteTask(id: string): Promise<void> {
  if (IS_DEMO) {
    demoTaskState = demoTaskState.filter((t) => t.id !== id);
    return;
  }
  const { error } = await supabase.from('tasks').delete().eq('id', id);
  if (error) throw error;
}

export { DEMO_USER };
