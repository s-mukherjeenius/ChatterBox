import { initializeApp } from "https://www.gstatic.com/firebasejs/11.5.0/firebase-app.js";
import { getDatabase, ref, push, onChildAdded, get, set, remove, off } from "https://www.gstatic.com/firebasejs/11.5.0/firebase-database.js";

// Firebase Config
const firebaseConfig = {
  apiKey: "AIzaSyBtLyhlgUx4XV_MvgrjhZOU-GrRm6LL-C4",
  authDomain: "testchat-b5f55.firebaseapp.com",
  projectId: "testchat-b5f55",
  databaseURL: "https://testchat-b5f55-default-rtdb.firebaseio.com/",
  storageBucket: "testchat-b5f55.appspot.com",
  messagingSenderId: "468989733956",
  appId: "1:468989733956:web:93158327c5d4370e4c2011"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

let currentUser = null;
let chatWith = null;

// Register user
window.register = async function () {
  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value.trim();

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
};

// Login user
window.login = async function () {
  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value.trim();

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
        startUserSession();
      } else {
        alert("Incorrect password!");
      }
    } else {
      alert("User does not exist! Please register.");
    }
  } catch (error) {
    console.error("Error logging in:", error);
  }
};

// Start user session and load conversation list
function startUserSession() {
  document.getElementById("auth-section").style.display = "none";
  document.getElementById("chat-section").style.display = "block";
  document.getElementById("currentUser").textContent = currentUser;
  loadConversations();
}

// Delete Account Function
window.deleteAccount = async function () {
  if (!currentUser) {
    alert("No user is logged in.");
    return;
  }
  const confirmDelete = confirm("Are you sure you want to delete your account? This action cannot be undone.");
  if (!confirmDelete) return;
  
  try {
    // Remove user data from the 'users' node
    const userRef = ref(database, `users/${currentUser}`);
    await remove(userRef);
    alert("Your account has been deleted.");
    // Optionally, you might also want to remove chats associated with this user.
    window.location.reload();
  } catch (error) {
    console.error("Error deleting account:", error);
    alert("There was an error deleting your account.");
  }
};

// Helper: Add a contact to the sidebar if not already present
function addContactToList(contactName) {
  const contactsContainer = document.getElementById("contacts");

  // Remove "No Friends" message if it exists
  const noFriendsMessage = contactsContainer.querySelector(".no-friends");
  if (noFriendsMessage) {
    noFriendsMessage.remove();
  }

  // Check if the contact already exists
  if (contactsContainer.querySelector(`[data-contact="${contactName}"]`)) {
    return; // Contact already exists
  }

  // Create and add the contact to the list
  const contactDiv = document.createElement("div");
  contactDiv.classList.add("contact");
  contactDiv.setAttribute("data-contact", contactName);
  contactDiv.textContent = contactName;
  contactDiv.addEventListener("click", () => selectChat(contactName));
  contactsContainer.appendChild(contactDiv);
}

// Load conversations for the current user
function loadConversations() {
  const contactsContainer = document.getElementById("contacts");
  contactsContainer.innerHTML = ""; // Clear existing content

  // Add the search input and Start Chat button at the top
  const searchField = document.createElement("input");
  searchField.id = "contactSearch";
  searchField.placeholder = "Search contacts or enter username...";
  contactsContainer.appendChild(searchField);

  const startChatBtn = document.createElement("button");
  startChatBtn.id = "start-chat-btn";
  startChatBtn.textContent = "Start Chat";
  startChatBtn.onclick = startChatWithSearchedUser;
  contactsContainer.appendChild(startChatBtn);

  // Query the "chats" node to load conversations involving currentUser
  const chatsRef = ref(database, "chats");
  get(chatsRef).then((snapshot) => {
    let conversations = [];
    snapshot.forEach((childSnapshot) => {
      const chatID = childSnapshot.key;
      // chatID format is "userA_userB" (sorted alphabetically)
      if (chatID.includes(currentUser)) {
        const parts = chatID.split("_");
        const friend = (parts[0] === currentUser) ? parts[1] : parts[0];
        // Determine the most recent timestamp in this chat
        let lastTimestamp = 0;
        childSnapshot.forEach((msgSnap) => {
          const msg = msgSnap.val();
          if (msg.timestamp > lastTimestamp) lastTimestamp = msg.timestamp;
        });
        conversations.push({ friend, lastTimestamp });
      }
    });
    if (conversations.length === 0) {
      // Display "No Friends" message if there are no chats
      const noFriends = document.createElement("div");
      noFriends.textContent = "No Friends";
      noFriends.classList.add("no-friends");
      contactsContainer.appendChild(noFriends);
    } else {
      // Sort conversations by most recent message
      conversations.sort((a, b) => b.lastTimestamp - a.lastTimestamp);
      conversations.forEach((conv) => {
        addContactToList(conv.friend);
      });
    }
  }).catch((error) => console.error("Error loading conversations:", error));

  // Attach event listener for real-time filtering of contacts
  searchField.addEventListener("input", function () {
    const filter = this.value.toLowerCase();
    const contacts = contactsContainer.getElementsByClassName("contact");
    Array.from(contacts).forEach((contact) => {
      if (contact.textContent.toLowerCase().includes(filter)) {
        contact.style.display = "block";
      } else {
        contact.style.display = "none";
      }
    });
  });
}

