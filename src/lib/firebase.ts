import admin from 'firebase-admin';

let db: admin.firestore.Firestore | null = null;

/**
 * Gets the initialized Firestore instance.
 * Initializes it on first call if not already initialized.
 * This prevents crashes on import when credentials are missing.
 */
export function getFirestore(): admin.firestore.Firestore {
    if (db) return db;

    if (!admin.apps || admin.apps.length === 0) {
        const creds = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;
        if (!creds) {
            console.error("GOOGLE_APPLICATION_CREDENTIALS_JSON environment variable not set.");
            throw new Error("Firestore unavailable: Missing credentials.");
        }
        
        try {
            // Support both direct JSON string and escaped JSON string
            const serviceAccount = JSON.parse(creds.trim());
            
            // Basic structural validation
            if (!serviceAccount.project_id || !serviceAccount.private_key) {
                 throw new Error("Invalid service account JSON structure: Missing project_id or private_key.");
            }

            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount)
            });

            db = admin.firestore();
            console.log("Firestore initialized successfully.");
        } catch (e: any) {
            console.error("Failed to initialize Firebase:", e.message);
            throw new Error(`Firestore unavailable: ${e.message}`);
        }
    } else {
        db = admin.app().firestore();
    }

    return db;
}