import AsyncStorage from '@react-native-async-storage/async-storage';
import { GoogleSignin, isErrorWithCode, isSuccessResponse, statusCodes } from '@react-native-google-signin/google-signin';
import { GoogleAuthProvider, isSignInWithEmailLink, sendSignInLinkToEmail, signInWithCredential, signInWithEmailLink, signOut, User } from 'firebase/auth';
import * as Linking from 'expo-linking';
import { Platform } from 'react-native';

import { firebaseAuth } from '@/src/lib/firebase';

const pendingEmailStorageKey = 'habitai.auth.pendingEmail';

if (Platform.OS === 'android') {
  GoogleSignin.configure({
    webClientId: '977147075388-k1tmkpof3dcbk8buuudlsrg0cj74nr2t.apps.googleusercontent.com',
    profileImageSize: 160,
  });
}

export type AuthProvider = 'email' | 'google';

export type AuthResult = {
  uid: string;
  email?: string;
  displayName?: string;
  provider: AuthProvider;
};

export function toAuthResult(user: User, provider: AuthProvider): AuthResult {
  return {
    uid: user.uid,
    email: user.email ?? undefined,
    displayName: user.displayName ?? undefined,
    provider,
  };
}

function getEmailLinkSettings() {
  return {
    url: process.env.EXPO_PUBLIC_FIREBASE_EMAIL_LINK_URL ?? 'https://habit-tracker-9f884.firebaseapp.com/auth/email-link',
    handleCodeInApp: true,
    iOS: {
      bundleId: 'com.hackathon.habitai',
    },
    android: {
      packageName: 'com.hackathon.habitai',
      installApp: true,
    },
  };
}

export async function sendPasswordlessSignInEmail(email: string) {
  const normalizedEmail = email.trim().toLowerCase();
  await sendSignInLinkToEmail(firebaseAuth, normalizedEmail, getEmailLinkSettings());
  await AsyncStorage.setItem(pendingEmailStorageKey, normalizedEmail);
  return normalizedEmail;
}

export async function completePasswordlessSignIn(email: string, emailLink: string) {
  const normalizedEmail = email.trim().toLowerCase();
  const credential = await signInWithEmailLink(firebaseAuth, normalizedEmail, emailLink.trim());
  await AsyncStorage.removeItem(pendingEmailStorageKey);
  return toAuthResult(credential.user, 'email');
}

export async function getPendingPasswordlessEmail() {
  return AsyncStorage.getItem(pendingEmailStorageKey);
}

export async function clearPendingPasswordlessEmail() {
  await AsyncStorage.removeItem(pendingEmailStorageKey);
}

export function isPasswordlessEmailLink(value: string) {
  return isSignInWithEmailLink(firebaseAuth, value);
}

export function getCurrentAuthUrl() {
  return Linking.getLinkingURL() ?? null;
}

export async function signInWithNativeGoogle() {
  if (Platform.OS !== 'android') {
    throw new Error('Native Google sign-in is configured for Android only in this build.');
  }

  await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
  const response = await GoogleSignin.signIn();

  if (!isSuccessResponse(response)) {
    throw new Error('Google sign-in was cancelled.');
  }

  const idToken = response.data.idToken;
  if (!idToken) {
    throw new Error('Google did not return an ID token. Add SHA-1/SHA-256 to Firebase and re-download google-services.json.');
  }

  const googleCredential = GoogleAuthProvider.credential(idToken);
  const credential = await signInWithCredential(firebaseAuth, googleCredential);
  return toAuthResult(credential.user, 'google');
}

export async function signOutOfFirebase() {
  await Promise.allSettled([signOut(firebaseAuth), GoogleSignin.signOut()]);
}

export function getNativeGoogleErrorMessage(error: unknown) {
  if (isErrorWithCode(error)) {
    if (error.code === statusCodes.IN_PROGRESS) {
      return 'Google sign-in is already in progress.';
    }
    if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
      return 'Google Play Services is not available or needs an update.';
    }
    if (error.code === statusCodes.SIGN_IN_CANCELLED) {
      return 'Google sign-in was cancelled.';
    }
  }

  return error instanceof Error ? error.message : 'Sign-in failed. Please try again.';
}
