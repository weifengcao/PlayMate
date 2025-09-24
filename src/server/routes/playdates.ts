import { Router, Request } from 'express';
import { Verify } from '../middleware/verify';
import { AuthenticatedRequest } from '../middleware/AuthenticatedRequest';
import Playdate from '../models/Playdate';
import { PlaydateParticipant } from '../models/PlaydateParticipant';
import { User } from '../models/User';
import { buildPlaydateApplicantAudit } from '../agents/tools/PlaydateAuditTools';

const router = Router();

const serializeParticipant = (participant: PlaydateParticipant) => {
  const linkedUser = (participant as any).user as User | undefined;
  return {
    id: participant.id,
    userId: participant.userId,
    role: participant.role,
    status: participant.status,
    joinedAt: participant.joinedAt ? participant.joinedAt.toISOString() : null,
    decisionNote: participant.decisionNote,
    user: linkedUser
      ? {
          id: linkedUser.id,
          name: linkedUser.name,
        }
      : undefined,
  };
};

const serializePlaydate = (playdate: Playdate) => {
  const participants = (playdate as any).participants as PlaydateParticipant[] | undefined;
  const serializedParticipants = participants ? participants.map(serializeParticipant) : [];
  const approvedGuests = serializedParticipants.filter((p) => p.role === 'guest' && p.status === 'approved').length;
  const pendingGuests = serializedParticipants.filter((p) => p.role === 'guest' && p.status === 'pending').length;

  return {
    id: playdate.id,
    title: playdate.title,
    activity: playdate.activity,
    description: playdate.description,
    locationName: playdate.locationName,
    startTime: playdate.startTime.toISOString(),
    endTime: playdate.endTime.toISOString(),
    status: playdate.status,
    maxGuests: playdate.maxGuests,
    notes: playdate.notes,
    participants: serializedParticipants,
    metrics: {
      approvedGuests,
      pendingGuests,
    },
    createdAt: playdate.createdAt.toISOString(),
    updatedAt: playdate.updatedAt.toISOString(),
  };
};

const serializeJoinedPlaydate = (participant: PlaydateParticipant) => {
  const playdate = (participant as any).playdate as Playdate;
  const host = (playdate as any).host as User | undefined;
  return {
    playdateId: playdate.id,
    participantId: participant.id,
    role: participant.role,
    status: participant.status,
    joinedAt: participant.joinedAt ? participant.joinedAt.toISOString() : null,
    decisionNote: participant.decisionNote,
    playdate: {
      id: playdate.id,
      title: playdate.title,
      activity: playdate.activity,
      description: playdate.description,
      locationName: playdate.locationName,
      startTime: playdate.startTime.toISOString(),
      endTime: playdate.endTime.toISOString(),
      status: playdate.status,
      maxGuests: playdate.maxGuests,
      notes: playdate.notes,
      host: host
        ? {
            id: host.id,
            name: host.name,
          }
        : undefined,
    },
  };
};

const requestUser = (req: Request) => (req as unknown as AuthenticatedRequest).user;

router.use(Verify);

