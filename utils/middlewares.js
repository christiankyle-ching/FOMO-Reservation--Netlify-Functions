const admin = require("firebase-admin");

const authRequired = async (req, res, next) => {
  try {
    req.user = await admin.auth().getUser(req.body.uid);
    return next();
  } catch (err) {
    return res.status(401).send({ errors: ["unauthorized"] });
  }
};

const superAdminAuthRequired = async (req, res, next) => {
  let claims = null;
  let isSuperAdmin = false;

  try {
    claims = await admin.auth().verifyIdToken(req.body.token);
    isSuperAdmin = !!claims.superAdmin;

    if (isSuperAdmin) {
      req.isSuperAdmin = isSuperAdmin;
      return next();
    } else {
      return res.status(401).send({ errors: ["unauthorized"] });
    }
  } catch (err) {
    console.error(err);
    return res.status(401).send({ errors: ["unauthorized"] });
  }
};

export { authRequired, superAdminAuthRequired };
