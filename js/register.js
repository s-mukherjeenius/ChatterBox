// register.js
import { auth, database } from "./firebase.js";
import { createUserWithEmailAndPassword, sendEmailVerification, updateProfile } from "https://www.gstatic.com/firebasejs/11.5.0/firebase-auth.js";
import { ref, set } from "https://www.gstatic.com/firebasejs/11.5.0/firebase-database.js";

window.registerUser = async function() {
  // Get a reference to the signup button for disabling/enabling.
  const signupButton = document.getElementById("signup-button");
  signupButton.disabled = true;

  // Get registration form field values.
  const email = document.getElementById("register-email").value.trim();
  const username = document.getElementById("register-username").value.trim();
  const password = document.getElementById("register-password").value.trim();
  const confirmPassword = document.getElementById("register-confirm-password").value.trim();

  // Basic field validation.
  if (!email || !username || !password || !confirmPassword) {
    alert("Please fill in all fields.");
    signupButton.disabled = false;
    return;
  }

  // Validate email format using a regular expression.
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    alert("Please enter a valid email address.");
    signupButton.disabled = false;
    return;
  }

  if (password !== confirmPassword) {
    alert("Passwords do not match!");
    signupButton.disabled = false;
    return;
  }

  // Provide feedback to the user.
  const originalButtonText = signupButton.textContent;
  signupButton.textContent = "Registering...";

  try {
    // Create the user with Firebase Authentication.
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Update the user's profile with the username.
    await updateProfile(user, { displayName: username });

    // Send a verification email.
    await sendEmailVerification(user);

    // Optionally, store additional user details in the Realtime Database using the user's UID.
    await set(ref(database, `users/${user.uid}`), {
      username: username,
      email: email,
      verified: false
    });

    alert("Registration successful! A verification email has been sent. Please check your email and verify your account.");
    // Redirect the user to the login page (index.html).
    window.location.href = "index.html";
  } catch (error) {
    console.error("Error during registration:", error);
    alert("Registration failed: " + error.message);
  } finally {
    // Re-enable the button and restore its original text.
    signupButton.disabled = false;
    signupButton.textContent = originalButtonText;
  }
};
