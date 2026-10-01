import { saasFetch, readJson } from './saasFetch';

export async function getGroupAnalytics(groupId: string) {
  const res = await saasFetch(`/api/analytics/group/${groupId}`);
  return readJson<{
    group: any;
    role: string;
    roster: {
      userId: string;
      role: string;
      currentStreak: number;
      longestStreak: number;
      xp: number;
      lastStudyDate: string | null;
      reviews14d: number;
    }[];
    quizScores: any[];
  }>(res);
}
