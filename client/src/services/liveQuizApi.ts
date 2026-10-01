import { saasFetch, readJson } from './saasFetch';

export async function createLiveQuiz(input: {
  title: string;
  questions: any[];
  displayName?: string;
  groupId?: string;
}) {
  const res = await saasFetch('/api/quiz/create', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  return readJson<{ session: any }>(res);
}

export async function joinLiveQuiz(inviteCode: string, displayName?: string) {
  const res = await saasFetch('/api/quiz/join', {
    method: 'POST',
    body: JSON.stringify({ inviteCode, displayName }),
  });
  return readJson<{ session: any }>(res);
}

export async function startLiveQuiz(sessionId: string) {
  const res = await saasFetch('/api/quiz/start', {
    method: 'POST',
    body: JSON.stringify({ sessionId }),
  });
  return readJson<{ session: any }>(res);
}

export async function submitLiveQuiz(sessionId: string, answers: any[]) {
  const res = await saasFetch('/api/quiz/submit', {
    method: 'POST',
    body: JSON.stringify({ sessionId, answers }),
  });
  return readJson<{ participant: any; score: number; total: number }>(res);
}

export async function getLiveQuiz(sessionId: string) {
  const res = await saasFetch(`/api/quiz/${sessionId}`);
  return readJson<{ session: any; participants: any[] }>(res);
}
