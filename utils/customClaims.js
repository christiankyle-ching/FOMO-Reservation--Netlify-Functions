const admin = require("./firebaseAdmin.js");

const setSuperAdmin = async function (_email) {
  try {
    let user = null;
    user = await admin.auth().getUserByEmail(_email);

    console.log(user);

    if (user.customClaims && user.customClaims.superAdmin === true) {
      return;
    } else {
      admin.auth().setCustomUserClaims(user.uid, {
        superAdmin: true,
      });

      return;
    }
  } catch (err) {
    console.error(err);
  }
};

const setAdmin = async function (_email, _enabled) {
  try {
    let user = null;
    user = await admin.auth().getUserByEmail(_email);

    console.log(user);

    return admin.auth().setCustomUserClaims(user.uid, {
      admin: _enabled,
    });
  } catch (err) {
    throw err;
  }
};

module.exports.setAdmin = setAdmin;
module.exports.setSuperAdmin = setSuperAdmin;
