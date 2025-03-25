// chat.js
import { ref, get, push, onChildAdded, remove, off, onValue, set } from "https://www.gstatic.com/firebasejs/11.5.0/firebase-database.js";
import { database } from "./firebase.js";
import { getChatID, formatTimestamp } from "./helpers.js";
import { getCurrentUser } from "./auth.js";

let chatWith = null;
let currentChatListener = null;

export function addContactToList(contactName) {
  const contactsContainer = document.getElementById("contacts");

  // Remove "No Friends" message if it exists.
  const noFriendsMessage = contactsContainer.querySelector(".no-friends");
  if (noFriendsMessage) {
    noFriendsMessage.remove();
  }

  // Avoid duplicates.
  if (contactsContainer.querySelector(`[data-contact="${contactName}"]`)) {
    return;
  }

  const contactDiv = document.createElement("div");
  contactDiv.classList.add("contact");
  contactDiv.setAttribute("data-contact", contactName);
  contactDiv.textContent = contactName;
  contactDiv.addEventListener("click", () => selectChat(contactName));
  contactsContainer.appendChild(contactDiv);
}

export function loadConversations() {
  const currentUserObj = getCurrentUser();
  const currentUsername = currentUserObj ? currentUserObj.displayName : "";
  const contactsContainer = document.getElementById("contacts");
  contactsContainer.innerHTML = ""; // Clear previous list.

  // Create search input and Start Chat button.
  const searchField = document.createElement("input");
  searchField.id = "contactSearch";
  searchField.placeholder = "Search contacts or enter username...";
  contactsContainer.appendChild(searchField);

  const startChatBtn = document.createElement("button");
  startChatBtn.id = "start-chat-btn";
  startChatBtn.textContent = "Start Chat";
  startChatBtn.onclick = startChatWithSearchedUser;
  contactsContainer.appendChild(startChatBtn);

  // Load chats that include the current user.
  const chatsRef = ref(database, "chats");
  get(chatsRef)
    .then((snapshot) => {
      let conversations = [];
      snapshot.forEach((childSnapshot) => {
        const chatID = childSnapshot.key;
        if (chatID.includes(currentUsername)) {
          const parts = chatID.split("_");
          const friend = (parts[0] === currentUsername) ? parts[1] : parts[0];
          let lastTimestamp = 0;
          childSnapshot.forEach((msgSnap) => {
            const msg = msgSnap.val();
            if (msg.timestamp > lastTimestamp) lastTimestamp = msg.timestamp;
          });
          conversations.push({ friend, lastTimestamp });
        }
      });
      if (conversations.length === 0) {
        const noFriends = document.createElement("div");
        noFriends.textContent = "No Friends";
        noFriends.classList.add("no-friends");
        contactsContainer.appendChild(noFriends);
      } else {
        conversations.sort((a, b) => b.lastTimestamp - a.lastTimestamp);
        conversations.forEach((conv) => {
          addContactToList(conv.friend);
        });
      }
    })
    .catch((error) => console.error("Error loading conversations:", error));

  // Attach listener for filtering contacts.
  searchField.addEventListener("input", function () {
    const filter = this.value.toLowerCase();
    const contacts = contactsContainer.getElementsByClassName("contact");
    Array.from(contacts).forEach((contact) => {
      contact.style.display = contact.textContent.toLowerCase().includes(filter)
        ? "block"
        : "none";
    });
  });
}

export async function selectChat(contactName) {
  const currentUserObj = getCurrentUser();
  const currentUsername = currentUserObj ? currentUserObj.displayName : "";
  if (contactName === currentUsername) {
    alert("You cannot chat with yourself.");
    return;
  }
  chatWith = contactName;
  document.getElementById("conversation-header").textContent = contactName;
  
  // Verify that the contact exists.
  const userRef = ref(database, `users/${chatWith}`);
  try {
    const snapshot = await get(userRef);
    if (!snapshot.exists()) {
      alert("User does not exist!");
      return;
    }
    addContactToList(contactName);
    loadMessages();
    // Start listening for typing status for the current chat.
    listenForTypingStatus();
  } catch (error) {
    console.error("Error finding user:", error);
  }
}

