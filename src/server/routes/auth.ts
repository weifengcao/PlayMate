import { Router, CookieOptions, Response } from 'express';
import { Op } from 'sequelize';

import { User, generateAccessJWT } from '../models/User';
import { clearChallenge, createChallenge, verifyChallenge } from '../utils/mfaStore';

const router = Router();

const isProduction = process.env.NODE_ENV === 'production';

const defaultUserVerificationCodes: Record<string, string> = {
  'jill@jungle.com': '112233',
  'brad@foursfield.com': '223344',
  'cathy@comics.com': '334455',
  'dilb@company.com': '445566',
};

const cookieOptions: CookieOptions = {
  maxAge: 20 * 60 * 1000,
  httpOnly: true,
  secure: isProduction,
  sameSite: isProduction ? 'none' : 'lax',
};

const sendLoginSuccess = (res: Response, user: User) => {
  const token = generateAccessJWT(user);
  res.cookie('SessionID', token, cookieOptions);
  const userDetailsToReturn = { name: user.name, email: user.email, id: user.id };
  res.status(200).json({
    status: 'success',
    data: [userDetailsToReturn],
    message: 'You have successfully logged in.',
  });
};

const resolveDevOverrideCode = (user: User) => {
  if (isProduction) {
    return undefined;
  }
  return defaultUserVerificationCodes[user.email.toLowerCase()] ?? undefined;
};

const respondMfaRequired = (
  res: Response,
  user: User,
  code: string,
  statusCode = 202
) => {
  res.status(statusCode).json({
    status: 'mfa_required',
    data: [{ userId: user.id, email: user.email, name: user.name }],
    message: 'Additional verification required to finish signing in.',
    debugCode: isProduction ? undefined : code,
  });
};

router.post('/login', async (req, res) => {
  try {
    const identifier = typeof req.body.identifier === 'string'
      ? req.body.identifier.trim()
      : '';
    const username = typeof req.body.username === 'string' ? req.body.username.trim() : '';
    const email = typeof req.body.email === 'string' ? req.body.email.trim() : '';
    const password = typeof req.body.password === 'string' ? req.body.password.trim() : '';

    const credential = identifier || email || username;

    if (!credential || !password) {
      res.status(400).json({
        status: 'failed',
        data: [],
        message: 'A username or email and password are required.',
      });
      return;
    }

    const user = await User.findOne({
      where: {
        [Op.or]: [{ name: credential }, { email: credential }],
      },
    });

    if (!user) {
      res.status(401).json({
        status: 'failed',
        data: [],
        message: 'Invalid email or password. Please try again with the correct credentials.',
      });
      return;
    }

    const isPasswordValid = password === user.password;
    if (!isPasswordValid) {
      res.status(401).json({
        status: 'failed',
        data: [],
        message: 'Invalid email or password. Please try again with the correct credentials.',
      });
      return;
    }

    if (!user.mfaVerified) {
      const code = createChallenge(user.id, resolveDevOverrideCode(user));
      respondMfaRequired(res, user, code);
      return;
    }

    user.lastLoginAt = new Date();
    await user.save();
    sendLoginSuccess(res, user);
  } catch (err) {
    res.status(500).json({
      status: 'error',
      code: 500,
      data: [],
      message: 'Internal Server Error',
    });
  }
  res.end();
});

router.post('/signup', async (req, res) => {
  try {
    const name = typeof req.body.name === 'string' ? req.body.name.trim() : '';
    const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    const password = typeof req.body.password === 'string' ? req.body.password.trim() : '';

    if (!name || !email || !password) {
      res.status(400).json({
        status: 'failed',
        data: [],
        message: 'Name, email, and password are required to create an account.',
      });
      return;
    }

    const duplicateUser = await User.findOne({
      where: {
        [Op.or]: [{ email }, { name }],
      },
    });

    if (duplicateUser) {
      res.status(409).json({
        status: 'failed',
        data: [],
        message: 'An account with that email or username already exists.',
      });
      return;
    }

    const user = await User.create({
      name,
      email,
      password,
      playdate_latit: 0,
      playdate_longi: 0,
      mfaVerified: false,
      lastLoginAt: null,
    });

    const code = createChallenge(user.id);
    respondMfaRequired(res, user, code, 201);
  } catch (err) {
    res.status(500).json({
      status: 'error',
      code: 500,
      data: [],
      message: 'Internal Server Error',
    });
  }
  res.end();
});

