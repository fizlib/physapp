const test = require('node:test');
const assert = require('node:assert/strict');
const {
  CoffeeGameSession,
  generateSlotLabels,
  hasPerfectMatching,
} = require('./coffee-game');

const students = count => Array.from({ length: count }, (_, index) => ({
  id: `student-${index + 1}`,
  name: `Student ${index + 1}`,
}));

function confirmMeeting(session, firstId, secondId, slotIndex, now = 1_000) {
  session.select(firstId, slotIndex, secondId, now);
  return session.select(secondId, slotIndex, firstId, now + 1);
}

function buildOddRoundRobinRounds(studentIds) {
  const byeMarker = '__coffee_bye__';
  let rotation = [...studentIds, byeMarker];
  const rounds = [];

  for (let roundIndex = 0; roundIndex < studentIds.length; roundIndex += 1) {
    const pairs = [];
    let byeId = null;

    for (let index = 0; index < rotation.length / 2; index += 1) {
      const firstId = rotation[index];
      const secondId = rotation[rotation.length - 1 - index];

      if (firstId === byeMarker || secondId === byeMarker) {
        byeId = firstId === byeMarker ? secondId : firstId;
      } else {
        pairs.push([firstId, secondId]);
      }
    }

    rounds.push({ byeId, pairs });
    rotation = [
      rotation[0],
      rotation[rotation.length - 1],
      ...rotation.slice(1, -1),
    ];
  }

  return rounds;
}

function completeOddSession(session, now = 1_000) {
  const roundsByBye = new Map(
    buildOddRoundRobinRounds(session.participantOrder)
      .map(round => [round.byeId, round])
  );
  let timestamp = now;

  session.byeBySlot.forEach((byeId, slotIndex) => {
    const round = roundsByBye.get(byeId);
    assert.ok(round, `expected a round for bye student ${byeId}`);

    round.pairs.forEach(([firstId, secondId]) => {
      confirmMeeting(session, firstId, secondId, slotIndex, timestamp);
      timestamp += 10;
    });
  });
}

test('generates 30-minute slot labels from 09:00', () => {
  assert.deepEqual(
    generateSlotLabels(6),
    ['09:00', '09:30', '10:00', '10:30', '11:00', '11:30']
  );
});

test('validates participant and slot limits while preserving even games', () => {
  const session = new CoffeeGameSession('classroom-1', 'teacher-1');

  assert.throws(
    () => session.start(students(1), 1),
    error => error.code === 'NOT_ENOUGH_STUDENTS'
  );
  assert.throws(
    () => session.start(students(4), 4),
    error => error.code === 'INVALID_SLOT_COUNT'
  );

  session.start(students(4), 3);
  assert.equal(session.totalMeetings, 6);
  assert.equal(session.remainingMeetings, 6);
  assert.deepEqual(session.byeBySlot, [null, null, null]);
});

test('assigns unique rotating byes and blocks meetings during a bye slot', () => {
  const session = new CoffeeGameSession('classroom-1', 'teacher-1');
  session.start(students(17), 12);

  assert.equal(session.totalMeetings, 96);
  assert.equal(session.remainingMeetings, 96);
  assert.equal(new Set(session.byeBySlot).size, 12);
  assert.equal(session.byeBySlot.includes(null), false);
  assert.equal(session.getFilledSlotCount('student-1'), 1);
  assert.equal(session.getFilledSlotCount('student-13'), 0);

  const byeId = session.byeBySlot[0];
  const availableId = session.participantOrder.find(studentId => studentId !== byeId);

  assert.throws(
    () => session.select(byeId, 0, availableId),
    error => error.code === 'BYE_SLOT'
  );
  assert.throws(
    () => session.select(availableId, 0, byeId),
    error => error.code === 'TARGET_BYE_SLOT'
  );
  assert.equal(session.isLegalPairAtSlot(byeId, availableId, 0), false);
});

test('completes odd classes with 17 and 31 students without a dead end', () => {
  for (const studentCount of [17, 31]) {
    const session = new CoffeeGameSession(`classroom-${studentCount}`, 'teacher-1');
    session.start(students(studentCount), 12);

    assert.equal(session.hasDeadEnd(), false);
    completeOddSession(session);

    assert.equal(session.status, 'won');
    assert.equal(session.confirmedMeetings, Math.floor(studentCount / 2) * 12);
    assert.equal(session.remainingMeetings, 0);
    session.participantOrder.forEach(studentId => {
      assert.equal(session.getFilledSlotCount(studentId), 12);
    });
  }
});

