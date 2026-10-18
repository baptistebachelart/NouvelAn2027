import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  projectId: "nouvel-an-2027-maleville",
  appId: "1:631556797879:web:0fcade23f622866298a432",
  storageBucket: "nouvel-an-2027-maleville.firebasestorage.app",
  apiKey: "AIzaSyCg7MYj8sIXw_rLFa1FZ7LvZKBIulvhhro",
  authDomain: "nouvel-an-2027-maleville.firebaseapp.com",
  messagingSenderId: "631556797879",
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;
