function shuffleCopy(items, random = Math.random) {
  const shuffled = [...items];

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }

  return shuffled;
}

function splitStudentsIntoGames(students, targetSize, random = Math.random) {
  if (!Number.isInteger(targetSize) || targetSize < 5) {
    throw new Error('Students per game must be a whole number of at least 5.');
  }

  if (!Array.isArray(students) || students.length < 5) {
    throw new Error('At least 5 connected students are required.');
  }

  const gameCount = Math.max(1, Math.floor(students.length / targetSize));
  const shuffled = shuffleCopy(students, random);
  const baseSize = Math.floor(shuffled.length / gameCount);
  const remainder = shuffled.length % gameCount;
  const groups = [];
  let cursor = 0;

  for (let index = 0; index < gameCount; index += 1) {
    const size = baseSize + (index < remainder ? 1 : 0);
    groups.push(shuffled.slice(cursor, cursor + size));
    cursor += size;
  }

  return groups;
}

module.exports = {
  shuffleCopy,
  splitStudentsIntoGames,
};