// Select a chat from the contacts list or via search
window.selectChat = async function (contactName) {
  if (contactName === currentUser) {
    alert("You cannot chat with yourself.");
    return;
  }
  chatWith = contactName;
  document.getElementById("conversation-header").textContent = contactName;
  
  // Verify that the contact exists in the database
  const userRef = ref(database, `users/${chatWith}`);
  try {
    const snapshot = await get(userRef);
    if (!snapshot.exists()) {
      alert("User does not exist!");
      return;
    }
    // Add the contact dynamically (if not already in the list)
    addContactToList(contactName);
    loadMessages();
  } catch (error) {
    console.error("Error finding user:", error);
  }
};

// Start chat using the searched username
window.startChatWithSearchedUser = function () {
  const searchValue = document.getElementById("contactSearch").value.trim();
  if (searchValue === "") {
    alert("Please enter a username to start chat.");
    return;
  }
  selectChat(searchValue);
};

// Format timestamp helper function
function formatTimestamp(ts) {
    const messageDate = new Date(ts);
    const now = new Date();
  
    // Check if it's today
    if (
      messageDate.getFullYear() === now.getFullYear() &&
      messageDate.getMonth() === now.getMonth() &&
      messageDate.getDate() === now.getDate()
    ) {
      return messageDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
  
    // Check if it's yesterday
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    if (
      messageDate.getFullYear() === yesterday.getFullYear() &&
      messageDate.getMonth() === yesterday.getMonth() &&
      messageDate.getDate() === yesterday.getDate()
    ) {
      return `Yesterday, ${messageDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    }
  
    // Otherwise, display day abbreviation, month and date plus time
    return messageDate.toLocaleString([], { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  }
  
  window.formatTimestamp = formatTimestamp;
  
  

// Load chat messages for the selected conversation
function loadMessages() {
  const chatID = getChatID(currentUser, chatWith);
  const chatRef = ref(database, `chats/${chatID}`);

  // Remove previous listener if any
  off(chatRef, "child_added");
  document.getElementById("chat-box").innerHTML = ""; // Clear previous messages

  window.currentChatListener = onChildAdded(chatRef, (snapshot) => {
    const data = snapshot.val();
    const chatBox = document.getElementById("chat-box");
    const messageDiv = document.createElement("div");

    messageDiv.classList.add("message");
    // Create message text element
    const textSpan = document.createElement("span");
    textSpan.classList.add("text");
    if (data.sender === currentUser) {
      messageDiv.classList.add("user");
      textSpan.textContent = `You: ${data.text}`;
    } else {
      messageDiv.classList.add("other");
      textSpan.textContent = `${data.sender}: ${data.text}`;
    }
    messageDiv.appendChild(textSpan);

    // Create timestamp element and append it
    const timeSpan = document.createElement("span");
    timeSpan.classList.add("timestamp");
    timeSpan.textContent = formatTimestamp(data.timestamp);
    messageDiv.appendChild(timeSpan);

    chatBox.appendChild(messageDiv);
    chatBox.scrollTop = chatBox.scrollHeight;
  });
}

// Send a message in the current conversation
window.sendMessage = function () {
  const input = document.getElementById("messageInput");
  const message = input.value.trim();
  if (message === "" || !chatWith) return;

  const chatID = getChatID(currentUser, chatWith);
  const chatRef = ref(database, `chats/${chatID}`);

  push(chatRef, {
    text: message,
    sender: currentUser,
    timestamp: Date.now()
  });

  input.value = "";
};

// Clear the current chat history
window.clearChat = function () {
  const chatID = getChatID(currentUser, chatWith);
  const chatRef = ref(database, `chats/${chatID}`);

  if (confirm("Are you sure you want to delete all messages?")) {
    remove(chatRef)
      .then(() => {
        document.getElementById("chat-box").innerHTML = "";
        alert("Chat history cleared.");
      })
      .catch((error) => console.error("Error deleting chat:", error));
  }
};

// Generate a unique chat ID based on the two participants (alphabetically sorted)
function getChatID(user1, user2) {
  return [user1, user2].sort().join("_");
}
