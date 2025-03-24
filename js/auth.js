// auth.js
import { ref, get, set, remove } from "https://www.gstatic.com/firebasejs/11.5.0/firebase-database.js";
import { database } from "./firebase.js";

let currentUser = null;

export async function register(username, password) {
  if (username === "" || password === "") {
    alert("Username and Password required!");
    return;
  }
  const userRef = ref(database, `users/${username}`);
  try {
    const snapshot = await get(userRef);
    if (snapshot.exists()) {
      alert("Username already taken! Try logging in.");
    } else {
      await set(userRef, { password: password });
      alert("Registration successful! Please log in.");
    }
  } catch (error) {
    console.error("Error registering:", error);
  }
}

export async function login(username, password) {
  if (username === "" || password === "") {
    alert("Username and Password required!");
    return;
  }
  const userRef = ref(database, `users/${username}`);
  try {
    const snapshot = await get(userRef);
    if (snapshot.exists()) {
      const userData = snapshot.val();
      if (userData.password === password) {
        currentUser = username;
        return currentUser;
      } else {
        alert("Incorrect password!");
      }
    } else {
      alert("User does not exist! Please register.");
    }
  } catch (error) {
    console.error("Error logging in:", error);
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
    const userRef = ref(database, `users/${currentUser}`);
    await remove(userRef);
    alert("Your account has been deleted.");
    // Optionally remove chats associated with the user here.
    currentUser = null;
    location.reload();
  } catch (error) {
    console.error("Error deleting account:", error);
    alert("There was an error deleting your account.");
  }
}

export function getCurrentUser() {
  return currentUser;
}

export function setCurrentUser(user) {
  currentUser = user;
}
