// phoneAuth.js
import { getAuth, RecaptchaVerifier, signInWithPhoneNumber } from "https://www.gstatic.com/firebasejs/11.5.0/firebase-auth.js";
import { app } from "./firebase.js";

let auth; // Declare auth at module scope

if (!app) {
  console.error("Firebase app is not initialized.");
} else {
  auth = getAuth(app); // Initialize auth globally
  if (!auth) {
    console.error("Firebase auth is not initialized.");
  } else {
    // Initialize reCAPTCHA verifier if not already initialized
    if (!window.recaptchaVerifier) {
      window.recaptchaVerifier = new RecaptchaVerifier(
        auth, // Pass auth as the first parameter
        'recaptcha-container',
        {
          size: 'normal', // Visible widget mode
          callback: (response) => {
            console.log("reCAPTCHA solved:", response);
            // Optionally auto-trigger sendOTP() here if desired:
            // sendOTP();
          },
          'expired-callback': () => {
            console.log("reCAPTCHA expired, please re-solve.");
          }
        }
      );

      // Explicitly render the reCAPTCHA widget
      window.recaptchaVerifier.render().then((widgetId) => {
        console.log("reCAPTCHA rendered with widgetId:", widgetId);
      }).catch((error) => {
        console.error("Error rendering reCAPTCHA:", error);
      });
    }
  }
}

// Function to send OTP to the provided phone number
export function sendOTP() {
  const phoneNumber = document.getElementById("phoneNumber").value;
  if (!phoneNumber) {
    alert("Please enter a phone number.");
    return;
  }
  const appVerifier = window.recaptchaVerifier;
  signInWithPhoneNumber(auth, phoneNumber, appVerifier)
    .then((confirmationResult) => {
      window.confirmationResult = confirmationResult;
      alert("OTP has been sent to your phone!");
    })
    .catch((error) => {
      console.error("Error sending OTP:", error);
      alert("Error sending OTP: " + error.message);
    });
}

// Function to verify the OTP entered by the user
export function verifyOTP() {
  const otp = document.getElementById("otp").value;
  if (!otp) {
    alert("Please enter the OTP.");
    return;
  }
  window.confirmationResult.confirm(otp)
    .then((result) => {
      const user = result.user;
      alert("Phone number verified successfully!");
      console.log("User:", user);
    })
    .catch((error) => {
      console.error("OTP verification failed:", error);
      alert("OTP verification failed: " + error.message);
    });
}
