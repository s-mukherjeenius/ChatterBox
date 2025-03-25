import { login, deleteAccount, setCurrentUser } from "./auth.js";
import { 
  loadConversations, 
  selectChat, 
  startChatWithSearchedUser, 
  sendMessage, 
  clearChat, 
  updateTypingStatus 
} from "./chat.js";

// Redirect to register.html when the register button is clicked.
window.register = function () {
  window.location.href = "register.html";
};

window.login = async function () {
  // Using the "username" input as the email field.
  const email = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value.trim();
  
  // Call login with email and password.
  const user = await login(email, password);
  if (user) {
    setCurrentUser(user);
    document.getElementById("auth-section").style.display = "none";
    document.getElementById("chat-section").style.display = "block";
    // Display the user's display name (if available) or email.
    document.getElementById("currentUser").textContent = user.displayName || user.email;
    loadConversations();
  }
};

window.deleteAccount = deleteAccount;
window.selectChat = selectChat;
window.startChatWithSearchedUser = startChatWithSearchedUser;

window.sendMessage = function () {
  const input = document.getElementById("messageInput");
  sendMessage(input.value);
  input.value = "";
  // Clear typing status once message is sent.
  updateTypingStatus(false);
};

window.clearChat = clearChat;

// Attach typing event listener to the message input field.
const messageInput = document.getElementById("messageInput");
let typingTimeout;
messageInput.addEventListener("input", () => {
  updateTypingStatus(true);
  clearTimeout(typingTimeout);
  // Clear the typing status after 2 seconds of inactivity.
  typingTimeout = setTimeout(() => {
    updateTypingStatus(false);
  }, 2000);
});