export function startChatWithSearchedUser() {
  const searchValue = document.getElementById("contactSearch").value.trim();
  if (searchValue === "") {
    alert("Please enter a username to start chat.");
    return;
  }
  selectChat(searchValue);
}

export function loadMessages() {
  const currentUserObj = getCurrentUser();
  const currentUsername = currentUserObj ? currentUserObj.displayName : "";
  const chatID = getChatID(currentUsername, chatWith);
  const chatRef = ref(database, `chats/${chatID}`);

  // Remove any previous listener.
  off(chatRef, "child_added");
  document.getElementById("chat-box").innerHTML = ""; // Clear old messages.

  currentChatListener = onChildAdded(chatRef, (snapshot) => {
    const data = snapshot.val();
    const chatBox = document.getElementById("chat-box");
    const messageDiv = document.createElement("div");
    messageDiv.classList.add("message");

    const textSpan = document.createElement("span");
    textSpan.classList.add("text");
    if (data.sender === currentUsername) {
      messageDiv.classList.add("user");
      textSpan.textContent = `You: ${data.text}`;
    } else {
      messageDiv.classList.add("other");
      textSpan.textContent = `${data.sender}: ${data.text}`;
    }
    messageDiv.appendChild(textSpan);

    const timeSpan = document.createElement("span");
    timeSpan.classList.add("timestamp");
    timeSpan.textContent = formatTimestamp(data.timestamp);
    messageDiv.appendChild(timeSpan);

    chatBox.appendChild(messageDiv);
    chatBox.scrollTop = chatBox.scrollHeight;
  });
}

export function sendMessage(message) {
  const currentUserObj = getCurrentUser();
  const currentUsername = currentUserObj ? currentUserObj.displayName : "";
  if (message.trim() === "" || !chatWith) return;

  const chatID = getChatID(currentUsername, chatWith);
  const chatRef = ref(database, `chats/${chatID}`);
  push(chatRef, {
    text: message,
    sender: currentUsername,
    timestamp: Date.now()
  });
}

export function clearChat() {
  const currentUserObj = getCurrentUser();
  const currentUsername = currentUserObj ? currentUserObj.displayName : "";
  const chatID = getChatID(currentUsername, chatWith);
  const chatRef = ref(database, `chats/${chatID}`);

  if (confirm("Are you sure you want to delete all messages?")) {
    remove(chatRef)
      .then(() => {
        document.getElementById("chat-box").innerHTML = "";
        alert("Chat history cleared.");
      })
      .catch((error) => console.error("Error deleting chat:", error));
  }
}

/* Typing Indicator Functions */

// Updates the typing status in Firebase for the current chat.
export function updateTypingStatus(isTyping) {
  const currentUserObj = getCurrentUser();
  const currentUsername = currentUserObj ? currentUserObj.displayName : "";
  if (!chatWith) return;
  const chatID = getChatID(currentUsername, chatWith);
  const typingRef = ref(database, `typing/${chatID}/${currentUsername}`);

  if (isTyping) {
    set(typingRef, true);
  } else {
    remove(typingRef);
  }
}

// Listens for typing status updates from the other user.
export function listenForTypingStatus() {
  const currentUserObj = getCurrentUser();
  const currentUsername = currentUserObj ? currentUserObj.displayName : "";
  if (!chatWith) return;
  const chatID = getChatID(currentUsername, chatWith);
  const typingRef = ref(database, `typing/${chatID}`);

  onValue(typingRef, (snapshot) => {
    const typingData = snapshot.val();
    const typingIndicator = document.getElementById("typingIndicator");
    if (typingData) {
      // For a one-on-one chat, show the indicator if any other user is typing.
      const otherTyping = Object.keys(typingData).find(user => user !== currentUsername);
      typingIndicator.textContent = otherTyping ? `${otherTyping} is typing...` : "";
    } else {
      typingIndicator.textContent = "";
    }
  });
}
