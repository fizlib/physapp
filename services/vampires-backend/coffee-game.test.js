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

test('generates 30-minute slot labels from 09:00', () => {
  assert.deepEqual(
    generateSlotLabels(6),
    ['09:00', '09:30', '10:00', '10:30', '11:00', '11:30']
  );
});

test('validates participant parity and slot limits', () => {
  const session = new CoffeeGameSession('classroom-1', 'teacher-1');

  assert.throws(
    () => session.start(students(3), 2),
    error => error.code === 'ODD_STUDENT_COUNT'
  );
  assert.throws(
    () => session.start(students(4), 4),
    error => error.code === 'INVALID_SLOT_COUNT'
  );

  session.start(students(4), 3);
  assert.equal(session.totalMeetings, 6);
  assert.equal(session.remainingMeetings, 6);
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
  session.start(students(6), 4);

  confirmMeeting(session, 'student-3', 'student-4', 1, 1_000);
  confirmMeeting(session, 'student-3', 'student-5', 2, 2_000);
  confirmMeeting(session, 'student-4', 'student-5', 3, 3_000);
  const result = confirmMeeting(session, 'student-1', 'student-2', 0, 4_000);

  assert.equal(result.status, 'dead_end');
  assert.equal(session.status, 'dead_end');
  assert.equal(session.pending.size, 0);
});