test('starts large classes without a 15 or 16 student cap', () => {
  for (const studentCount of [30, 31, 32]) {
    const session = new CoffeeGameSession(`classroom-${studentCount}`, 'teacher-1');
    session.start(students(studentCount), 12);

    assert.equal(session.status, 'running');
    assert.equal(session.participants.size, studentCount);
    assert.equal(session.totalMeetings, Math.floor(studentCount / 2) * 12);
    assert.equal(session.hasDeadEnd(), false);
  }
});

test('confirms only reciprocal selections for the same slot', () => {
  const session = new CoffeeGameSession('classroom-1', 'teacher-1');
  session.start(students(4), 2);

  assert.equal(session.select('student-1', 0, 'student-2', 1_000).type, 'pending');
  assert.equal(session.select('student-2', 1, 'student-1', 1_001).type, 'pending');
  assert.equal(session.confirmedMeetings, 0);

  session.cancelPending('student-2');
  const result = session.select('student-2', 0, 'student-1', 1_002);

  assert.equal(result.type, 'confirmed');
  assert.equal(session.confirmedMeetings, 1);
  assert.equal(session.getParticipant('student-1').calendar[0], 'student-2');
  assert.equal(session.getParticipant('student-2').calendar[0], 'student-1');
});

test('allows one pending choice and supports cancellation and expiry', () => {
  const session = new CoffeeGameSession('classroom-1', 'teacher-1');
  session.start(students(4), 2);

  session.select('student-1', 0, 'student-2', 5_000);
  assert.throws(
    () => session.select('student-1', 1, 'student-3', 5_001),
    error => error.code === 'PENDING_EXISTS'
  );
  assert.equal(session.cancelPending('student-1'), true);

  session.select('student-1', 0, 'student-2', 10_000);
  assert.deepEqual(session.expirePending(69_999), []);
  assert.deepEqual(session.expirePending(70_000), ['student-1']);
});

test('prevents self selection, occupied slots, and repeated partners', () => {
  const session = new CoffeeGameSession('classroom-1', 'teacher-1');
  session.start(students(4), 2);

  assert.throws(
    () => session.select('student-1', 0, 'student-1'),
    error => error.code === 'SELF_SELECTION'
  );

  confirmMeeting(session, 'student-1', 'student-2', 0);

  assert.throws(
    () => session.select('student-1', 0, 'student-3'),
    error => error.code === 'SLOT_OCCUPIED'
  );
  assert.throws(
    () => session.select('student-1', 1, 'student-2'),
    error => error.code === 'PARTNER_ALREADY_USED'
  );
  assert.throws(
    () => session.select('student-3', 0, 'student-1'),
    error => error.code === 'TARGET_SLOT_OCCUPIED'
  );
});

test('clears pending choices made invalid by a confirmation', () => {
  const session = new CoffeeGameSession('classroom-1', 'teacher-1');
  session.start(students(4), 2);

  session.select('student-3', 0, 'student-1', 1_000);
  session.select('student-1', 0, 'student-2', 1_001);
  const result = session.select('student-2', 0, 'student-1', 1_002);

  assert.equal(result.type, 'confirmed');
  assert.deepEqual(result.clearedStudentIds, ['student-3']);
  assert.equal(session.pending.has('student-3'), false);
});

test('detects a class win', () => {
  const session = new CoffeeGameSession('classroom-1', 'teacher-1');
  session.start(students(2), 1);

  const result = confirmMeeting(session, 'student-1', 'student-2', 0);

  assert.equal(result.status, 'won');
  assert.equal(session.status, 'won');
  assert.equal(session.remainingMeetings, 0);
});

test('perfect matching solver accepts completable graphs and rejects dead ends', () => {
  const vertices = ['a', 'b', 'c', 'd'];
  const cycleEdges = new Set(['a:b', 'b:c', 'c:d', 'a:d']);
  const starEdges = new Set(['a:b', 'a:c', 'a:d']);
  const edgeKey = (first, second) => [first, second].sort().join(':');

  assert.equal(
    hasPerfectMatching(vertices, (first, second) => cycleEdges.has(edgeKey(first, second))),
    true
  );
  assert.equal(
    hasPerfectMatching(vertices, (first, second) => starEdges.has(edgeKey(first, second))),
    false
  );
});

