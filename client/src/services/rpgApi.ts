import { saasFetch, readJson } from './saasFetch';

export type RpgStatus = {
  streak: {
    current_streak?: number;
    longest_streak?: number;
    xp?: number;
    skill_points?: number;
    unlocked_rewards?: string[];
    streak_freeze_until?: string | null;
    last_study_date?: string | null;
  } | null;
  xp: number;
  level: number;
  skill_points: number;
  unlocked_rewards: string[];
  streak_freeze_until: string | null;
  catalog?: { id: string; cost: number; label: string; unlocked: boolean }[];
};

export async function fetchRpgStatus(): Promise<RpgStatus> {
  const res = await saasFetch('/api/rpg/status');
  return readJson<RpgStatus>(res);
}
