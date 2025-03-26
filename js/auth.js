import { auth, database } from "./firebase.js";
import {
  signInWithEmailAndPassword,
  deleteUser,
  signOut,
} from "https://www.gstatic.com/firebasejs/11.5.0/firebase-auth.js";
import { ref, remove } from "https://www.gstatic.com/firebasejs/11.5.0/firebase-database.js";

let currentUser = null;

// Custom error messages mapping
const errorMessages = {
  "auth/invalid-credential": "Your credentials are invalid. Please check your email and password.",
  "auth/wrong-password": "Incorrect password. Please try again.",
  "auth/user-not-found": "No account found with this email.",
  "auth/invalid-email": "Invalid email address. Please check the format.",
  // Add more error code mappings as needed.
};

export async function login(email, password) {
  if (email === "" || password === "") {
    alert("Email and Password required!");
    return;
  }
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    currentUser = userCredential.user;

    if (!currentUser.emailVerified) {
      alert(
        "Please verify your email before logging in. A verification email has been sent to your email address."
      );
      await signOut(auth);
      return null;
    }

    return currentUser;
  } catch (error) {
    console.error("Error logging in:", error);
    // Use a custom message if one exists, otherwise fallback to the default error message
    alert(errorMessages[error.code] || error.message);
  }
}

export async function deleteAccount() {
  if (!currentUser) {
    alert("No user is logged in.");
    return;
  }
  const confirmDelete = confirm(
    "Are you sure you want to delete your account? This action cannot be undone."
  );
  if (!confirmDelete) return;

  try {
    await deleteUser(currentUser);
    await remove(ref(database, `users/${currentUser.uid}`));
    alert("Your account has been deleted.");
    currentUser = null;
    location.reload();
  } catch (error) {
    console.error("Error deleting account:", error);
    alert("There was an error deleting your account: " + error.message);
  }
}

export function getCurrentUser() {
  return currentUser;
}

export function setCurrentUser(user) {
  currentUser = user;
}
