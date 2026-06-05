import AsyncStorage from '@react-native-async-storage/async-storage';
import { GoogleSignin, isErrorWithCode, isSuccessResponse, statusCodes } from '@react-native-google-signin/google-signin';
import {
  createUserWithEmailAndPassword,
  EmailAuthProvider,
  GoogleAuthProvider,
  isSignInWithEmailLink,
  reauthenticateWithCredential,
  reload,
  sendEmailVerification,
  sendPasswordResetEmail,
  sendSignInLinkToEmail,
  signInWithCredential,
  signInWithEmailAndPassword,
  signInWithEmailLink,
  signOut,
  updateProfile,
  User,
  verifyBeforeUpdateEmail,
} from 'firebase/auth';
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
  emailVerified?: boolean;
  provider: AuthProvider;
};

type EmailPasswordAuthInput = {
  email: string;
  password: string;
  displayName?: string;
};

type EmailChangeInput = {
  newEmail: string;
  currentPassword: string;
};

export class EmailVerificationRequiredError extends Error {
  email: string;

  constructor(email: string) {
    super('Verify your email before signing in. We sent a fresh verification link.');
    this.name = 'EmailVerificationRequiredError';
    this.email = email;
  }
}

export function toAuthResult(user: User, provider: AuthProvider): AuthResult {
  return {
    uid: user.uid,
    email: user.email ?? undefined,
    displayName: user.displayName ?? undefined,
    emailVerified: user.emailVerified,
    provider,
  };
}

function getActionCodeSettings() {
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

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function requireCurrentUser() {
  const user = firebaseAuth.currentUser;
  if (!user) {
    throw new Error('Sign in again to manage your account.');
  }
  return user;
}

export async function sendPasswordlessSignInEmail(email: string) {
  const normalizedEmail = normalizeEmail(email);
  await sendSignInLinkToEmail(firebaseAuth, normalizedEmail, getActionCodeSettings());
  await AsyncStorage.setItem(pendingEmailStorageKey, normalizedEmail);
  return normalizedEmail;
}

export async function completePasswordlessSignIn(email: string, emailLink: string) {
  const normalizedEmail = normalizeEmail(email);
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

export async function signUpWithEmailPassword({ email, password, displayName }: EmailPasswordAuthInput) {
  const normalizedEmail = normalizeEmail(email);
  const credential = await createUserWithEmailAndPassword(firebaseAuth, normalizedEmail, password);

  if (displayName?.trim()) {
    await updateProfile(credential.user, { displayName: displayName.trim() });
  }

  await sendEmailVerification(credential.user, getActionCodeSettings());
  await signOut(firebaseAuth);

  return {
    email: normalizedEmail,
    displayName: displayName?.trim() || undefined,
  };
}

export async function signInWithEmailPassword({ email, password }: EmailPasswordAuthInput) {
  const normalizedEmail = normalizeEmail(email);
  const credential = await signInWithEmailAndPassword(firebaseAuth, normalizedEmail, password);

  await reload(credential.user);
  if (!credential.user.emailVerified) {
    await sendEmailVerification(credential.user, getActionCodeSettings());
    throw new EmailVerificationRequiredError(normalizedEmail);
  }

  return toAuthResult(credential.user, 'email');
}

export async function resendVerificationEmail() {
  const user = requireCurrentUser();
  await sendEmailVerification(user, getActionCodeSettings());
}

export async function sendPasswordRecoveryEmail(email: string) {
  const normalizedEmail = normalizeEmail(email);
  await sendPasswordResetEmail(firebaseAuth, normalizedEmail);
  return normalizedEmail;
}

export async function refreshCurrentUserProfile() {
  const user = requireCurrentUser();
  await reload(user);
  return toAuthResult(firebaseAuth.currentUser ?? user, user.providerData.some((item) => item.providerId === 'google.com') ? 'google' : 'email');
}

export async function requestEmailChange({ newEmail, currentPassword }: EmailChangeInput) {
  const user = requireCurrentUser();
  const currentEmail = user.email;
  if (!currentEmail) {
    throw new Error('Your account does not have an email address to update.');
  }

  const normalizedEmail = normalizeEmail(newEmail);
  if (normalizedEmail === currentEmail) {
    throw new Error('Use a different email address.');
  }

  const credential = EmailAuthProvider.credential(currentEmail, currentPassword);
  await reauthenticateWithCredential(user, credential);
  await verifyBeforeUpdateEmail(user, normalizedEmail, getActionCodeSettings());
  return normalizedEmail;
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
