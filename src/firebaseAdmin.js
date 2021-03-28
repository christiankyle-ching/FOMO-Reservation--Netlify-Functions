// Firebase Admin
const admin = require("firebase-admin");
require("firebase/firestore");
require("firebase/auth");

admin.initializeApp({
  credential: admin.credential.cert({
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
    projectId: process.env.FIREBASE_PROJECT_ID,
  }),
  databaseURL: "https://proto-gringo.firebaseio.com",
});

module.exports = admin;
