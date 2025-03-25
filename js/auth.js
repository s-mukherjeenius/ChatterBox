// auth.js
import { auth, database } from "./firebase.js";
import { signInWithEmailAndPassword, deleteUser } from "https://www.gstatic.com/firebasejs/11.5.0/firebase-auth.js";
import { ref, remove } from "https://www.gstatic.com/firebasejs/11.5.0/firebase-database.js";

let currentUser = null;

export async function login(email, password) {
  if (email === "" || password === "") {
    alert("Email and Password required!");
    return;
  }
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    currentUser = userCredential.user;
    return currentUser;
  } catch (error) {
    console.error("Error logging in:", error);
    alert(error.message);
  }
}

export async function deleteAccount() {
  if (!currentUser) {
    alert("No user is logged in.");
    return;
  }
  const confirmDelete = confirm("Are you sure you want to delete your account? This action cannot be undone.");
  if (!confirmDelete) return;
  
  try {
    // Delete the user from Firebase Authentication.
    await deleteUser(currentUser);
    // Optionally, remove user data from the Realtime Database.
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
