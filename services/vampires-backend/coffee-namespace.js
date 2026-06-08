const {
  CoffeeGameError,
  CoffeeGameSession,
} = require('./coffee-game');

const classroomRoom = classroomId => `coffee:classroom:${classroomId}`;
const teacherRoom = classroomId => `coffee:classroom:${classroomId}:teachers`;

function registerCoffeeNamespace({ io, supabase, authenticateSocket }) {
  const coffee = io.of('/coffee');
  const sessions = new Map();
  const presenceByClassroom = new Map();

  coffee.use(authenticateSocket);

  function getPresence(classroomId) {
    let presence = presenceByClassroom.get(classroomId);
    if (!presence) {
      presence = new Map();
      presenceByClassroom.set(classroomId, presence);
    }
    return presence;
  }

  function getSession(classroomId, teacherId = null) {
    let session = sessions.get(classroomId);
    if (!session && teacherId) {
      session = new CoffeeGameSession(classroomId, teacherId);
      sessions.set(classroomId, session);
    }
    return session || null;
  }

  async function verifyTeacherClassroom(socket, classroomId) {
    if (socket.data.profile.role !== 'teacher' || !classroomId) return null;

    const { data: classroom, error } = await supabase
      .from('classrooms')
      .select('id, teacher_id, name')
      .eq('id', classroomId)
      .eq('teacher_id', socket.data.user.id)
      .maybeSingle();

    if (error) {
      console.error('[Coffee] Failed to verify teacher classroom:', error);
    }

    return classroom || null;
  }

  async function getActiveStudentClassroom(studentId) {
    const { data: enrollment, error } = await supabase
      .from('enrollments')
      .select('classroom_id')
      .eq('student_id', studentId)
      .eq('is_active_classroom', true)
      .maybeSingle();

    if (error) {
      console.error('[Coffee] Failed to load active enrollment:', error);
    }

    return enrollment?.classroom_id || null;
  }

  function serializeProgress(session) {
    return {
      confirmedMeetings: session?.confirmedMeetings || 0,
      totalMeetings: session?.totalMeetings || 0,
      remainingMeetings: session?.remainingMeetings || 0,
    };
  }

  function serializeTeacherState(classroomId) {
    const session = getSession(classroomId);
    const presence = getPresence(classroomId);
    const connectedStudents = Array.from(presence.values())
      .map(student => ({
        id: student.id,
        name: student.name,
        participant: Boolean(session?.getParticipant(student.id)),
      }))
      .sort((first, second) => first.name.localeCompare(second.name, 'lt'));

    return {
      classroomId,
      status: session?.status || 'waiting',
      slotCount: session?.slotCount || 6,
      slotLabels: session?.slotLabels || [],
      stopMode: session?.stopMode || 'mathematical',
      connectedStudents,
      participants: (session?.participantOrder || []).map(studentId => {
        const participant = session.getParticipant(studentId);
        return {
          id: participant.id,
          name: participant.name,
          connected: presence.has(studentId),
          filledSlots: session.getFilledSlotCount(studentId),
          totalSlots: session.slotCount,
        };
      }),
      ...serializeProgress(session),
    };
  }

  function serializeStudentState(classroomId, studentId) {
    const session = getSession(classroomId);
    const participant = session?.getParticipant(studentId);
    const pending = session?.pending.get(studentId);

    return {
      classroomId,
      status: session?.status || 'waiting',
      isParticipant: Boolean(participant),
      slotCount: session?.slotCount || 6,
      slotLabels: session?.slotLabels || [],
      stopMode: session?.stopMode || 'mathematical',
      participants: participant
        ? session.participantOrder.map(participantId => {
            const item = session.getParticipant(participantId);
            return { id: item.id, name: item.name };
          })
        : [],
      calendar: participant
        ? participant.calendar.map((partnerId, slotIndex) => {
            const partner = partnerId ? session.getParticipant(partnerId) : null;
            const ownPending = pending?.slotIndex === slotIndex ? pending : null;
            const pendingTarget = ownPending
              ? session.getParticipant(ownPending.targetId)
              : null;

            return {
              slotIndex,
              label: session.slotLabels[slotIndex],
              partner: partner ? { id: partner.id, name: partner.name } : null,
              pending: ownPending && pendingTarget
                ? {
                    targetId: pendingTarget.id,
                    targetName: pendingTarget.name,
                    expiresAt: ownPending.expiresAt,
                  }
                : null,
            };
          })
        : [],
      filledSlots: session?.getFilledSlotCount(studentId) || 0,
      ...serializeProgress(session),
    };
  }

  function emitStudentState(classroomId, studentId) {
    const presence = getPresence(classroomId).get(studentId);
    if (!presence?.socketId) return;

    coffee.to(presence.socketId).emit(
      'coffee_state',
      serializeStudentState(classroomId, studentId)
    );
  }

  function emitAllStates(classroomId) {
    coffee.to(teacherRoom(classroomId)).emit(
      'coffee_state',
      serializeTeacherState(classroomId)
    );

    for (const studentId of getPresence(classroomId).keys()) {
      emitStudentState(classroomId, studentId);
    }
  }

  function emitError(socket, error) {
    const isCoffeeError = error instanceof CoffeeGameError;
    socket.emit('coffee_error', {
      code: isCoffeeError ? error.code : 'UNKNOWN_ERROR',
      message: isCoffeeError
        ? error.message
        : 'Nepavyko atlikti veiksmo. Bandykite dar kartą.',
    });

    if (!isCoffeeError) {
      console.error('[Coffee] Unexpected error:', error);
    }
  }

  function ensureCurrentStudentSocket(socket) {
    const classroomId = socket.data.classroomId;
    const presence = classroomId ? getPresence(classroomId) : null;
    const current = presence?.get(socket.data.user.id);

    if (!classroomId || current?.socketId !== socket.id) {
      throw new CoffeeGameError(
        'SESSION_REPLACED',
        'Žaidimas atidarytas kitame naršyklės lange.'
      );
    }

    return classroomId;
  }

  function schedulePendingExpiry(classroomId, studentId, selection, generation) {
    const delay = Math.max(0, selection.expiresAt - Date.now()) + 25;

    setTimeout(() => {
      const session = getSession(classroomId);
      const current = session?.pending.get(studentId);

      if (
        !session
        || session.generation !== generation
        || current?.expiresAt !== selection.expiresAt
      ) {
        return;
      }

      const expiredStudentIds = session.expirePending(Date.now());
      expiredStudentIds.forEach(expiredId => emitStudentState(classroomId, expiredId));
    }, delay);
  }

  coffee.on('connection', async socket => {
    const identity = socket.data;

    if (identity.profile.role === 'student') {
      const classroomId = await getActiveStudentClassroom(identity.user.id);
      if (!classroomId) {
        socket.emit('coffee_error', {
          code: 'NO_ACTIVE_CLASSROOM',
          message: 'Jums nepriskirta aktyvi klasė.',
        });
        return;
      }

      socket.data.classroomId = classroomId;
      socket.join(classroomRoom(classroomId));

      const presence = getPresence(classroomId);
      const previous = presence.get(identity.user.id);
      if (previous?.socketId && previous.socketId !== socket.id) {
        coffee.to(previous.socketId).emit(
          'coffee_session_replaced',
          'Žaidimas atidarytas kitame naršyklės lange.'
        );
      }

      presence.set(identity.user.id, {
        id: identity.user.id,
        name: identity.displayName,
        socketId: socket.id,
        joinedAt: previous?.joinedAt || Date.now(),
      });

      emitAllStates(classroomId);
    }

    socket.on('coffee_teacher_watch', async ({ classroomId } = {}) => {
      const classroom = await verifyTeacherClassroom(socket, classroomId);
      if (!classroom) {
        emitError(socket, new CoffeeGameError(
          'CLASSROOM_FORBIDDEN',
          'Negalite valdyti šios klasės.'
        ));
        return;
      }

      if (socket.data.classroomId && socket.data.classroomId !== classroomId) {
        socket.leave(classroomRoom(socket.data.classroomId));
        socket.leave(teacherRoom(socket.data.classroomId));
      }

      socket.data.classroomId = classroomId;
      socket.join(classroomRoom(classroomId));
      socket.join(teacherRoom(classroomId));
      getSession(classroomId, socket.data.user.id);
      socket.emit('coffee_state', serializeTeacherState(classroomId));
    });

    socket.on('coffee_start', async ({ classroomId, slotCount, stopMode } = {}) => {
      try {
        const classroom = await verifyTeacherClassroom(socket, classroomId);
        if (!classroom) {
          throw new CoffeeGameError('CLASSROOM_FORBIDDEN', 'Negalite valdyti šios klasės.');
        }

        const session = getSession(classroomId, socket.data.user.id);
        if (session.status !== 'waiting') {
          throw new CoffeeGameError(
            'ATTEMPT_ACTIVE',
            'Prieš pradėdami naują bandymą užbaikite dabartinį.'
          );
        }

        const participants = Array.from(getPresence(classroomId).values())
          .sort((first, second) => first.name.localeCompare(second.name, 'lt'))
          .map(student => ({ id: student.id, name: student.name }));

        session.start(participants, Number(slotCount), stopMode);
        emitAllStates(classroomId);
      } catch (error) {
        emitError(socket, error);
      }
    });

    socket.on('coffee_reset', async ({ classroomId } = {}) => {
      try {
        const classroom = await verifyTeacherClassroom(socket, classroomId);
        if (!classroom) {
          throw new CoffeeGameError('CLASSROOM_FORBIDDEN', 'Negalite valdyti šios klasės.');
        }

        const session = getSession(classroomId, socket.data.user.id);
        session.reset();
        emitAllStates(classroomId);
      } catch (error) {
        emitError(socket, error);
      }
    });

    socket.on('coffee_select', ({ slotIndex, targetId } = {}) => {
      try {
        const classroomId = ensureCurrentStudentSocket(socket);
        const session = getSession(classroomId);
        if (!session) {
          throw new CoffeeGameError('NOT_RUNNING', 'Šiuo metu aktyvus bandymas nevyksta.');
        }

        const result = session.select(
          socket.data.user.id,
          Number(slotIndex),
          String(targetId || '')
        );

        result.expiredStudentIds.forEach(studentId => emitStudentState(classroomId, studentId));

        if (result.type === 'confirmed') {
          emitAllStates(classroomId);
        } else {
          emitStudentState(classroomId, socket.data.user.id);
          schedulePendingExpiry(
            classroomId,
            socket.data.user.id,
            result.pending,
            session.generation
          );
        }
      } catch (error) {
        emitError(socket, error);
      }
    });

    socket.on('coffee_cancel_pending', () => {
      try {
        const classroomId = ensureCurrentStudentSocket(socket);
        const session = getSession(classroomId);
        session?.cancelPending(socket.data.user.id);
        emitStudentState(classroomId, socket.data.user.id);
      } catch (error) {
        emitError(socket, error);
      }
    });

    socket.on('disconnect', () => {
      if (socket.data.profile.role !== 'student') return;

      const classroomId = socket.data.classroomId;
      const presence = classroomId ? getPresence(classroomId) : null;
      const current = presence?.get(socket.data.user.id);

      if (current?.socketId === socket.id) {
        presence.delete(socket.data.user.id);
        if (presence.size === 0) presenceByClassroom.delete(classroomId);
        emitAllStates(classroomId);
      }
    });
  });

  return coffee;
}

module.exports = {
  registerCoffeeNamespace,
};
