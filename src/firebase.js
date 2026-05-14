import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyCcZA5_TQZaLlzJ3spFc4rSPvEbzC3DHis",
  authDomain: "reppc-8e5d8.firebaseapp.com",
  projectId: "reppc-8e5d8",
  storageBucket: "reppc-8e5d8.firebasestorage.app",
  messagingSenderId: "250995014991",
  appId: "1:250995014991:web:0b27a77f4334f21aed993a"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const storage = getStorage(app);
