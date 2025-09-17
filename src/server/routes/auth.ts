import { Router, CookieOptions } from 'express'

import { User, generateAccessJWT } from '../models/User'

const router = Router()

router.post('/login', async (req, res) => {
  try {
    // Get variables for the login process
    const userName = typeof req.body.username === 'string' ? req.body.username.trim() : '';
    const password = typeof req.body.password === 'string' ? req.body.password.trim() : '';
    console.log(userName);
    if (!userName || !password) {
      res.status(400).json({
        status: "failed",
        data: [],
        message: "Username and password are required.",
      });
      return;
    }
    // Check if user exists
    const user = await User.findOne({ where: {name: userName}});
    console.log("coucou");
    console.log(user);
    if (!user) {
      res.status(401).json({
        status: "failed",
        data: [],
        message:
          "Invalid email or password. Please try again with the correct credentials.",
      });
      return;
    }
    // if user exists, validate password
    const isPasswordValid = password === user.password;
    // if not valid, return unauthorized response
    if (!isPasswordValid) {
      res.status(401).json({
        status: "failed",
        data: [],
        message:
          "Invalid email or password. Please try again with the correct credentials.",
      });
      return;
    }
    const isProduction = process.env.NODE_ENV === 'production';
    let options: CookieOptions = {
      maxAge: 20 * 60 * 1000, // would expire in 20 minutes
      httpOnly: true, // The cookie is only accessible by the web server
      secure: isProduction,
      sameSite: isProduction ? "none" : "lax",
    };
    // generate session token for user
    const token = generateAccessJWT(user);
    // set the token to response header,
    // so that the client sends it back on each subsequent request
    res.cookie("SessionID", token, options);
    // return some user data
    const userDetailsToReturn = { name: user.name, email: user.email, id: user.id };
    res.status(200).json({
      status: "success",
      data: [userDetailsToReturn],
      message: "You have successfully logged in.",
    });
  } catch (err) {
      res.status(500).json({
        status: "error",
        code: 500,
        data: [],
        message: "Internal Server Error",
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
