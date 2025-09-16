import sequelize from '../initSeq'
import { Router } from 'express'
import { Verify } from '../middleware/verify'
import { AuthenticatedRequest } from '../middleware/AuthenticatedRequest'
import { User } from '../models/User'

const router = Router()


router.get('/latlong', Verify, async (req, res) => {
  try {
    const req_user = (req as AuthenticatedRequest).user;
    const user = await User.findOne({ where: {id: req_user.id}});
    if (user) {
      const userDetailsToReturn = {
        dogwalk_latit: user.dogwalk_latit, dogwalk_longi: user.dogwalk_longi
      };
      res.json(userDetailsToReturn);
    }
  } catch (error) {
    if (error instanceof Error) {
      res.status(500).send(error.message);
    } else {
      res.status(500).send("unknown error");
    }
  }
});

router.post('/latlong', Verify, async (req, res) => {
  try {
    const req_user = (req as AuthenticatedRequest).user;
    // It looks weird, but we need to set the latitude and longitude
    // with a modulo (180 or 90), to prevent having too big values.
    // It's better to make the database server performs the modulo,
    // instead of the Node.js server. Because the database server
    // has much less workload than Node.js.
    // It's important to split the workload, to optimize response time.
    const sqlQuery = (
      'UPDATE users SET '
      + 'dogwalk_latit = ((' + req.body.dogwalk_latit + ' * 100000)::numeric::integer % (90 * 100000))::real / 100000, '
      + 'dogwalk_longi = ((' + req.body.dogwalk_longi + ' * 100000)::numeric::integer % (180 * 100000))::real / 100000 '
      + 'WHERE id = ' + req_user.id
    );
    const [results, metadata] = await sequelize.query(sqlQuery);
    console.log("results", results);
    console.log("metadata", metadata);
    res.end();
  } catch (error) {
    if (error instanceof Error) {
      res.status(500).send(error.message);
    } else {
      res.status(500).send("unknown error");
    }
  }
});

export default router