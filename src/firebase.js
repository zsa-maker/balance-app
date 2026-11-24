import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyCK1cLnKbfptUX-6qYmJflaXKaYwKmpDBI",
  authDomain: "my-balance-app-4f5ef.firebaseapp.com",
  projectId: "my-balance-app-4f5ef",
  storageBucket: "my-balance-app-4f5ef.firebasestorage.app",
  messagingSenderId: "1013734276213",
  appId: "1:1013734276213:web:06695446c854420733cc3c",
  measurementId: "G-6N5ET2ECZB"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);