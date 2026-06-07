const test = require('node:test');
const assert = require('node:assert/strict');
const { splitStudentsIntoGames } = require('./classroom-groups');

const students = (count) => Array.from({ length: count }, (_, index) => ({
  id: `student-${index + 1}`,
}));

test('keeps a small class in one game', () => {
  const groups = splitStudentsIntoGames(students(9), 10, () => 0.5);
  assert.deepEqual(groups.map((group) => group.length), [9]);
});

test('uses floor(studentCount / targetSize) games and balances leftovers', () => {
  const groups = splitStudentsIntoGames(students(23), 7, () => 0.5);
  assert.equal(groups.length, 3);
  assert.deepEqual(groups.map((group) => group.length), [8, 8, 7]);
});

test('rejects invalid minimums', () => {
  assert.throws(() => splitStudentsIntoGames(students(1), 2), /At least 2/);
  assert.throws(() => splitStudentsIntoGames(students(10), 1), /at least 2/);
});

test('allows games with two students', () => {
  const groups = splitStudentsIntoGames(students(2), 2, () => 0.5);
  assert.deepEqual(groups.map((group) => group.length), [2]);
});
