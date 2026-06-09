const test = require('node:test');
const assert = require('node:assert/strict');
const { registerCoffeeNamespace } = require('./coffee-namespace');

class FakeNamespace {
  constructor() {
    this.sockets = new Map();
    this.connectionHandler = null;
  }

  use() {}

  on(event, handler) {
    if (event === 'connection') this.connectionHandler = handler;
  }

  to(target) {
    return {
      emit: (event, payload) => {
        this.sockets.get(target)?.emit(event, payload);
      },
    };
  }
}

class FakeSocket {
  constructor(namespace, identity) {
    this.id = 'socket-student-1';
    this.data = identity;
    this.joinedRooms = [];
    this.emitted = [];
    this.handlers = new Map();
    namespace.sockets.set(this.id, this);
  }

  join(room) {
    this.joinedRooms.push(room);
  }

  leave() {}

  emit(event, payload) {
    this.emitted.push({ event, payload });
  }

  on(event, handler) {
    this.handlers.set(event, handler);
  }
}

function createEnrollmentSupabase(classroomId) {
  const tables = [];
  const filters = [];

  return {
    tables,
    filters,
    from(table) {
      tables.push(table);
      return {
        select() {
          return this;
        },
        eq(column, value) {
          filters.push([column, value]);
          return this;
        },
        async maybeSingle() {
          return {
            data: { classroom_id: classroomId },
            error: null,
          };
        },
      };
    },
  };
}

test('an active enrolled student joins Coffee directly without an invite', async () => {
  const namespace = new FakeNamespace();
  const supabase = createEnrollmentSupabase('classroom-1');
  const io = {
    of(path) {
      assert.equal(path, '/coffee');
      return namespace;
    },
  };

  registerCoffeeNamespace({
    io,
    supabase,
    authenticateSocket() {},
  });

  const socket = new FakeSocket(namespace, {
    user: { id: 'student-1' },
    profile: { role: 'student' },
    displayName: 'Student One',
  });

  await namespace.connectionHandler(socket);

  assert.deepEqual(supabase.tables, ['enrollments']);
  assert.deepEqual(supabase.filters, [
    ['student_id', 'student-1'],
    ['is_active_classroom', true],
  ]);
  assert.deepEqual(socket.joinedRooms, ['coffee:classroom:classroom-1']);

  const stateEvent = socket.emitted.find(({ event }) => event === 'coffee_state');
  assert.ok(stateEvent);
  assert.equal(stateEvent.payload.classroomId, 'classroom-1');
  assert.equal(stateEvent.payload.status, 'waiting');
  assert.equal(stateEvent.payload.isParticipant, false);
});
