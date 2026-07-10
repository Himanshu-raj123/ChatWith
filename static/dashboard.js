const socket = io();
let activeUSers;

function formatTime(timestamp) {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  let hours = date.getHours();
  let minutes = date.getMinutes();
  const ampm = hours >= 12 ? 'pm' : 'am';
  hours = hours % 12;
  hours = hours ? hours : 12;
  minutes = minutes < 10 ? '0' + minutes : minutes;
  return hours + ':' + minutes + ' ' + ampm;
}

function formatMessageContent(message, sender) {
  if (message === undefined || message === null) {
    return '';
  }
  message = String(message);
  if (sender === 'AI') {
    if (typeof marked !== 'undefined') {
      return marked.parse(message);
    }
  }
  const escaped = message
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
  return escaped.replace(/\n/g, '<br>');
}

// Global click listener for copy message text functionality (Event Delegation)
document.addEventListener('click', async (event) => {
  const copyBtn = event.target.closest('.msg-copy');
  if (copyBtn) {
    const msgDiv = copyBtn.closest('.sent, .received');
    const contentDiv = msgDiv.querySelector('.msg-content');
    const textToCopy = contentDiv.innerText || contentDiv.textContent;
    
    try {
      await navigator.clipboard.writeText(textToCopy.trim());
      const icon = copyBtn.querySelector('i');
      icon.className = 'fa-solid fa-check';
      copyBtn.style.color = '#10b981'; // success green
      setTimeout(() => {
        icon.className = 'fa-regular fa-copy';
        copyBtn.style.color = '';
      }, 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  }
});

// Register active user
socket.emit("active", loggedInUserEmail, loggedInUserName);

socket.on("privateMessage", (msgData) => {
  let activeChat = document.getElementById('reciverEmail');
  let sender = msgData.sender;

  // Show only if current chat is with the sender
  if (activeChat && activeChat.innerText === sender && loggedInUserEmail != sender) {
    let chatbox = document.getElementById('chat-messages');
    let div = document.createElement('div');
    div.setAttribute('class', 'received' + (sender === 'AI' ? ' ai-message' : ''));
    div.innerHTML = `
        <div class="msg-content">${formatMessageContent(msgData.message, msgData.sender)}</div>
        <div class="msg-meta">
           <span class="msg-copy" title="Copy message"><i class="fa-regular fa-copy"></i></span>
           <span class="msg-time">${formatTime(msgData.timestamp)}</span>
        </div>
    `;
    chatbox.appendChild(div);
    chatbox.scrollTop = chatbox.scrollHeight;
    
    // Immediately mark as seen
    socket.emit("markAsSeen", { sender: sender, receiver: loggedInUserEmail });
  } else {
    // The user is not currently in this chat room. Show a notification badge!
    const senderCard = document.querySelector(`.user-card[data-email="${sender}"]`);
    if (senderCard) {
      let badge = senderCard.querySelector('.new-msg-badge');
      if (!badge) {
         badge = document.createElement('span');
         badge.className = 'new-msg-badge';
         badge.innerText = 'New!';
         
         const nameEl = senderCard.querySelector('.user-name');
         nameEl.appendChild(badge);
      }
    }
  }
});

socket.on('ActiveUsers', (actUsers) => {
  activeUSers = actUsers;
  
  // Add newly registered active users to the UI dynamically
  for (let email in activeUSers) {
    if (email === loggedInUserEmail) continue;
    if (!document.querySelector(`.user-card[data-email="${email}"]`)) {
      let card = document.createElement('div');
      card.className = 'user-card';
      card.setAttribute('data-email', email);
      card.setAttribute('data-name', activeUSers[email].name);
      card.innerHTML = `
        <div class="user-info">
          <span class="user-name">${activeUSers[email].name}</span>
          <span class="user-email">${email}</span>
        </div>
        <div class="status-indicator online" title="Online"></div>
      `;
      document.getElementById('chats').appendChild(card);
      setupChatSwitch(card);
    }
  }

  // Update online indicators for each user card
  const userCards = document.querySelectorAll('.user-card');
  userCards.forEach(card => {
    const email = card.getAttribute('data-email');
    const indicator = card.querySelector('.status-indicator');
    if (indicator) {
      if (activeUSers[email]) {
        indicator.classList.add('online');
        indicator.setAttribute('title', 'Online');
      } else {
        indicator.classList.remove('online');
        indicator.setAttribute('title', 'Offline');
      }
    }
  });
});

// Switching chats setup
function setupChatSwitch(card) {
  card.onclick = async () => {
    const selectedEmail = card.getAttribute('data-email');
    const selectedName = card.getAttribute('data-name');

    // Toggle views on mobile
    document.getElementById('id1').classList.add('mobile-hidden');
    document.getElementById('id2').classList.remove('mobile-hidden');

    // Remove "New!" badge if it exists
    let badge = card.querySelector('.new-msg-badge');
    if (badge) badge.remove();

    // Fetch chat history from our new database route
    let chatHistory = [];
    try {
      const response = await fetch(`/message/history/${loggedInUserEmail}/${selectedEmail}`);
      if (response.ok) {
        chatHistory = await response.json();
        // Let the server know we have seen the messages
        socket.emit("markAsSeen", { sender: selectedEmail, receiver: loggedInUserEmail });
      }
    } catch (err) {
      console.error("Error fetching chat history", err);
    }

    // Replace chat UI
    let id2 = document.getElementById("id2");
    id2.innerHTML = `
        <div id="user">
          <button id="mobile-back-btn" class="mobile-back" title="Back to users"><i class="fa-solid fa-arrow-left"></i></button>
          <div><i class="fa-solid fa-user"></i></div>
          <div>
            <span id="reciverEmail" style="display:none;">${selectedEmail}</span>
            <span style="font-weight: 600; font-size: 1.1rem; color: #0f172a;">${selectedName}</span><br>
            <span style="font-size: 0.85rem; color: #64748b;">${selectedEmail}</span>
          </div>
        </div>

        <div id="chat-messages">
           ${chatHistory.map(msg => `
              <div class="${msg.sender === loggedInUserEmail ? 'sent' : (msg.sender === 'AI' ? 'received ai-message' : 'received')}">
                 <div class="msg-content">${formatMessageContent(msg.message, msg.sender)}</div>
                 <div class="msg-meta">
                    <span class="msg-copy" title="Copy message"><i class="fa-regular fa-copy"></i></span>
                    <span class="msg-time">${formatTime(msg.timestamp)}</span>
                    ${msg.sender === loggedInUserEmail ? 
                       `<span class="msg-status"><i class="fa-solid ${msg.seen ? 'fa-check-double' : 'fa-check'}"></i></span>` 
                       : ''}
                 </div>
              </div>
           `).join('')}
        </div>

        <form id="chat-input">
          <input type="text" id="messageInput" placeholder="Type a message..." required autocomplete="off"/>
          <button type="submit" id="sendBtn"><i class="fa-solid fa-paper-plane"></i></button>
        </form>
      `;

    // Mobile back button event listener
    const backBtn = document.getElementById('mobile-back-btn');
    if (backBtn) {
      backBtn.addEventListener('click', () => {
        document.getElementById('id1').classList.remove('mobile-hidden');
        document.getElementById('id2').classList.add('mobile-hidden');
      });
    }

    // Scroll chat to bottom immediately
    let chatbox = document.getElementById('chat-messages');
    chatbox.scrollTop = chatbox.scrollHeight;

    // Attach new form handler for this chat
    let chatForm = document.getElementById('chat-input');
    let input = document.getElementById('messageInput');

    chatForm.addEventListener('submit', (event) => {
      event.preventDefault();
      const inputMessage = input.value.trim();
      if (inputMessage) {
        socket.emit("privateMessage", inputMessage, loggedInUserEmail, selectedEmail);

        // Show message immediately
        let chatbox = document.getElementById('chat-messages');
        let div = document.createElement('div');
        div.setAttribute('class', 'sent');
        div.innerHTML = `
            <div class="msg-content">${formatMessageContent(inputMessage, loggedInUserEmail)}</div>
            <div class="msg-meta">
               <span class="msg-copy" title="Copy message"><i class="fa-regular fa-copy"></i></span>
               <span class="msg-time">${formatTime(new Date())}</span>
               <span class="msg-status"><i class="fa-solid fa-check"></i></span>
            </div>
        `;
        chatbox.appendChild(div);
        chatbox.scrollTop = chatbox.scrollHeight; // keep scrolled down

        input.value = "";
      }
    });
  };
}

// Attach click event to all initial user cards
document.querySelectorAll(".user-card").forEach(setupChatSwitch);

socket.on("messagesSeen", (seenByEmail) => {
  let activeChat = document.getElementById('reciverEmail');
  if (activeChat && activeChat.innerText === seenByEmail) {
      document.querySelectorAll('#chat-messages .sent .msg-status i').forEach(icon => {
          icon.className = 'fa-solid fa-check-double';
      });
  }
});

// Settings modal toggles
const settingsBtn = document.getElementById('settings-btn');
const settingsModal = document.getElementById('settings-modal');
const closeSettingsBtn = document.getElementById('close-settings-btn');
const deleteAccountBtn = document.getElementById('delete-account-btn');

const deleteConfirmModal = document.getElementById('delete-confirm-modal');
const cancelDeleteBtn = document.getElementById('cancel-delete-btn');
const confirmDeleteBtn = document.getElementById('confirm-delete-btn');

if (settingsBtn) {
   settingsBtn.addEventListener('click', () => {
      settingsModal.style.display = 'flex';
   });
}

if (closeSettingsBtn) {
   closeSettingsBtn.addEventListener('click', () => {
      settingsModal.style.display = 'none';
   });
}

// Close modal on click outside modal-card
window.addEventListener('click', (e) => {
   if (e.target === settingsModal) {
      settingsModal.style.display = 'none';
   }
   if (e.target === deleteConfirmModal) {
      deleteConfirmModal.style.display = 'none';
   }
});

if (deleteAccountBtn) {
   deleteAccountBtn.addEventListener('click', () => {
      deleteConfirmModal.style.display = 'flex';
   });
}

if (cancelDeleteBtn) {
   cancelDeleteBtn.addEventListener('click', () => {
      deleteConfirmModal.style.display = 'none';
   });
}

if (confirmDeleteBtn) {
   confirmDeleteBtn.addEventListener('click', async () => {
      try {
         confirmDeleteBtn.disabled = true;
         confirmDeleteBtn.innerText = "Deleting...";
         
         const response = await fetch('/user/delete-account', {
            method: 'POST',
            headers: {
               'Content-Type': 'application/json'
            }
         });

         if (response.ok) {
            window.location.href = '/user/signup';
         } else {
            alert("Failed to delete account. Please try again.");
            confirmDeleteBtn.disabled = false;
            confirmDeleteBtn.innerText = "Yes, Delete Account";
         }
      } catch (err) {
         console.error("Account deletion error:", err);
         alert("Server communication error.");
         confirmDeleteBtn.disabled = false;
         confirmDeleteBtn.innerText = "Yes, Delete Account";
      }
   });
}
