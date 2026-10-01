import type { Server as HttpServer } from 'node:http';
import { Server, type Socket } from 'socket.io';

const WORK_MS = 25 * 60 * 1000;
const BREAK_MS = 5 * 60 * 1000;
/** Body Doubling silent focus block */
const BUDDY_FOCUS_MS = 50 * 60 * 1000;

type TimerPhase = 'idle' | 'work' | 'break';
type BuddyPhase = 'waiting' | 'focus' | 'checkin';

type RoomMember = {
  socketId: string;
  userId?: string;
  displayName: string;
  studyingTopic?: string;
  goal?: string;
};

type RoomState = {
  code: string;
  hostId: string;
  topic: string;
  phase: TimerPhase;
  endsAt: number | null;
  startedAt: number | null;
  members: Map<string, RoomMember>;
};

type BuddyRoom = {
  code: string;
  moduleCode: string;
  phase: BuddyPhase;
  endsAt: number | null;
  startedAt: number | null;
  members: Map<string, RoomMember>;
};

const rooms = new Map<string, RoomState>();
const buddyRooms = new Map<string, BuddyRoom>();

function publicState(room: RoomState) {
  return {
    code: room.code,
    hostId: room.hostId,
    topic: room.topic,
    phase: room.phase,
    endsAt: room.endsAt,
    startedAt: room.startedAt,
    remainingMs:
      room.endsAt != null ? Math.max(0, room.endsAt - Date.now()) : null,
    presence: [...room.members.values()].map((m) => ({
      socketId: m.socketId,
      userId: m.userId,
      displayName: m.displayName,
      studyingTopic: m.studyingTopic,
    })),
  };
}

function publicBuddy(room: BuddyRoom) {
  return {
    code: room.code,
    moduleCode: room.moduleCode,
    phase: room.phase,
    endsAt: room.endsAt,
    startedAt: room.startedAt,
    remainingMs:
      room.endsAt != null ? Math.max(0, room.endsAt - Date.now()) : null,
    members: [...room.members.values()].map((m) => ({
      socketId: m.socketId,
      userId: m.userId,
      displayName: m.displayName,
      goal: m.goal,
    })),
  };
}

function getOrCreateRoom(code: string, hostSocketId: string, topic = ''): RoomState {
  const key = code.toUpperCase();
  let room = rooms.get(key);
  if (!room) {
    room = {
      code: key,
      hostId: hostSocketId,
      topic,
      phase: 'idle',
      endsAt: null,
      startedAt: null,
      members: new Map(),
    };
    rooms.set(key, room);
  }
  return room;
}

function tickRoom(io: Server, room: RoomState) {
  if (room.phase === 'idle' || room.endsAt == null) return;
  if (Date.now() < room.endsAt) return;

  if (room.phase === 'work') {
    room.phase = 'break';
    room.startedAt = Date.now();
    room.endsAt = Date.now() + BREAK_MS;
  } else if (room.phase === 'break') {
    room.phase = 'idle';
    room.startedAt = null;
    room.endsAt = null;
  }
  io.to(room.code).emit('lounge:state', publicState(room));
}

function tickBuddy(io: Server, room: BuddyRoom) {
  if (room.phase !== 'focus' || room.endsAt == null) return;
  if (Date.now() < room.endsAt) return;
  room.phase = 'checkin';
  room.endsAt = null;
  io.to(room.code).emit('buddy:state', publicBuddy(room));
  io.to(room.code).emit('buddy:checkin', {
    message: 'Focus block complete — share how it went (chat unlocked).',
  });
}

/**
 * Attach Socket.io lounge + focus-buddy server to an HTTP server.
 * Lounge: join/leave, shared Pomodoro, chat (blocked during work), presence.
 * Buddy: match by moduleCode, 50m silent timer, goals, end check-in chat only.
 */
