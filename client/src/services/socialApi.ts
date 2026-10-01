import { saasFetch, readJson } from './saasFetch';

export async function listFriends() {
  const res = await saasFetch('/api/social/friends');
  return readJson<{ friendships: any[] }>(res);
}

export async function requestFriend(input: {
  email?: string;
  addresseeId?: string;
  username?: string;
} | string) {
  const body =
    typeof input === 'string'
      ? (() => {
          const value = input.trim();
          if (!value) return {};
          if (value.includes('@')) return { email: value };
          // UUID v4-ish
          if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) {
            return { addresseeId: value };
          }
          return { username: value };
        })()
      : input;
  const res = await saasFetch('/api/social/friends/request', {
    method: 'POST',
    body: JSON.stringify(body),
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

export async function voteResource(resourceId: string, vote: 1 | -1 | 0) {
  const res = await saasFetch(`/api/social/course-bank/${encodeURIComponent(resourceId)}/vote`, {
    method: 'POST',
    body: JSON.stringify({ vote }),
  });
  return readJson<{ upvote_count?: number; downvote_count?: number; user_vote?: number; resource?: any; [k: string]: any }>(res);
}

export async function cloneResource(resourceId: string) {
  const res = await saasFetch(`/api/social/course-bank/${encodeURIComponent(resourceId)}/clone`, {
    method: 'POST',
    body: JSON.stringify({}),
  });
  return readJson<{ clone?: any; deckId?: string; title?: string; [k: string]: any }>(res);
}

export async function viewResource(resourceId: string) {
  const res = await saasFetch(`/api/social/course-bank/${encodeURIComponent(resourceId)}/view`, {
    method: 'POST',
    body: JSON.stringify({}),
  });
  return readJson<{ view_count?: number; resource?: any; [k: string]: any }>(res);
}