router.get('/', async (req, res) => {
  try {
    const { id: userId } = requestUser(req);

    const hostedPlaydates = await Playdate.findAll({
      where: { hostId: userId },
      include: [
        {
          model: PlaydateParticipant,
          as: 'participants',
          include: [{ model: User, as: 'user', attributes: ['id', 'name'] }],
        },
      ],
      order: [
        ['startTime', 'ASC'],
        [{ model: PlaydateParticipant, as: 'participants' }, 'createdAt', 'ASC'],
      ],
    });

    const joinedMemberships = await PlaydateParticipant.findAll({
      where: {
        userId,
        role: 'guest',
      },
      include: [
        {
          model: Playdate,
          as: 'playdate',
          required: true,
          include: [{ model: User, as: 'host', attributes: ['id', 'name'] }],
        },
      ],
      order: [[{ model: Playdate, as: 'playdate' }, 'startTime', 'ASC']],
    });

    res.json({
      hosted: hostedPlaydates.map(serializePlaydate),
      joined: joinedMemberships.map(serializeJoinedPlaydate),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load playdates';
    res.status(500).json({ message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { id: userId } = requestUser(req);
    const {
      title,
      activity,
      description,
      locationName,
      startTime,
      endTime,
      maxGuests,
      notes,
    } = req.body ?? {};

    if (typeof title !== 'string' || title.trim().length === 0) {
      res.status(400).json({ message: 'A title is required.' });
      return;
    }

    if (typeof activity !== 'string' || activity.trim().length === 0) {
      res.status(400).json({ message: 'An activity is required.' });
      return;
    }

    if (typeof locationName !== 'string' || locationName.trim().length === 0) {
      res.status(400).json({ message: 'A location name is required.' });
      return;
    }

    const parsedStart = new Date(startTime);
    const parsedEnd = new Date(endTime);

    if (Number.isNaN(parsedStart.getTime()) || Number.isNaN(parsedEnd.getTime())) {
      res.status(400).json({ message: 'Start and end times must be valid dates.' });
      return;
    }

    if (parsedEnd <= parsedStart) {
      res.status(400).json({ message: 'End time must be after start time.' });
      return;
    }

    let guestLimit: number | null = null;
    if (maxGuests !== undefined && maxGuests !== null) {
      const parsedLimit = Number(maxGuests);
      if (!Number.isInteger(parsedLimit) || parsedLimit < 0) {
        res.status(400).json({ message: 'maxGuests must be a positive integer.' });
        return;
      }
      guestLimit = parsedLimit;
    }

    const playdate = await Playdate.create({
      hostId: userId,
      title: title.trim(),
      activity: activity.trim(),
      description: typeof description === 'string' ? description.trim() : null,
      locationName: locationName.trim(),
      startTime: parsedStart,
      endTime: parsedEnd,
      status: 'scheduled',
      maxGuests: guestLimit,
      notes: typeof notes === 'string' ? notes.trim() : null,
    });

    await PlaydateParticipant.create({
      playdateId: playdate.id,
      userId,
      role: 'host',
      status: 'approved',
      joinedAt: new Date(),
    });

    const withParticipants = await Playdate.findByPk(playdate.id, {
      include: [
        {
          model: PlaydateParticipant,
          as: 'participants',
          include: [{ model: User, as: 'user', attributes: ['id', 'name'] }],
        },
      ],
    });

    res.status(201).json(withParticipants ? serializePlaydate(withParticipants) : serializePlaydate(playdate));
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to schedule playdate';
    res.status(500).json({ message });
  }
});

router.patch('/:playdateId', async (req, res) => {
  try {
    const { id: userId } = requestUser(req);
    const playdateId = Number(req.params.playdateId);
    if (!Number.isInteger(playdateId)) {
      res.status(400).json({ message: 'Invalid playdate id.' });
      return;
    }

    const playdate = await Playdate.findByPk(playdateId);
    if (!playdate || playdate.hostId !== userId) {
      res.status(404).json({ message: 'Playdate not found or access denied.' });
      return;
    }

    const updates: Partial<Playdate> = {};
    const {
      title,
      activity,
      description,
      locationName,
      startTime,
      endTime,
      maxGuests,
      notes,
      status,
    } = req.body ?? {};

    if (title !== undefined) {
      if (typeof title !== 'string' || title.trim().length === 0) {
        res.status(400).json({ message: 'Title must be a non-empty string.' });
        return;
      }
      updates.title = title.trim();
    }

    if (activity !== undefined) {
      if (typeof activity !== 'string' || activity.trim().length === 0) {
        res.status(400).json({ message: 'Activity must be a non-empty string.' });
        return;
      }
      updates.activity = activity.trim();
    }

    if (description !== undefined) {
      updates.description = typeof description === 'string' ? description.trim() : null;
    }

    if (locationName !== undefined) {
      if (typeof locationName !== 'string' || locationName.trim().length === 0) {
        res.status(400).json({ message: 'Location name must be a non-empty string.' });
        return;
      }
      updates.locationName = locationName.trim();
    }

    if (notes !== undefined) {
      updates.notes = typeof notes === 'string' ? notes.trim() : null;
    }

    if (startTime !== undefined || endTime !== undefined) {
      const nextStart = startTime !== undefined ? new Date(startTime) : playdate.startTime;
      const nextEnd = endTime !== undefined ? new Date(endTime) : playdate.endTime;
      if (Number.isNaN(nextStart.getTime()) || Number.isNaN(nextEnd.getTime())) {
        res.status(400).json({ message: 'Start and end times must be valid dates.' });
        return;
      }
      if (nextEnd <= nextStart) {
        res.status(400).json({ message: 'End time must be after start time.' });
        return;
      }
      updates.startTime = nextStart;
      updates.endTime = nextEnd;
    }

    if (maxGuests !== undefined) {
      if (maxGuests === null) {
        updates.maxGuests = null;
      } else {
        const parsedLimit = Number(maxGuests);
        if (!Number.isInteger(parsedLimit) || parsedLimit < 0) {
          res.status(400).json({ message: 'maxGuests must be a positive integer.' });
          return;
        }
        updates.maxGuests = parsedLimit;
      }
    }

    if (status !== undefined) {
      if (status !== 'scheduled' && status !== 'closed') {
        res.status(400).json({ message: 'Status must be either scheduled or closed.' });
        return;
      }
      updates.status = status;
    }

    await playdate.update(updates);

    const withParticipants = await Playdate.findByPk(playdate.id, {
      include: [
        {
          model: PlaydateParticipant,
          as: 'participants',
          include: [{ model: User, as: 'user', attributes: ['id', 'name'] }],
        },
      ],
    });

    res.json(withParticipants ? serializePlaydate(withParticipants) : serializePlaydate(playdate));
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update playdate';
    res.status(500).json({ message });
  }
});

router.post('/:playdateId/join', async (req, res) => {
  try {
    const { id: userId } = requestUser(req);
    const playdateId = Number(req.params.playdateId);
    if (!Number.isInteger(playdateId)) {
      res.status(400).json({ message: 'Invalid playdate id.' });
      return;
    }

    const playdate = await Playdate.findByPk(playdateId, {
      include: [{ model: User, as: 'host', attributes: ['id'] }],
    });
    if (!playdate) {
      res.status(404).json({ message: 'Playdate not found.' });
      return;
    }

    if (playdate.hostId === userId) {
      res.status(400).json({ message: 'Hosts are already part of the playdate.' });
      return;
    }

    if (playdate.status === 'closed') {
      res.status(400).json({ message: 'Playdate is closed for new guests.' });
      return;
    }

    const existing = await PlaydateParticipant.findOne({
      where: { playdateId, userId },
    });

    if (existing) {
      switch (existing.status) {
        case 'approved':
          res.status(200).json({
            participant: serializeParticipant(existing),
            message: 'You are already approved for this playdate.',
          });
          return;
        case 'pending':
          res.status(200).json({
            participant: serializeParticipant(existing),
            message: 'Join request already pending.',
          });
          return;
        default:
          await existing.update({ status: 'pending', joinedAt: null, decisionNote: null, role: 'guest' });
          res.status(200).json({
            participant: serializeParticipant(existing),
            message: 'Join request resubmitted.',
          });
          return;
      }
    }

    const participant = await PlaydateParticipant.create({
      playdateId,
      userId,
      role: 'guest',
      status: 'pending',
    });

    res.status(201).json({ participant: serializeParticipant(participant) });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to submit join request';
    res.status(500).json({ message });
  }
});

router.post('/:playdateId/leave', async (req, res) => {
  try {
    const { id: userId } = requestUser(req);
    const playdateId = Number(req.params.playdateId);
    if (!Number.isInteger(playdateId)) {
      res.status(400).json({ message: 'Invalid playdate id.' });
      return;
    }

    const playdate = await Playdate.findByPk(playdateId);
    if (!playdate) {
      res.status(404).json({ message: 'Playdate not found.' });
      return;
    }

    if (playdate.hostId === userId) {
      res.status(400).json({ message: 'Hosts cannot leave their own playdate.' });
      return;
    }

    const participant = await PlaydateParticipant.findOne({ where: { playdateId, userId } });
    if (!participant) {
      res.status(404).json({ message: 'Participation record not found.' });
      return;
    }

    if (participant.status === 'left') {
      res.status(200).json({ participant: serializeParticipant(participant) });
      return;
    }

    await participant.update({ status: 'left', decisionNote: null });
    res.json({ participant: serializeParticipant(participant) });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to leave playdate';
    res.status(500).json({ message });
  }
});

router.patch('/:playdateId/participants/:participantId', async (req, res) => {
  try {
    const { id: userId } = requestUser(req);
    const playdateId = Number(req.params.playdateId);
    const participantId = Number(req.params.participantId);

    if (!Number.isInteger(playdateId) || !Number.isInteger(participantId)) {
      res.status(400).json({ message: 'Invalid identifiers provided.' });
      return;
    }

    const playdate = await Playdate.findByPk(playdateId, {
      include: [{ model: PlaydateParticipant, as: 'participants' }],
    });

    if (!playdate || playdate.hostId !== userId) {
      res.status(404).json({ message: 'Playdate not found or access denied.' });
      return;
    }

    const participantList = (playdate as any).participants as PlaydateParticipant[] | undefined;
    const participant = participantList?.find((item) => item.id === participantId);
    if (!participant) {
      res.status(404).json({ message: 'Participant not found.' });
      return;
    }

    if (participant.role === 'host') {
      res.status(400).json({ message: 'Cannot update host participation.' });
      return;
    }

    const { status, decisionNote } = req.body ?? {};
    if (status !== 'approved' && status !== 'rejected' && status !== 'pending') {
      res.status(400).json({ message: 'Status must be approved, rejected, or pending.' });
      return;
    }

    if (status === 'approved' && participant.status !== 'approved' && playdate.maxGuests != null) {
      const approvedGuests = participantList?.filter(
        (p) => p.role === 'guest' && p.status === 'approved' && p.id !== participant.id
      ).length ?? 0;
      if (approvedGuests >= playdate.maxGuests) {
        res.status(400).json({ message: 'Guest limit reached for this playdate.' });
        return;
      }
    }

    await participant.update({
      status,
      decisionNote: typeof decisionNote === 'string' ? decisionNote.trim() : null,
      joinedAt: status === 'approved' ? new Date() : participant.joinedAt,
    });

    res.json({ participant: serializeParticipant(participant) });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update participant';
    res.status(500).json({ message });
  }
});

router.get('/:playdateId/audit/:participantId', async (req, res) => {
  try {
    const { id: userId } = requestUser(req);
    const playdateId = Number(req.params.playdateId);
    const participantId = Number(req.params.participantId);

    if (!Number.isInteger(playdateId) || !Number.isInteger(participantId)) {
      res.status(400).json({ message: 'Invalid identifiers provided.' });
      return;
    }

    const playdate = await Playdate.findByPk(playdateId);
    if (!playdate || playdate.hostId !== userId) {
      res.status(404).json({ message: 'Playdate not found or access denied.' });
      return;
    }

    const participant = await PlaydateParticipant.findOne({ where: { id: participantId, playdateId } });

    if (!participant || participant.userId === userId) {
      res.status(404).json({ message: 'Participant not found.' });
      return;
    }

    const audit = await buildPlaydateApplicantAudit(userId, playdateId, participant.userId);
    if (!audit) {
      res.status(404).json({ message: 'Unable to build audit for the applicant.' });
      return;
    }

    res.json({ audit });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to build audit';
    res.status(500).json({ message });
  }
});

export default router;
