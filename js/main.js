import { login, deleteAccount, setCurrentUser, getCurrentUser } from "./auth.js";
import { 
  loadConversations, 
  selectChat, 
  startChatWithSearchedUser, 
  sendMessage, 
  clearChat 
} from "./chat-part1.js";
import { updateTypingStatus, listenForTypingStatus } from "./chat-part2.js";
import { messaging } from "./firebase.js";
// Import Firebase Database functions
import { ref, set } from "https://www.gstatic.com/firebasejs/11.5.0/firebase-database.js";
import { database } from "./firebase.js";
// Import modular Firebase Messaging functions
import { getToken, onMessage } from "https://www.gstatic.com/firebasejs/11.5.0/firebase-messaging.js";

// Redirect to register.html when the register button is clicked.
window.register = function () {
  window.location.href = "register.html";
};

window.login = async function () {
  const email = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value.trim();

  try {
    const user = await login(email, password);
    if (user) {
      setCurrentUser(user);
      document.getElementById("auth-section").style.display = "none";
      document.getElementById("chat-section").style.display = "block";
      document.getElementById("currentUser").textContent = user.displayName || user.email;
      loadConversations();

      // Initialize push notifications after a successful login
      initPushNotifications();

      // Store OneSignal Player ID in Firebase
      storeOneSignalPlayerId();
    }
  } catch (error) {
    alert("Login failed: " + error.message);
  }
};

window.deleteAccount = deleteAccount;
window.selectChat = selectChat;
window.startChatWithSearchedUser = startChatWithSearchedUser;

window.sendMessage = function () {
  const input = document.getElementById("messageInput");
  const message = input.value.trim();

  if (message === "") {
    alert("Message cannot be empty.");
    return;
  }

  // Send the message through chat-part1.js logic
  sendMessage(message);
  // Clear the input
  input.value = "";

  // Pass the current chat partner's UID to stop typing
  if (window.chatWith) {
    updateTypingStatus(window.chatWith, false);
  }
};

window.clearChat = clearChat;

// Attach typing event listener to the message input field.
const messageInput = document.getElementById("messageInput");
let typingTimeout;
let isTyping = false;

messageInput.addEventListener("input", () => {
  // If no friend is selected, do nothing
  if (!window.chatWith) return;

  // If the user starts typing, update typing status
  if (!isTyping) {
    updateTypingStatus(window.chatWith, true);
    isTyping = true;
  }

  // Clear any previous timeout
  clearTimeout(typingTimeout);

  // After 2 seconds of no input, mark as not typing
  typingTimeout = setTimeout(() => {
    updateTypingStatus(window.chatWith, false);
    isTyping = false;
  }, 2000);
});

// Function to initialize push notifications using FCM
function initPushNotifications() {
  Notification.requestPermission().then(permission => {
    if (permission === 'granted') {
      console.log('Notification permission granted.');
      getToken(messaging, {
        vapidKey: "BBi5m2sqbe6MYgTwHJ8zTsh4snKNxBQUDd_xcRKqHHn1nRmFshaK7Nw61i35G5IXVtqm8rN4ARJG8xWav1F6Cc0"
      }).then(currentToken => {
        if (currentToken) {
          console.log('FCM Token:', currentToken);
          // Optionally, send the FCM token to your server if needed.
        } else {
          console.log('No registration token available. Request permission to generate one.');
        }
      }).catch(err => {
        console.error('An error occurred while retrieving token.', err);
      });
    } else {
      console.error('Notification permission denied.');
    }
  });
}

// Function to retrieve and store the OneSignal player ID
function storeOneSignalPlayerId() {
  if (window.OneSignalDeferred && window.OneSignalDeferred.push) {
    OneSignalDeferred.push(async function(OneSignal) {
      try {
        const playerId = await OneSignal.getUserIdAsync();
        console.log("OneSignal Player ID:", playerId);
        const currentUser = getCurrentUser();
        if (currentUser && playerId) {
          // Store the OneSignal player ID in Firebase under /users/{uid}/onesignalPlayerId
          set(ref(database, `users/${currentUser.uid}/onesignalPlayerId`), playerId)
            .then(() => {
              console.log("OneSignal Player ID stored successfully.");
            })
            .catch((error) => {
              console.error("Error storing OneSignal Player ID:", error);
            });
        }
      } catch (error) {
        console.error("Error retrieving OneSignal Player ID:", error);
      }
    });
  } else {
    console.error("OneSignal is not available.");
  }
}

// Listen for foreground push notifications (using FCM)
onMessage(messaging, (payload) => {
  console.log('Message received in foreground:', payload);
  // Optionally, display an in-app notification UI here.
});
