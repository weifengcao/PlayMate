import { Request, Response, NextFunction } from "express";
import { AuthenticatedRequest } from './AuthenticatedRequest';
import { User } from "../models/User";
import jwt, { JwtPayload } from "jsonwebtoken";

// TODO : put that in an env var, or in a common config file.
const SECRET_ACCESS_TOKEN = 'abcdef0123456789';

interface CustomJwtPayload extends JwtPayload {
  id: number;
}

export async function Verify(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        // get the session cookie from request header
        const authHeader = req.headers["cookie"];
        if (!authHeader) {
            // there is no cookie from request header,
            // we send an unauthorized response.
            console.log("There is nothing in the cookies.");
            console.log("Check the cookie config in auth.ts");
            res.sendStatus(401);
            return;
        }
        // Split cookie header to get the actual jwt
        const cookies = authHeader.split(';').map((c) => c.trim());
        const sessionCookie = cookies.find((c) => c.startsWith('SessionID='));
        if (!sessionCookie) {
            res.status(401).json({ message: "Session cookie missing." });
            return;
        }
        const cookie = sessionCookie.substring('SessionID='.length);
        // Verify using jwt to see if token has been tampered with or if it has expired.
        let decoded: string | jwt.JwtPayload | undefined;
        try {
            decoded = jwt.verify(cookie, SECRET_ACCESS_TOKEN);
        } catch (err) {
            if (err instanceof jwt.TokenExpiredError) {
                res.status(401).json({ message: "Session has expired. Please login" });
            } else {
                res.status(401).json({ message: "Unknown error when checking token." });
            }
            return;
        }
        // Get user id from the decoded token
        const { id } = decoded as CustomJwtPayload;
        const user = await User.findByPk(id);
        if (!user) {
            res.status(401).json({ message: "Please login" });
            return;
        }
        console.log("Auth ok with user id", user.id);
        const userDetailsToReturn = { name: user.name, id:user.id };
        // Put the data to return into req.user
        (req as AuthenticatedRequest).user = userDetailsToReturn;
        next();

    } catch (err) {
        res.status(500).json({
            status: "error",
            code: 500,
            data: [],
            message: "Internal Server Error",
        });
    }
}
