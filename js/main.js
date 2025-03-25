import { login, deleteAccount, setCurrentUser } from "./auth.js";
import { 
  loadConversations, 
  selectChat, 
  startChatWithSearchedUser, 
  sendMessage, 
  clearChat 
} from "./chat-part1.js";
import { updateTypingStatus, listenForTypingStatus } from "./chat-part2.js";

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

  sendMessage(message);
  input.value = "";
  // Pass the current chat partner's UID (assumed to be stored on window.chatWith)
  updateTypingStatus(window.chatWith, false);
};

window.clearChat = clearChat;

// Attach typing event listener to the message input field.
const messageInput = document.getElementById("messageInput");
let typingTimeout;
let isTyping = false;

messageInput.addEventListener("input", () => {
  // Ensure that window.chatWith is defined.
  if (!window.chatWith) return;
  if (!isTyping) {
    updateTypingStatus(window.chatWith, true);
    isTyping = true;
  }

  clearTimeout(typingTimeout);
  typingTimeout = setTimeout(() => {
    updateTypingStatus(window.chatWith, false);
    isTyping = false;
  }, 2000);
});
