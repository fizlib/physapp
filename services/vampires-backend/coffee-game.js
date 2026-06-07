class CoffeeGameError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'CoffeeGameError';
    this.code = code;
  }
}

function generateSlotLabels(slotCount) {
  return Array.from({ length: slotCount }, (_, index) => {
    const totalMinutes = (9 * 60) + (index * 30);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  });
}

function countBits(value) {
  let remaining = value;
  let count = 0;

  while (remaining > 0n) {
    remaining &= remaining - 1n;
    count += 1;
  }

  return count;
}

function hasPerfectMatching(items, canPair) {
  if (items.length === 0) return true;
  if (items.length % 2 !== 0) return false;

  const adjacency = items.map((item, index) => {
    let mask = 0n;

    for (let otherIndex = 0; otherIndex < items.length; otherIndex += 1) {
      if (index !== otherIndex && canPair(item, items[otherIndex])) {
        mask |= 1n << BigInt(otherIndex);
      }
    }

    return mask;
  });

  const memo = new Map();

  function search(mask) {
    if (mask === 0n) return true;

    const cacheKey = mask.toString();
    if (memo.has(cacheKey)) return memo.get(cacheKey);

    let chosenIndex = -1;
    let chosenCandidates = 0n;
    let smallestDegree = Number.POSITIVE_INFINITY;

    for (let index = 0; index < items.length; index += 1) {
      const bit = 1n << BigInt(index);
      if ((mask & bit) === 0n) continue;

      const candidates = adjacency[index] & mask;
      const degree = countBits(candidates);
      if (degree === 0) {
        memo.set(cacheKey, false);
        return false;
      }

      if (degree < smallestDegree) {
        chosenIndex = index;
        chosenCandidates = candidates;
        smallestDegree = degree;
      }
    }

    const chosenBit = 1n << BigInt(chosenIndex);
    let candidates = chosenCandidates;

    while (candidates > 0n) {
      const candidateBit = candidates & -candidates;
      const nextMask = mask & ~chosenBit & ~candidateBit;

      if (search(nextMask)) {
        memo.set(cacheKey, true);
        return true;
      }

      candidates &= candidates - 1n;
    }

    memo.set(cacheKey, false);
    return false;
  }

  const fullMask = (1n << BigInt(items.length)) - 1n;
  return search(fullMask);
}

class CoffeeGameSession {
  constructor(classroomId, teacherId) {
    this.classroomId = classroomId;
    this.teacherId = teacherId;
    this.status = 'waiting';
    this.slotCount = 6;
    this.slotLabels = generateSlotLabels(this.slotCount);
    this.participantOrder = [];
    this.participants = new Map();
    this.pending = new Map();
    this.confirmedMeetings = 0;
    this.generation = 0;
    this.finishedAt = null;
  }

  start(participants, slotCount, now = Date.now()) {
    if (!Array.isArray(participants) || participants.length < 2) {
      throw new CoffeeGameError(
        'NOT_ENOUGH_STUDENTS',
        'Žaidimui reikia bent 2 prisijungusių mokinių.'
      );
    }

    if (participants.length % 2 !== 0) {
      throw new CoffeeGameError(
        'ODD_STUDENT_COUNT',
        'Žaidimą galima pradėti tik su lyginiu mokinių skaičiumi.'
      );
    }

    const participantIds = new Set(participants.map(participant => participant.id));
    if (participantIds.size !== participants.length) {
      throw new CoffeeGameError('DUPLICATE_STUDENT', 'Mokinių sąraše yra pasikartojimų.');
    }

    const maximumSlots = Math.min(12, participants.length - 1);
    if (!Number.isInteger(slotCount) || slotCount < 1 || slotCount > maximumSlots) {
      throw new CoffeeGameError(
        'INVALID_SLOT_COUNT',
        `Pasirinkite nuo 1 iki ${maximumSlots} susitikimų laikų.`
      );
    }

    this.status = 'running';
    this.slotCount = slotCount;
    this.slotLabels = generateSlotLabels(slotCount);
    this.participantOrder = participants.map(participant => participant.id);
    this.participants = new Map(participants.map(participant => [
      participant.id,
      {
        id: participant.id,
        name: participant.name,
        calendar: Array(slotCount).fill(null),
      },
    ]));
    this.pending.clear();
    this.confirmedMeetings = 0;
    this.generation += 1;
    this.startedAt = now;
    this.finishedAt = null;
  }

  reset() {
    this.status = 'waiting';
    this.participantOrder = [];
    this.participants.clear();
    this.pending.clear();
    this.confirmedMeetings = 0;
    this.generation += 1;
    this.finishedAt = null;
  }

  get totalMeetings() {
    return (this.participants.size * this.slotCount) / 2;
  }

  get remainingMeetings() {
    return Math.max(0, this.totalMeetings - this.confirmedMeetings);
  }

  getParticipant(studentId) {
    return this.participants.get(studentId) || null;
  }

  getFilledSlotCount(studentId) {
    const participant = this.getParticipant(studentId);
    return participant ? participant.calendar.filter(Boolean).length : 0;
  }

  haveMet(firstId, secondId) {
    const first = this.getParticipant(firstId);
    return Boolean(first?.calendar.includes(secondId));
  }

