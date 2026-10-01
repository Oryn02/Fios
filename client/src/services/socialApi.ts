import { saasFetch, readJson } from './saasFetch';

export async function listFriends() {
  const res = await saasFetch('/api/social/friends');
  return readJson<{ friendships: any[] }>(res);
}

export async function requestFriend(addresseeId: string) {
  const res = await saasFetch('/api/social/friends/request', {
    method: 'POST',
    body: JSON.stringify({ addresseeId }),
  });
  return readJson(res);
}

export async function respondFriend(friendshipId: string, status: 'accepted' | 'declined' | 'blocked') {
  const res = await saasFetch('/api/social/friends/respond', {
    method: 'POST',
    body: JSON.stringify({ friendshipId, status }),
  });
  return readJson(res);
}

export async function shareResource(input: {
  title: string;
  resourceType: 'deck' | 'document' | 'quiz' | 'module' | 'link';
  visibility?: 'private' | 'friends' | 'group' | 'course_bank';
  resourceId?: string;
  moduleCode?: string;
  payload?: Record<string, unknown>;
  groupId?: string;
}) {
  const res = await saasFetch('/api/social/share', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  return readJson(res);
}

export async function listCourseBank(moduleCode?: string) {
  const q = moduleCode ? `?moduleCode=${encodeURIComponent(moduleCode)}` : '';
  const res = await saasFetch(`/api/social/course-bank${q}`);
  return readJson<{ resources: any[] }>(res);
}

export async function listGroups() {
  const res = await saasFetch('/api/social/groups');
  return readJson<{ groups: any[] }>(res);
}

export async function createGroup(input: { name: string; description?: string; isClassroom?: boolean }) {
  const res = await saasFetch('/api/social/groups', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  return readJson(res);
}

export async function joinGroup(inviteCode: string) {
  const res = await saasFetch('/api/social/groups/join', {
    method: 'POST',
    body: JSON.stringify({ inviteCode }),
  });
  return readJson(res);
}
