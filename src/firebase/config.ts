// Firebase configuration - uses environment variables when available (Vercel),
// falls back to hardcoded values for Firebase App Hosting compatibility.
export const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyC6KnCmgzrgRjH4Cs5pXOm3P11EYuUwnXM",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "studio-1433254313-1efda.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "studio-1433254313-1efda",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "studio-1433254313-1efda.appspot.com",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "25592788712",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:25592788712:web:85a4598385540a7834bb5d",
};
