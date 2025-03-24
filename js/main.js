// main.js
import { register, login, deleteAccount, setCurrentUser } from "./auth.js";
import { 
  loadConversations, 
  selectChat, 
  startChatWithSearchedUser, 
  sendMessage, 
  clearChat, 
  updateTypingStatus 
} from "./chat.js";

// Expose functions for use in the HTML
window.register = async function () {
  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value.trim();
  await register(username, password);
};

window.login = async function () {
  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value.trim();
  const user = await login(username, password);
  if (user) {
    setCurrentUser(user);
    document.getElementById("auth-section").style.display = "none";
    document.getElementById("chat-section").style.display = "block";
    document.getElementById("currentUser").textContent = user;
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
