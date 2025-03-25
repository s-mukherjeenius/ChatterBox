// chat-part1.js
import { 
    ref, 
    get, 
    push, 
    onChildAdded, 
    remove, 
    off, 
    query, 
    orderByChild, 
    equalTo, 
    set 
  } from "https://www.gstatic.com/firebasejs/11.5.0/firebase-database.js";
  
  import { database } from "./firebase.js";
  import { getChatID, formatTimestamp } from "./helpers.js";
  import { getCurrentUser } from "./auth.js";
  import { listenForTypingStatus } from "./chat-part2.js"; // Import from Part 2
  
  let chatWith = null; // Friend's UID.
  let currentChatListener = null;
  
  /**
   * Ensures the chat node has a participants property with both UIDs.
   * Also initializes a messages child if it doesn't exist.
   */
  async function ensureChatHasParticipants(uid1, uid2) {
    const chatID = getChatID(uid1, uid2);
    const chatRef = ref(database, `chats/${chatID}`);
    const snapshot = await get(chatRef);
  
    if (!snapshot.exists()) {
      // Create a new chat object with participants and an empty messages node.
      await set(chatRef, {
        participants: {
          [uid1]: true,
          [uid2]: true
        },
        messages: {}
      });
    } else {
      // Chat exists, but let's ensure participants is present.
      const data = snapshot.val();
      if (!data.participants) {
        data.participants = {
          [uid1]: true,
          [uid2]: true
        };
      } else {
        // Make sure both UIDs are present
        data.participants[uid1] = true;
        data.participants[uid2] = true;
      }
      // If messages doesn't exist, create it
      if (!data.messages) {
        data.messages = {};
      }
      await set(chatRef, data);
    }
  }
  
  // Helper function to sanitize keys for Firebase paths.
  function sanitizeKey(key) {
    return key.replace(/[.#$[\]]/g, ",");
  }
  
  export function addContactToList(contactUID, displayName) {
    const contactsContainer = document.getElementById("contacts");
  
    // Remove "No Friends" message if it exists.
    const noFriendsMessage = contactsContainer.querySelector(".no-friends");
    if (noFriendsMessage) {
      noFriendsMessage.remove();
    }
  
    // Avoid duplicates.
    if (contactsContainer.querySelector(`[data-contact="${contactUID}"]`)) {
      return;
    }
  
    const contactDiv = document.createElement("div");
    contactDiv.classList.add("contact");
    contactDiv.setAttribute("data-contact", contactUID);
    contactDiv.textContent = displayName || contactUID;
    contactDiv.addEventListener("click", () => selectChat(contactUID));
    contactsContainer.appendChild(contactDiv);
  }
  
  export function loadConversations() {
    const currentUserObj = getCurrentUser();
    if (!currentUserObj) return;
    const currentUID = currentUserObj.uid;
    const contactsContainer = document.getElementById("contacts");
    contactsContainer.innerHTML = ""; // Clear previous list.
  
    // Create search input and Start Chat button.
    const searchField = document.createElement("input");
    searchField.id = "contactSearch";
    searchField.placeholder = "Search contacts by username...";
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
          // Check if the chat's participants include currentUID.
          if (childSnapshot.child("participants").hasChild(currentUID)) {
            const chatID = childSnapshot.key; // Expected format "uid1_uid2"
            const parts = chatID.split("_");
            // Determine friend UID.
            const friendUID = (parts[0] === currentUID) ? parts[1] : parts[0];
            let lastTimestamp = 0;
            // Find the latest message timestamp
            const chatData = childSnapshot.val();
            if (chatData.messages) {
              Object.values(chatData.messages).forEach((msg) => {
                if (msg.timestamp > lastTimestamp) {
                  lastTimestamp = msg.timestamp;
                }
              });
            }
            conversations.push({ friend: friendUID, lastTimestamp });
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
            // Fetch friend's display name from /users/<friendUID>.
            const userRef = ref(database, `users/${conv.friend}`);
            get(userRef)
              .then((snapshot) => {
                const friendData = snapshot.val();
                const displayName = friendData ? friendData.username : conv.friend;
                addContactToList(conv.friend, displayName);
              })
              .catch((error) => {
                console.error("Error fetching friend data:", error);
                addContactToList(conv.friend, conv.friend);
              });
          });
        }
      })
      .catch((error) => console.error("Error loading conversations:", error));
  
    // Attach listener for filtering contacts.
    searchField.addEventListener("input", function () {
      const filter = this.value.toLowerCase();
      const contacts = contactsContainer.getElementsByClassName("contact");
      Array.from(contacts).forEach((contact) => {
        const text = contact.textContent.toLowerCase();
        contact.style.display = text.includes(filter) ? "block" : "none";
      });
    });
  }
  
  export async function selectChat(friendUID) {
    const currentUserObj = getCurrentUser();
    if (!currentUserObj) return;
    const currentUID = currentUserObj.uid;
    if (friendUID === currentUID) {
      alert("You cannot chat with yourself.");
      return;
    }
    chatWith = friendUID;
  
    // 1) Ensure the chat node has participants for both users
    await ensureChatHasParticipants(currentUID, friendUID);
  
    // 2) Fetch friend's details from /users/<friendUID>.
    const userRef = ref(database, `users/${sanitizeKey(friendUID)}`);
    try {
      const snapshot = await get(userRef);
      if (!snapshot.exists()) {
        alert("User does not exist!");
        return;
      }
      const friendData = snapshot.val();
      const displayName = friendData ? friendData.username : friendUID;
      document.getElementById("conversation-header").textContent = displayName;
      loadMessages();
      // Start listening for typing status.
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
    // Query /users/ to find a user with username equal to searchValue.
    const usersRef = ref(database, "users");
    import("https://www.gstatic.com/firebasejs/11.5.0/firebase-database.js").then(({ query, orderByChild, equalTo }) => {
      const q = query(usersRef, orderByChild("username"), equalTo(searchValue));
      get(q)
        .then((snapshot) => {
          if (snapshot.exists()) {
            let friendUID = null;
            snapshot.forEach((child) => {
              friendUID = child.key;
            });
            if (friendUID) {
              selectChat(friendUID);
            } else {
              alert("User not found.");
            }
          } else {
            alert("User not found.");
          }
        })
        .catch((error) => {
          console.error("Error searching user:", error);
          alert("Error searching user: " + error.message);
        });
    });
  }
  
  export function loadMessages() {
    const currentUserObj = getCurrentUser();
    if (!currentUserObj || !chatWith) return;
    const currentUID = currentUserObj.uid;
    // Generate chat ID using UIDs (assumed sorted, e.g., "uid1_uid2").
    const chatID = getChatID(currentUID, chatWith);
    // We'll read messages from `chats/${chatID}/messages`
    const chatRef = ref(database, `chats/${chatID}/messages`);
  
    // Remove any previous listener.
    off(chatRef, "child_added");
    document.getElementById("chat-box").innerHTML = ""; // Clear old messages.
  
    onChildAdded(chatRef, (snapshot) => {
      const data = snapshot.val();
      const chatBox = document.getElementById("chat-box");
      const messageDiv = document.createElement("div");
      messageDiv.classList.add("message");
  
      const textSpan = document.createElement("span");
      textSpan.classList.add("text");
      if (data.sender === currentUID) {
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
    if (!currentUserObj || !chatWith) return;
    const currentUID = currentUserObj.uid;
    if (message.trim() === "") return;
  
    // Push the new message under `chats/${chatID}/messages`.
    const chatID = getChatID(currentUID, chatWith);
    const messagesRef = ref(database, `chats/${chatID}/messages`);
    push(messagesRef, {
      text: message,
      sender: currentUID,
      timestamp: Date.now()
    });
  }
  
  export function clearChat() {
    const currentUserObj = getCurrentUser();
    if (!currentUserObj || !chatWith) return;
    const currentUID = currentUserObj.uid;
    const chatID = getChatID(currentUID, chatWith);
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
  