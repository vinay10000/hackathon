import { FirebaseApp, getApp, getApps, initializeApp } from 'firebase/app';
import { Auth, getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: 'AIzaSyCvrklJIt0I6KlHGXj3_WL_7nP2Ha4fc_U',
  authDomain: 'habit-tracker-9f884.firebaseapp.com',
  projectId: 'habit-tracker-9f884',
  storageBucket: 'habit-tracker-9f884.firebasestorage.app',
  messagingSenderId: '977147075388',
  appId: '1:977147075388:android:4df20b1f7de3a09b155c39',
};

export const firebaseApp: FirebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);
export const firebaseAuth: Auth = getAuth(firebaseApp);
