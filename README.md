# Prototype - Gringo

## Deployment Notes

### Accounts

1. Create new Gmail for Gringo Web App only.
2. Create Facebook account with that Gmail.
3. Create Paymongo account with that Gmail.

### App

1. Create Firebase Project.
2. Enable Auth (Facebook & Email)
3. Set Email and Password of Super Admin.
4. Deploy to Netlify Functions. Set Environment Variables:

```
FIREBASE_CLIENT_EMAIL (from Google Private Key JSON)
FIREBASE_PRIVATE_KEY (from Google Private Key JSON)
FIREBASE_PROJECT_ID (from Google Private Key JSON)
SUPER_ADMIN_EMAIL (set superAdmin Email)
WEB_BASE_URL (from deployed Front-End App)
PAYMONGO_PUBLIC_KEY (from Paymongo Dashboard)
PAYMONGO_PRIVATE_KEY (from Paymongo Dashboard)
```