test('ends an attempt when a remaining slot has no perfect pairing', () => {
  const session = new CoffeeGameSession('classroom-1', 'teacher-1');
  session.start(students(6), 4, 'mathematical');

  confirmMeeting(session, 'student-3', 'student-4', 1, 1_000);
  confirmMeeting(session, 'student-3', 'student-5', 2, 2_000);
  confirmMeeting(session, 'student-4', 'student-5', 3, 3_000);
  const result = confirmMeeting(session, 'student-1', 'student-2', 0, 4_000);

  assert.equal(result.status, 'dead_end');
  assert.equal(session.status, 'dead_end');
  assert.equal(session.pending.size, 0);
});

test('exhausted mode continues after a mathematical dead end while legal meetings remain', () => {
  const session = new CoffeeGameSession('classroom-1', 'teacher-1');
  session.start(students(6), 4, 'exhausted');

  confirmMeeting(session, 'student-3', 'student-4', 1, 1_000);
  confirmMeeting(session, 'student-3', 'student-5', 2, 2_000);
  confirmMeeting(session, 'student-4', 'student-5', 3, 3_000);
  const result = confirmMeeting(session, 'student-1', 'student-2', 0, 4_000);

  assert.equal(session.hasDeadEnd(), true);
  assert.equal(session.hasAnyLegalMeeting(), true);
  assert.equal(result.status, 'running');
  assert.equal(session.status, 'running');
});

test('exhausted mode stops only after no legal meeting remains', () => {
  const session = new CoffeeGameSession('classroom-1', 'teacher-1');
  session.start(students(6), 4, 'exhausted');

  confirmMeeting(session, 'student-3', 'student-4', 1, 1_000);
  confirmMeeting(session, 'student-3', 'student-5', 2, 2_000);
  confirmMeeting(session, 'student-4', 'student-5', 3, 3_000);
  confirmMeeting(session, 'student-1', 'student-2', 0, 4_000);

  let timestamp = 5_000;
  while (session.status === 'running') {
    let nextMeeting = null;

    for (let slotIndex = 0; slotIndex < session.slotCount && !nextMeeting; slotIndex += 1) {
      for (
        let firstIndex = 0;
        firstIndex < session.participantOrder.length && !nextMeeting;
        firstIndex += 1
      ) {
        for (
          let secondIndex = firstIndex + 1;
          secondIndex < session.participantOrder.length;
          secondIndex += 1
        ) {
          const firstId = session.participantOrder[firstIndex];
          const secondId = session.participantOrder[secondIndex];
          if (session.isLegalPairAtSlot(firstId, secondId, slotIndex)) {
            nextMeeting = { firstId, secondId, slotIndex };
            break;
          }
        }
      }
    }

    assert.ok(nextMeeting, 'running exhausted-mode session should have a legal meeting');
    confirmMeeting(
      session,
      nextMeeting.firstId,
      nextMeeting.secondId,
      nextMeeting.slotIndex,
      timestamp
    );
    timestamp += 1_000;
  }

  assert.equal(session.status, 'dead_end');
  assert.equal(session.hasAnyLegalMeeting(), false);
  assert.ok(session.remainingMeetings > 0);
});

test('wins in either stop mode and defaults invalid modes to mathematical', () => {
  for (const stopMode of ['mathematical', 'exhausted']) {
    const session = new CoffeeGameSession(`classroom-${stopMode}`, 'teacher-1');
    session.start(students(2), 1, stopMode);
    confirmMeeting(session, 'student-1', 'student-2', 0);
    assert.equal(session.status, 'won');
  }

  const missingMode = new CoffeeGameSession('classroom-missing', 'teacher-1');
  missingMode.start(students(4), 2);
  assert.equal(missingMode.stopMode, 'mathematical');

  const invalidMode = new CoffeeGameSession('classroom-invalid', 'teacher-1');
  invalidMode.start(students(4), 2, 'unknown');
  assert.equal(invalidMode.stopMode, 'mathematical');
});