router.post('/mfa/verify', async (req, res) => {
  try {
    const userId = Number(req.body.userId);
    const code = typeof req.body.code === 'string' ? req.body.code.trim() : '';

    if (!Number.isFinite(userId) || !code) {
      res.status(400).json({
        status: 'failed',
        data: [],
        message: 'A valid user id and MFA code are required.',
      });
      return;
    }

    const user = await User.findByPk(userId);
    if (!user) {
      res.status(404).json({
        status: 'failed',
        data: [],
        message: 'User not found.',
      });
      return;
    }

    const isValid = verifyChallenge(user.id, code);
    if (!isValid) {
      res.status(401).json({
        status: 'failed',
        data: [],
        message: 'Invalid or expired verification code.',
      });
      return;
    }

    user.mfaVerified = true;
    user.lastLoginAt = new Date();
    await user.save();
    sendLoginSuccess(res, user);
  } catch (err) {
    res.status(500).json({
      status: 'error',
      code: 500,
      data: [],
      message: 'Internal Server Error',
    });
  }
  res.end();
});

router.post('/mfa/resend', async (req, res) => {
  try {
    const userId = Number(req.body.userId);
    if (!Number.isFinite(userId)) {
      res.status(400).json({
        status: 'failed',
        data: [],
        message: 'A valid user id is required to resend the code.',
      });
      return;
    }

    const user = await User.findByPk(userId);
    if (!user) {
      res.status(404).json({
        status: 'failed',
        data: [],
        message: 'User not found.',
      });
      return;
    }

    if (user.mfaVerified) {
      res.status(200).json({
        status: 'success',
        message: 'MFA already completed for this account.',
      });
      return;
    }

    const code = createChallenge(user.id, resolveDevOverrideCode(user));
    respondMfaRequired(res, user, code);
  } catch (err) {
    res.status(500).json({
      status: 'error',
      code: 500,
      data: [],
      message: 'Internal Server Error',
    });
  }
  res.end();
});

const supportedProviders = new Set(['google', 'facebook', 'apple']);

router.post('/login/social', async (req, res) => {
  try {
    const provider = typeof req.body.provider === 'string' ? req.body.provider.trim().toLowerCase() : '';
    const email = typeof req.body.email === 'string' ? req.body.email.trim() : '';
    const name = typeof req.body.name === 'string' ? req.body.name.trim() : '';

    if (!supportedProviders.has(provider)) {
      res.status(400).json({
        status: 'failed',
        data: [],
        message: 'Unsupported social provider.',
      });
      return;
    }

    if (!email) {
      res.status(400).json({
        status: 'failed',
        data: [],
        message: 'An email address is required for social sign-in.',
      });
      return;
    }

    const displayName = name || email.split('@')[0];

    let user = await User.findOne({
      where: {
        [Op.or]: [{ email }, { name: displayName }],
      },
    });

    if (!user) {
      user = await User.create({
        name: displayName,
        email,
        password: provider,
        playdate_latit: 0,
        playdate_longi: 0,
        mfaVerified: true,
        lastLoginAt: new Date(),
      });
    } else {
      user.mfaVerified = true;
      user.lastLoginAt = new Date();
      await user.save();
    }

    clearChallenge(user.id);
    sendLoginSuccess(res, user);
  } catch (err) {
    res.status(500).json({
      status: 'error',
      code: 500,
      data: [],
      message: 'Internal Server Error',
    });
  }
  res.end();
});

router.get('/logout', async (req, res) => {
  try {
    console.log("clearing cookies because logout.");
    // Clear request cookie on client
    res.setHeader('Clear-Site-Data', '"cookies"');
    res.status(200).json({ message: 'You are logged out!' });
  } catch (err) {
    res.status(500).json({
      status: 'error',
      message: 'Internal Server Error',
    });
  }
  res.end();
});

export default router