export function attachLounge(httpServer: HttpServer): Server {
  const io = new Server(httpServer, {
    path: '/lounge',
    cors: { origin: true, methods: ['GET', 'POST'] },
  });

  const interval = setInterval(() => {
    for (const room of rooms.values()) {
      try {
        tickRoom(io, room);
      } catch {
        /* ignore */
      }
    }
    for (const room of buddyRooms.values()) {
      try {
        tickBuddy(io, room);
      } catch {
        /* ignore */
      }
    }
  }, 1000);
  interval.unref?.();

  io.on('connection', (socket: Socket) => {
    let joinedCode: string | null = null;
    let buddyRoom: string | null = null;

    socket.on(
      'lounge:join',
      (payload: {
        code?: string;
        displayName?: string;
        userId?: string;
        studyingTopic?: string;
        topic?: string;
      }) => {
        try {
          const code = String(payload?.code || '')
            .trim()
            .toUpperCase()
            .slice(0, 12);
          if (!code) {
            socket.emit('lounge:error', { error: 'code required' });
            return;
          }
          if (joinedCode) {
            leaveRoom(io, socket, joinedCode);
            joinedCode = null;
          }
          const room = getOrCreateRoom(code, socket.id, String(payload?.topic || ''));
          if (payload?.topic) room.topic = String(payload.topic);
          const member: RoomMember = {
            socketId: socket.id,
            userId: payload?.userId ? String(payload.userId) : undefined,
            displayName: String(payload?.displayName || 'Student').slice(0, 40),
            studyingTopic: payload?.studyingTopic
              ? String(payload.studyingTopic).slice(0, 80)
              : undefined,
          };
          room.members.set(socket.id, member);
          socket.join(code);
          joinedCode = code;
          io.to(code).emit('lounge:state', publicState(room));
          socket.emit('lounge:joined', publicState(room));
        } catch (err) {
          socket.emit('lounge:error', {
            error: err instanceof Error ? err.message : 'Join failed',
          });
        }
      }
    );

    // ---- Body Doubling / Focus Buddy (50m silent, goals, end check-in chat) ----
    socket.on(
      'buddy:find',
      (payload: {
        moduleCode?: string;
        displayName?: string;
        userId?: string;
        goal?: string;
      }) => {
        try {
          const moduleCode = String(payload?.moduleCode || 'GENERAL')
            .trim()
            .toUpperCase()
            .slice(0, 24) || 'GENERAL';
          const displayName = String(payload?.displayName || 'Student').slice(0, 40);
          const userId = payload?.userId ? String(payload.userId) : undefined;
          const goal = payload?.goal ? String(payload.goal).slice(0, 200) : undefined;

          // Leave prior buddy room
          if (buddyRoom) {
            leaveBuddy(io, socket, buddyRoom);
            buddyRoom = null;
          }

          // Match waiting queue for this module
          let room = [...buddyRooms.values()].find(
            (r) =>
              r.moduleCode === moduleCode &&
              r.phase === 'waiting' &&
              r.members.size < 2
          );
          if (!room) {
            const code = `BD-${moduleCode.slice(0, 8)}-${Math.random().toString(36).slice(2, 6)}`.toUpperCase();
            room = {
              code,
              moduleCode,
              phase: 'waiting',
              endsAt: null,
              startedAt: null,
              members: new Map(),
            };
            buddyRooms.set(code, room);
          }

          room.members.set(socket.id, {
            socketId: socket.id,
            userId,
            displayName,
            goal,
          });
          socket.join(room.code);
          buddyRoom = room.code;

          if (room.members.size >= 2) {
            room.phase = 'focus';
            room.startedAt = Date.now();
            room.endsAt = Date.now() + BUDDY_FOCUS_MS;
          }

          io.to(room.code).emit('buddy:state', publicBuddy(room));
          socket.emit('buddy:matched', publicBuddy(room));
        } catch (err) {
          socket.emit('buddy:error', {
            error: err instanceof Error ? err.message : 'Buddy match failed',
          });
        }
      }
    );

    socket.on('buddy:goal', (payload: { goal?: string }) => {
      if (!buddyRoom) return;
      const room = buddyRooms.get(buddyRoom);
      if (!room) return;
      const member = room.members.get(socket.id);
      if (!member) return;
      member.goal = String(payload?.goal || '').slice(0, 200);
      io.to(buddyRoom).emit('buddy:state', publicBuddy(room));
    });

    socket.on('buddy:leave', () => {
      if (buddyRoom) {
        leaveBuddy(io, socket, buddyRoom);
        buddyRoom = null;
      }
    });

    socket.on('buddy:chat', (payload: { text?: string }) => {
      if (!buddyRoom) return;
      const room = buddyRooms.get(buddyRoom);
      if (!room) return;
      // Chat only during check-in (after focus) or waiting
      if (room.phase === 'focus') {
        socket.emit('buddy:error', {
          error: 'Silent focus — chat unlocks at the end check-in',
          code: 'BUDDY_SILENT',
        });
        return;
      }
      const text = String(payload?.text || '').trim().slice(0, 500);
      if (!text) return;
      const member = room.members.get(socket.id);
      io.to(buddyRoom).emit('buddy:chat', {
        text,
        at: new Date().toISOString(),
        from: {
          socketId: socket.id,
          displayName: member?.displayName || 'Student',
          userId: member?.userId,
        },
      });
    });

    socket.on('buddy:sync', () => {
      if (!buddyRoom) return;
      const room = buddyRooms.get(buddyRoom);
      if (room) socket.emit('buddy:state', publicBuddy(room));
    });

    socket.on('lounge:leave', () => {
      if (joinedCode) {
        leaveRoom(io, socket, joinedCode);
        joinedCode = null;
      }
    });

    socket.on(
      'lounge:presence',
      (payload: { studyingTopic?: string; displayName?: string }) => {
        if (!joinedCode) return;
        const room = rooms.get(joinedCode);
        if (!room) return;
        const member = room.members.get(socket.id);
        if (!member) return;
        if (payload?.studyingTopic != null) {
          member.studyingTopic = String(payload.studyingTopic).slice(0, 80);
        }
        if (payload?.displayName) {
          member.displayName = String(payload.displayName).slice(0, 40);
        }
        io.to(joinedCode).emit('lounge:state', publicState(room));
      }
    );

    socket.on('lounge:timer:start', (payload?: { phase?: 'work' | 'break' }) => {
      if (!joinedCode) return;
      const room = rooms.get(joinedCode);
      if (!room) return;
      const phase = payload?.phase === 'break' ? 'break' : 'work';
      room.phase = phase;
      room.startedAt = Date.now();
      room.endsAt = Date.now() + (phase === 'work' ? WORK_MS : BREAK_MS);
      io.to(joinedCode).emit('lounge:state', publicState(room));
    });

    socket.on('lounge:timer:pause', () => {
      if (!joinedCode) return;
      const room = rooms.get(joinedCode);
      if (!room) return;
      room.phase = 'idle';
      room.endsAt = null;
      room.startedAt = null;
      io.to(joinedCode).emit('lounge:state', publicState(room));
    });

    socket.on('lounge:timer:skip', () => {
      if (!joinedCode) return;
      const room = rooms.get(joinedCode);
      if (!room) return;
      if (room.phase === 'work') {
        room.phase = 'break';
        room.startedAt = Date.now();
        room.endsAt = Date.now() + BREAK_MS;
      } else {
        room.phase = 'idle';
        room.startedAt = null;
        room.endsAt = null;
      }
      io.to(joinedCode).emit('lounge:state', publicState(room));
    });

    socket.on('lounge:chat', (payload: { text?: string }) => {
      if (!joinedCode) return;
      const room = rooms.get(joinedCode);
      if (!room) return;
      if (room.phase === 'work') {
        socket.emit('lounge:error', {
          error: 'Chat is paused during focus (work) mode',
          code: 'CHAT_FOCUS_LOCK',
        });
        return;
      }
      const text = String(payload?.text || '').trim().slice(0, 500);
      if (!text) return;
      const member = room.members.get(socket.id);
      io.to(joinedCode).emit('lounge:chat', {
        text,
        at: new Date().toISOString(),
        from: {
          socketId: socket.id,
          displayName: member?.displayName || 'Student',
          userId: member?.userId,
        },
      });
    });

    socket.on('lounge:sync', () => {
      if (!joinedCode) return;
      const room = rooms.get(joinedCode);
      if (room) socket.emit('lounge:state', publicState(room));
    });

    socket.on('disconnect', () => {
      if (joinedCode) {
        leaveRoom(io, socket, joinedCode);
        joinedCode = null;
      }
      if (buddyRoom) {
        leaveBuddy(io, socket, buddyRoom);
        buddyRoom = null;
      }
    });
  });

  return io;
}

function leaveRoom(io: Server, socket: Socket, code: string) {
  const room = rooms.get(code);
  if (!room) return;
  room.members.delete(socket.id);
  socket.leave(code);
  if (room.members.size === 0) {
    rooms.delete(code);
    return;
  }
  if (room.hostId === socket.id) {
    const next = room.members.values().next().value as RoomMember | undefined;
    if (next) room.hostId = next.socketId;
  }
  io.to(code).emit('lounge:state', publicState(room));
}

function leaveBuddy(io: Server, socket: Socket, code: string) {
  const room = buddyRooms.get(code);
  if (!room) return;
  room.members.delete(socket.id);
  socket.leave(code);
  if (room.members.size === 0) {
    buddyRooms.delete(code);
    return;
  }
  io.to(code).emit('buddy:state', publicBuddy(room));
}

export default attachLounge;