  isLegalPairAtSlot(firstId, secondId, slotIndex) {
    const first = this.getParticipant(firstId);
    const second = this.getParticipant(secondId);

    return Boolean(
      first
      && second
      && firstId !== secondId
      && Number.isInteger(slotIndex)
      && slotIndex >= 0
      && slotIndex < this.slotCount
      && !first.calendar[slotIndex]
      && !second.calendar[slotIndex]
      && !this.haveMet(firstId, secondId)
    );
  }

  validateSelection(studentId, slotIndex, targetId) {
    if (this.status !== 'running') {
      throw new CoffeeGameError('NOT_RUNNING', 'Šiuo metu aktyvus bandymas nevyksta.');
    }

    const student = this.getParticipant(studentId);
    const target = this.getParticipant(targetId);

    if (!student) {
      throw new CoffeeGameError(
        'NOT_PARTICIPATING',
        'Šis bandymas jau prasidėjo. Palaukite kito bandymo.'
      );
    }

    if (!target) {
      throw new CoffeeGameError('INVALID_TARGET', 'Pasirinktas mokinys šiame bandyme nedalyvauja.');
    }

    if (studentId === targetId) {
      throw new CoffeeGameError('SELF_SELECTION', 'Negalite pasirinkti savęs.');
    }

    if (!Number.isInteger(slotIndex) || slotIndex < 0 || slotIndex >= this.slotCount) {
      throw new CoffeeGameError('INVALID_SLOT', 'Pasirinktas laikas neegzistuoja.');
    }

    if (student.calendar[slotIndex]) {
      throw new CoffeeGameError('SLOT_OCCUPIED', 'Šis laikas jūsų kalendoriuje jau užimtas.');
    }

    if (target.calendar[slotIndex]) {
      throw new CoffeeGameError(
        'TARGET_SLOT_OCCUPIED',
        'Šis laikas pasirinktam mokiniui jau užimtas.'
      );
    }

    if (this.haveMet(studentId, targetId)) {
      throw new CoffeeGameError(
        'PARTNER_ALREADY_USED',
        'Su tuo pačiu mokiniu galima susitikti tik vieną kartą.'
      );
    }
  }

  select(studentId, slotIndex, targetId, now = Date.now()) {
    const expiredStudentIds = this.expirePending(now);

    if (this.pending.has(studentId)) {
      throw new CoffeeGameError(
        'PENDING_EXISTS',
        'Pirmiausia atšaukite dabartinį laukiantį pasirinkimą.'
      );
    }

    this.validateSelection(studentId, slotIndex, targetId);

    const pendingSelection = {
      studentId,
      slotIndex,
      targetId,
      createdAt: now,
      expiresAt: now + 60_000,
    };
    this.pending.set(studentId, pendingSelection);

    const reciprocal = this.pending.get(targetId);
    if (
      !reciprocal
      || reciprocal.targetId !== studentId
      || reciprocal.slotIndex !== slotIndex
    ) {
      return {
        type: 'pending',
        pending: pendingSelection,
        expiredStudentIds,
        clearedStudentIds: [],
      };
    }

    this.pending.delete(studentId);
    this.pending.delete(targetId);

    const student = this.getParticipant(studentId);
    const target = this.getParticipant(targetId);
    student.calendar[slotIndex] = targetId;
    target.calendar[slotIndex] = studentId;
    this.confirmedMeetings += 1;

    const clearedStudentIds = this.clearInvalidPending();
    this.updateCompletionState(now);

    return {
      type: 'confirmed',
      meeting: {
        slotIndex,
        firstId: studentId,
        secondId: targetId,
      },
      expiredStudentIds,
      clearedStudentIds,
      status: this.status,
    };
  }

  cancelPending(studentId) {
    return this.pending.delete(studentId);
  }

  expirePending(now = Date.now()) {
    const expiredStudentIds = [];

    for (const [studentId, selection] of this.pending.entries()) {
      if (selection.expiresAt <= now) {
        this.pending.delete(studentId);
        expiredStudentIds.push(studentId);
      }
    }

    return expiredStudentIds;
  }

  clearInvalidPending() {
    const clearedStudentIds = [];

    for (const [studentId, selection] of this.pending.entries()) {
      if (!this.isLegalPairAtSlot(studentId, selection.targetId, selection.slotIndex)) {
        this.pending.delete(studentId);
        clearedStudentIds.push(studentId);
      }
    }

    return clearedStudentIds;
  }

  updateCompletionState(now = Date.now()) {
    if (this.confirmedMeetings === this.totalMeetings) {
      this.status = 'won';
      this.finishedAt = now;
      this.pending.clear();
      return;
    }

    if (this.hasDeadEnd()) {
      this.status = 'dead_end';
      this.finishedAt = now;
      this.pending.clear();
    }
  }

  hasDeadEnd() {
    if (this.status !== 'running') return false;

    for (let slotIndex = 0; slotIndex < this.slotCount; slotIndex += 1) {
      const unmatchedIds = this.participantOrder.filter(studentId => (
        !this.getParticipant(studentId).calendar[slotIndex]
      ));

      const completable = hasPerfectMatching(
        unmatchedIds,
        (firstId, secondId) => !this.haveMet(firstId, secondId)
      );

      if (!completable) return true;
    }

    return false;
  }
}

module.exports = {
  CoffeeGameError,
  CoffeeGameSession,
  generateSlotLabels,
  hasPerfectMatching,
};
