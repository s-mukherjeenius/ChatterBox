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
  import { listenForTypingStatus } from "./chat-part2.js";
  
  let currentChatListener = null;
  
  /**
   * Ensures the chat node under /chats/<chatID> has:
   *   participants: { uid1: true, uid2: true }
   *   messages: {}
   */
  async function ensureChatHasParticipants(uid1, uid2) {
    const chatID = getChatID(uid1, uid2);
    const chatRef = ref(database, `chats/${chatID}`);
    const snapshot = await get(chatRef);
  
    if (!snapshot.exists()) {
      await set(chatRef, {
        participants: {
          [uid1]: true,
          [uid2]: true
        },
        messages: {}
      });
    } else {
      const data = snapshot.val();
      if (!data.participants) {
        data.participants = { [uid1]: true, [uid2]: true };
      } else {
        data.participants[uid1] = true;
        data.participants[uid2] = true;
      }
      if (!data.messages) {
        data.messages = {};
      }
      await set(chatRef, data);
    }
  }
  
  /**
   * Adds a contact (friendUID) to the left sidebar (contacts).
   */
  export function addContactToList(contactUID, displayName) {
    const contactsContainer = document.getElementById("contacts");
    const noFriendsMessage = contactsContainer.querySelector(".no-friends");
    if (noFriendsMessage) noFriendsMessage.remove();
  
    // Avoid duplicates
    if (contactsContainer.querySelector(`[data-contact="${contactUID}"]`)) return;
  
    const contactDiv = document.createElement("div");
    contactDiv.classList.add("contact");
    contactDiv.setAttribute("data-contact", contactUID);
    contactDiv.textContent = displayName || contactUID;
    contactDiv.addEventListener("click", () => selectChat(contactUID));
    contactsContainer.appendChild(contactDiv);
  }
  
  /**
   * Loads all conversations that include the current user.
   */
  export function loadConversations() {
    const currentUserObj = getCurrentUser();
    if (!currentUserObj) return;
    const currentUID = currentUserObj.uid;
    const contactsContainer = document.getElementById("contacts");
    contactsContainer.innerHTML = "";
  
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
  
    const chatsRef = ref(database, "chats");
    get(chatsRef)
      .then((snapshot) => {
        const conversations = [];
        snapshot.forEach((childSnapshot) => {
          // Check if current user is in participants
          if (childSnapshot.child("participants").hasChild(currentUID)) {
            const chatID = childSnapshot.key; // e.g. "uid1_uid2"
            const parts = chatID.split("_");
            const friendUID = (parts[0] === currentUID) ? parts[1] : parts[0];
  
            let lastTimestamp = 0;
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
  
    // Filter contacts by search.
    searchField.addEventListener("input", function () {
      const filter = this.value.toLowerCase();
      const contacts = contactsContainer.getElementsByClassName("contact");
      Array.from(contacts).forEach((contact) => {
        const text = contact.textContent.toLowerCase();
        contact.style.display = text.includes(filter) ? "block" : "none";
      });
    });
  }
  
  /**
   * Called when the user selects a friend from the contacts or from search results.
   */
  export async function selectChat(friendUID) {
    const currentUserObj = getCurrentUser();
    if (!currentUserObj) return;
    const currentUID = currentUserObj.uid;
  
    if (friendUID === currentUID) {
      alert("You cannot chat with yourself.");
      return;
    }
  
    // Save friend UID globally so main.js can reference it for typing updates.
    window.chatWith = friendUID;
  
    // Ensure participants property is present in the chat object.
    await ensureChatHasParticipants(currentUID, friendUID);
  
    // Fetch friend's display name
    const userRef = ref(database, `users/${friendUID}`);
    try {
      const snapshot = await get(userRef);
      if (!snapshot.exists()) {
        alert("User does not exist!");
        return;
      }
      const friendData = snapshot.val();
      const displayName = friendData ? friendData.username : friendUID;
  
      // Store friend’s display name so we can show it in messages and typing indicator.
      window.chatPartnerName = displayName;
  
      // Update conversation header
      document.getElementById("conversation-header").textContent = displayName;
  
      loadMessages();
      // Start listening for typing status
      listenForTypingStatus(friendUID);
    } catch (error) {
      console.error("Error finding user:", error);
    }
  }
  
  /**
   * Search for a user by their "username" in /users.
   */
  export function startChatWithSearchedUser() {
    const searchValue = document.getElementById("contactSearch").value.trim();
    if (searchValue === "") {
      alert("Please enter a username to start chat.");
      return;
    }
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
  
  /**
   * Load all messages from /chats/<chatID>/messages
   */
  export function loadMessages() {
    const currentUserObj = getCurrentUser();
    if (!currentUserObj || !window.chatWith) return;
    const currentUID = currentUserObj.uid;
    const chatID = getChatID(currentUID, window.chatWith);
  
    const messagesRef = ref(database, `chats/${chatID}/messages`);
    off(messagesRef, "child_added");
    document.getElementById("chat-box").innerHTML = "";
  
    onChildAdded(messagesRef, (snapshot) => {
      const data = snapshot.val();
      const chatBox = document.getElementById("chat-box");
      const messageDiv = document.createElement("div");
      messageDiv.classList.add("message");
      
      // Create the bubble container
      const bubbleDiv = document.createElement("div");
      bubbleDiv.classList.add("bubble");
      
      // If it's an incoming message, show the username above the bubble.
      if (data.sender !== currentUID) {
        const usernameHeader = document.createElement("div");
        usernameHeader.classList.add("username-header");
        usernameHeader.textContent = window.chatPartnerName || data.sender;
        bubbleDiv.appendChild(usernameHeader);
      }
      
      // Create the message text element.
      const messageTextDiv = document.createElement("div");
      messageTextDiv.classList.add("message-text");
      messageTextDiv.textContent = data.text;
      bubbleDiv.appendChild(messageTextDiv);
      
      // Append the bubble to the message container.
      messageDiv.appendChild(bubbleDiv);
      
      // Create and append the timestamp.
      const timeSpan = document.createElement("span");
      timeSpan.classList.add("timestamp");
      timeSpan.textContent = formatTimestamp(data.timestamp);
      messageDiv.appendChild(timeSpan);
      
      // Add alignment classes.
      if (data.sender === currentUID) {
        messageDiv.classList.add("user");
      } else {
        messageDiv.classList.add("other");
      }
      
      chatBox.appendChild(messageDiv);
      chatBox.scrollTop = chatBox.scrollHeight;
    });
    
  }
  
  /**
   * Sends a message to /chats/<chatID>/messages
   */
  export function sendMessage(message) {
    const currentUserObj = getCurrentUser();
    if (!currentUserObj || !window.chatWith) return;
    const currentUID = currentUserObj.uid;
    if (message.trim() === "") return;
  
    const chatID = getChatID(currentUID, window.chatWith);
    const messagesRef = ref(database, `chats/${chatID}/messages`);
    push(messagesRef, {
      text: message,
      sender: currentUID,
      timestamp: Date.now()
    });
  }
  
  /**
   * Clears the entire chat by removing the chat node from /chats/<chatID>.
   */
  export function clearChat() {
    const currentUserObj = getCurrentUser();
    if (!currentUserObj || !window.chatWith) return;
    const currentUID = currentUserObj.uid;
    const chatID = getChatID(currentUID, window.chatWith);
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
  