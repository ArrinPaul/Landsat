
import * as admin from 'firebase-admin';

let db: admin.firestore.Firestore;

if (admin.apps.length === 0) {
    const creds = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;
    if (!creds) {
        throw new Error("GOOGLE_APPLICATION_CREDENTIALS_JSON environment variable not set. Please provide service account credentials in your .env file.");
    }
    const serviceAccount = JSON.parse(creds);

    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });

    db = admin.firestore();
    console.log("Firestore initialized.");
} else {
    db = admin.app().firestore();
}

export { db };
