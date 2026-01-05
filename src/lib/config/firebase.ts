import admin, { ServiceAccount } from "firebase-admin";

let firebaseApp: admin.app.App;

/**
 * Escapes control characters in JSON string values
 * This fixes cases where the JSON has literal newlines/tabs in string fields
 */
function escapeControlCharsInJsonStrings(jsonString: string): string {
  let result = "";
  let inString = false;
  let escapeNext = false;

  for (let i = 0; i < jsonString.length; i++) {
    const char = jsonString[i];
    const charCode = char.charCodeAt(0);

    if (escapeNext) {
      result += char;
      escapeNext = false;
      continue;
    }

    if (char === "\\") {
      result += char;
      escapeNext = true;
      continue;
    }

    if (char === '"') {
      inString = !inString;
      result += char;
      continue;
    }

    if (inString) {
      if (charCode < 32 && char !== "\n" && char !== "\r" && char !== "\t") {
        result += `\\u${charCode.toString(16).padStart(4, "0")}`;
      } else if (char === "\n") {
        result += "\\n";
      } else if (char === "\r") {
        result += "\\r";
      } else if (char === "\t") {
        result += "\\t";
      } else {
        result += char;
      }
    } else {
      result += char;
    }
  }

  return result;
}

export const initializeFirebase = (): admin.app.App => {
  if (firebaseApp) {
    return firebaseApp;
  }

  try {
    if (admin.apps.length > 0) {
      firebaseApp = admin.apps[0]!;
      return firebaseApp;
    }

    // Validate required environment variable
    if (!process.env.FIREBASE_SERVICE_ACCOUNT) {
      throw new Error(
        "FIREBASE_SERVICE_ACCOUNT environment variable is required",
      );
    }

    // Parse service account from environment variable
    let serviceAccount: ServiceAccount;
    try {
      const serviceAccountString = process.env.FIREBASE_SERVICE_ACCOUNT.trim();

      try {
        serviceAccount = JSON.parse(serviceAccountString) as ServiceAccount;
      } catch (firstError: any) {
        try {
          const withNewlines = serviceAccountString.replace(/\\n/g, "\n");
          serviceAccount = JSON.parse(withNewlines) as ServiceAccount;
        } catch (secondError: any) {
          try {
            const escaped =
              escapeControlCharsInJsonStrings(serviceAccountString);
            serviceAccount = JSON.parse(escaped) as ServiceAccount;
          } catch (thirdError: any) {
            console.error("First parse attempt failed:", firstError.message);
            console.error("Second parse attempt failed:", secondError.message);
            console.error("Third parse attempt failed:", thirdError.message);
            throw new Error(
              `Failed to parse FIREBASE_SERVICE_ACCOUNT JSON. ` +
                `Common issues:\n` +
                `1. The JSON has literal newlines in the private_key field - they must be escaped as \\n\n` +
                `2. The JSON is not properly formatted\n\n` +
                `Example of correct format:\n` +
                `"private_key": "-----BEGIN PRIVATE KEY-----\\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...\\n-----END PRIVATE KEY-----\\n"\n\n` +
                `Original error: ${thirdError.message}`,
            );
          }
        }
      }
    } catch (parseError: any) {
      console.error("Failed to parse FIREBASE_SERVICE_ACCOUNT:", parseError);
      throw parseError instanceof Error
        ? parseError
        : new Error(
            `Invalid FIREBASE_SERVICE_ACCOUNT format: ${parseError.message || "Unknown error"}`,
          );
    }

    // Initialize Firebase Admin SDK
    firebaseApp = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: process.env.FIREBASE_PROJECT_ID,
    });

    console.warn("Firebase Admin SDK: Initialized successfully");
    return firebaseApp;
  } catch (error) {
    console.error("Failed to initialize Firebase Admin SDK:", error);
    throw new Error("Firebase initialization failed");
  }
};

//Get Firebase Admin Auth instance
export const getFirebaseAuth = (): admin.auth.Auth => {
  if (!firebaseApp) {
    throw new Error(
      "Firebase not initialized. Call initializeFirebase() first.",
    );
  }
  return admin.auth(firebaseApp);
};

//Get Firebase Admin App instance
export const getFirebaseApp = (): admin.app.App => {
  if (!firebaseApp) {
    throw new Error(
      "Firebase not initialized. Call initializeFirebase() first.",
    );
  }
  return firebaseApp;
};

export default { initializeFirebase, getFirebaseAuth, getFirebaseApp };
