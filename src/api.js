// Express API
const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const fetch = require("node-fetch");
const serverless = require("serverless-http");

// Firebase
require("../utils/firebaseAdmin.js"); // initializeApp
const admin = require("firebase-admin");
const customClaims = require("../utils/customClaims.js");

const _db = admin.firestore();
const _dbSuperAdmin = _db.collection("PRIVATE_SUPER_ADMIN");
const _dbAdmins = _dbSuperAdmin.doc("admins");
const _dbOrders = _db.collection("PUBLIC_ORDERS");

// Global Variables
if (process.env.NODE_ENV_LOCAL === "development") {
  // Load local .env file in development
  require("dotenv").config();
}

const paymongoBaseUrl = "https://api.paymongo.com/v1";
const webAppBaseUrl = process.env.WEB_BASE_URL;
const publicKey = process.env.PAYMONGO_PUBLIC_KEY;
const privateKey = process.env.PAYMONGO_PRIVATE_KEY;
const superAdminEmail = process.env.SUPER_ADMIN_EMAIL;

// Log
console.log("[Paymongo API URL]", paymongoBaseUrl);
console.log("[Web App URL]", webAppBaseUrl);
console.log("[SuperAdmin Email]", superAdminEmail);

// Set a single Super Admin User
customClaims.setSuperAdmin(superAdminEmail);

// Init
const app = express();
const router = express.Router();

//#region MiddleWares
const {
  authRequired,
  superAdminAuthRequired,
} = require("../utils/middlewares.js");

const corsOptions = {
  origin: [webAppBaseUrl],
  methods: ["GET", "POST"],
};

// For development only
if (process.env.NODE_ENV_LOCAL === "development") corsOptions.origin.push("*");

app.use(bodyParser.json());
app.use(cors(corsOptions));

//#endregion

//#region ENDPOINTS

// GET Checkout URL
router.post("/payment", authRequired, async (req, res, next) => {
  if (
    !(
      req.body.uid &&
      req.body.name &&
      req.body.email &&
      req.body.phoneNumber &&
      req.body.totalPrice &&
      req.body.sourceType &&
      req.body.redirect.successUrl &&
      req.body.redirect.failedUrl
    )
  ) {
    return res.status(400).send({ errors: ["incomplete_fields"] });
  }

  console.log(req.body);

  const url = `${paymongoBaseUrl}/sources`;

  const options = {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${Buffer.from(publicKey).toString(
        "base64"
      )}:${Buffer.from(privateKey).toString("base64")}`,
    },
    body: JSON.stringify({
      data: {
        attributes: {
          amount: req.body.totalPrice * 100,
          redirect: {
            success: req.body.redirect.successUrl,
            failed: req.body.redirect.failedUrl,
          },
          billing: {
            name: req.body.name,
            email: req.body.email,
            phone: req.body.phoneNumber,
          },
          currency: "PHP",
          type: req.body.sourceType,
        },
      },
    }),
  };

  try {
    const result = await fetch(url, options);

    const paymongoResponse = await result.json();

    if (!result.ok) throw paymongoResponse;

    return res.status(200).send({
      checkout_url: paymongoResponse.data.attributes.redirect.checkout_url,
    });
  } catch (err) {
    next(err);
  }
});

// ADD Admin
router.post("/admins/", superAdminAuthRequired, async (req, res, next) => {
  if (!(req.body.token && req.body.userEmail)) {
    return res.status(400).send({ errors: ["incomplete_fields"] });
  }

  let adminToAdd = null;

  try {
    adminToAdd = await admin.auth().getUserByEmail(req.body.userEmail);
    //  If superAdmin, Add token
    await customClaims.setAdmin(req.body.userEmail, true);
  } catch (err) {
    return res.status(400).send({ errors: ["user_not_found"] });
  }

  // Add admin in admins.adminList
  try {
    _dbAdmins.update({
      adminList: admin.firestore.FieldValue.arrayUnion({
        uid: adminToAdd.uid,
        email: adminToAdd.email,
      }),
    });
  } catch (err) {
    return next(err);
  }

  return res.status(200).send({
    uid: adminToAdd.uid,
    email: adminToAdd.email,
    name: adminToAdd.displayName,
  });
});

// REMOVE Admin
router.post(
  "/admins/:uid/remove",
  superAdminAuthRequired,
  async (req, res, next) => {
    if (!req.body.token) {
      return res.status(400).send({ errors: ["incomplete_fields"] });
    }

    try {
      const adminToRemove = await admin.auth().getUser(req.params.uid);
      //  If superAdmin, Remove token
      await customClaims.setAdmin(adminToRemove.email, null);

      // Remove admin in admins.adminList
      const adminsDoc = await _dbAdmins.get();
      if (adminsDoc.exists) {
        _dbAdmins.update({
          adminList: admin.firestore.FieldValue.arrayRemove({
            uid: adminToRemove.uid,
            email: adminToRemove.email,
          }),
        });
      }

      return res.status(200).send({
        uid: adminToRemove.uid,
        email: adminToRemove.email,
        name: adminToRemove.displayName,
      });
    } catch (err) {
      return next(err);
    }
  }
);

/**
 * WEBHOOK: Paymongo source.chargeable
 * Webhooks should always end immediately and return no response
 */
router.post("/hooks/paymongo", (req, res) => {
  console.log("[RECEIVED] ", req.body);

  // Webhook Types
  switch (req.body.data.attributes.type) {
    case "source.chargeable":
      processPayment(req.body)
        .then(() => res.status(200).end())
        .catch((err) => console.error("[ERROR] ", err));
      break;
  }
});

/**
 * Use router, append before the routes /.netlify/functions/api
 * "functions": from netlify.toml
 * "api": from src/api.js. Built using `netlify-lambda build src`
 */
app.use("/.netlify/functions/api", router);

function processPayment(body) {
  const _data = body.data;
  const _sourceData = _data.attributes.data;
  const url = `${paymongoBaseUrl}/payments`;

  const options = {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Basic " + Buffer.from(privateKey).toString("base64"),
    },
    body: JSON.stringify({
      data: {
        attributes: {
          amount: _sourceData.attributes.amount,
          source: {
            type: _sourceData.type,
            id: _sourceData.id,
          },
          currency: "PHP",
        },
      },
    }),
  };

  console.log("[SEND] ", options);

  // Request Payment
  return fetch(url, options)
    .then((res) => res.json())
    .then((json) => {
      return json;
    })
    .then((paymentData) => {
      console.log("[PAYMENTDATA]", paymentData);

      // Update DB from Payment
      return _dbOrders
        .where("email", "==", paymentData.data.attributes.billing.email)
        .limit(1)
        .get()
        .then((query) => {
          if (!query.empty) {
            query.docs[0].ref.update({
              payment: {
                id: paymentData.data.id,
                amount: paymentData.data.attributes.amount,
                paid_at: paymentData.data.attributes.paid_at,
                status: paymentData.data.attributes.status,
              },
            });
          }
        })
        .catch((err) => console.log("[FIREBASE ERR]", err));
    })
    .catch((err) => console.error("[ERROR] ", err));
}

//#endregion

// Serverless Netlify Lambda
module.exports.handler = serverless(app);
