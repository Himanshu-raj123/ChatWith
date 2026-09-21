const socket = io();
let activeUSers;

function generateMongoId() {
  const timestamp = Math.floor(Date.now() / 1000).toString(16).padStart(8, '0');
  const random = 'xxxxxxxxxxxxxxxx'.replace(/[x]/g, () => Math.floor(Math.random() * 16).toString(16));
  return timestamp + random;
}

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

    // Remove AI typing indicator if present
    const typingIndicator = document.getElementById('ai-typing-indicator');
    if (typingIndicator) {
      typingIndicator.remove();
    }

    let div = document.createElement('div');
    div.setAttribute('class', 'received' + (sender === 'AI' ? ' ai-message' : ''));
    if (msgData._id) div.setAttribute('data-msg-id', msgData._id);
    div.setAttribute('data-sender', msgData.sender);
    div.innerHTML = `
        <div class="msg-content">${formatMessageContent(msgData.message, msgData.sender)}</div>
        <div class="msg-meta">
           <span class="msg-copy" title="Copy message"><i class="fa-regular fa-copy"></i></span>
           <span class="msg-delete" title="Delete message"><i class="fa-regular fa-trash-can"></i></span>
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
          <div><i class="${selectedEmail === 'AI' ? 'fa-solid fa-robot' : 'fa-solid fa-user'}"></i></div>
          <div>
            <span id="reciverEmail" style="display:none;">${selectedEmail}</span>
            <span style="font-weight: 600; font-size: 1.1rem; color: #0f172a;">${selectedName}</span><br>
            <span style="font-size: 0.85rem; color: #64748b;">${selectedEmail === 'AI' ? 'AI Assistant (Swayam)' : selectedEmail}</span>
          </div>
        </div>

        <div id="chat-messages">
           ${chatHistory.map(msg => `
              <div class="${msg.sender === loggedInUserEmail ? 'sent' : (msg.sender === 'AI' ? 'received ai-message' : 'received')}" data-msg-id="${msg._id || ''}" data-sender="${msg.sender}">
                 <div class="msg-content">${formatMessageContent(msg.message, msg.sender)}</div>
                 <div class="msg-meta">
                    <span class="msg-copy" title="Copy message"><i class="fa-regular fa-copy"></i></span>
                    <span class="msg-delete" title="Delete message"><i class="fa-regular fa-trash-can"></i></span>
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
        const clientMsgId = generateMongoId();
        socket.emit("privateMessage", inputMessage, loggedInUserEmail, selectedEmail, clientMsgId);

        // Show message immediately
        let chatbox = document.getElementById('chat-messages');
        let div = document.createElement('div');
        div.setAttribute('class', 'sent');
        div.setAttribute('data-msg-id', clientMsgId);
        div.setAttribute('data-sender', loggedInUserEmail);
        div.innerHTML = `
            <div class="msg-content">${formatMessageContent(inputMessage, loggedInUserEmail)}</div>
            <div class="msg-meta">
               <span class="msg-copy" title="Copy message"><i class="fa-regular fa-copy"></i></span>
               <span class="msg-delete" title="Delete message"><i class="fa-regular fa-trash-can"></i></span>
               <span class="msg-time">${formatTime(new Date())}</span>
               <span class="msg-status"><i class="fa-solid fa-check"></i></span>
            </div>
        `;
        chatbox.appendChild(div);

        // If chatting with AI, show temporary typing bubble
        if (selectedEmail === 'AI') {
          const oldTyping = document.getElementById('ai-typing-indicator');
          if (oldTyping) oldTyping.remove();

          const typingDiv = document.createElement('div');
          typingDiv.id = 'ai-typing-indicator';
          typingDiv.className = 'received ai-message typing-indicator-bubble';
          typingDiv.innerHTML = `
            <div class="msg-content" style="color: #64748b; font-style: italic; display: flex; align-items: center; gap: 8px;">
               <i class="fa-solid fa-spinner fa-spin"></i> Swayam is thinking...
            </div>
          `;
          chatbox.appendChild(typingDiv);
        }

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

// ========== MESSAGE DELETION LOGIC ==========
let currentDeleteTarget = {
  messageId: null,
  sender: null,
  element: null
};

// Event delegation for delete icon click on messages
document.addEventListener('click', (event) => {
  const deleteBtn = event.target.closest('.msg-delete');
  if (deleteBtn) {
    const msgDiv = deleteBtn.closest('.sent, .received');
    if (!msgDiv) return;

    const msgId = msgDiv.getAttribute('data-msg-id');
    const msgSender = msgDiv.getAttribute('data-sender');

    currentDeleteTarget = {
      messageId: msgId,
      sender: msgSender,
      element: msgDiv
    };

    openMsgDeleteModal(msgSender);
  }
});

function openMsgDeleteModal(msgSender) {
  const modal = document.getElementById('delete-message-modal');
  const btnDeleteEveryone = document.getElementById('btn-delete-everyone');
  const prompt = document.getElementById('msg-delete-prompt');
  const activeChat = document.getElementById('reciverEmail');
  const currentReceiver = activeChat ? activeChat.innerText : null;

  if (modal) {
    if (msgSender === loggedInUserEmail && currentReceiver !== 'AI') {
      if (btnDeleteEveryone) btnDeleteEveryone.style.display = 'flex';
      if (prompt) prompt.innerText = 'You can delete this message for everyone in this chat or only for yourself.';
    } else {
      if (btnDeleteEveryone) btnDeleteEveryone.style.display = 'none';
      if (prompt) prompt.innerText = 'This will remove the message only from your chat history.';
    }
    modal.style.display = 'flex';
  }
}

function closeMsgDeleteModal() {
  const modal = document.getElementById('delete-message-modal');
  if (modal) modal.style.display = 'none';
  currentDeleteTarget = { messageId: null, sender: null, element: null };
}

document.getElementById('close-msg-delete-btn')?.addEventListener('click', closeMsgDeleteModal);
document.getElementById('btn-cancel-msg-delete')?.addEventListener('click', closeMsgDeleteModal);

const msgDeleteModal = document.getElementById('delete-message-modal');
if (msgDeleteModal) {
  window.addEventListener('click', (e) => {
    if (e.target === msgDeleteModal) {
      closeMsgDeleteModal();
    }
  });
}

// Handle "Delete for me"
document.getElementById('btn-delete-me')?.addEventListener('click', () => {
  if (!currentDeleteTarget.messageId) {
    closeMsgDeleteModal();
    return;
  }

  const msgId = currentDeleteTarget.messageId;
  const msgEl = currentDeleteTarget.element;

  // Socket notification
  socket.emit('deleteForMe', {
    messageId: msgId,
    userEmail: loggedInUserEmail
  });

  // REST API fallback
  fetch('/message/delete', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messageId: msgId, type: 'me' })
  }).catch(() => {});

  // Remove from UI with smooth fade
  if (msgEl) {
    msgEl.classList.add('message-deleting');
    setTimeout(() => msgEl.remove(), 250);
  }

  closeMsgDeleteModal();
});

// Handle "Delete for everyone"
document.getElementById('btn-delete-everyone')?.addEventListener('click', () => {
  if (!currentDeleteTarget.messageId) {
    closeMsgDeleteModal();
    return;
  }

  const msgId = currentDeleteTarget.messageId;
  const msgEl = currentDeleteTarget.element;
  const activeChat = document.getElementById('reciverEmail');
  const currentReceiver = activeChat ? activeChat.innerText : null;

  // Socket notification
  socket.emit('deleteForEveryone', {
    messageId: msgId,
    sender: loggedInUserEmail,
    receiver: currentReceiver
  });

  // REST API fallback
  fetch('/message/delete', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messageId: msgId, type: 'everyone', receiver: currentReceiver })
  }).catch(() => {});

  // Remove from UI with smooth fade
  if (msgEl) {
    msgEl.classList.add('message-deleting');
    setTimeout(() => msgEl.remove(), 250);
  }

  closeMsgDeleteModal();
});

// Real-time messageDeleted listener
socket.on('messageDeleted', ({ messageId }) => {
  if (!messageId) return;
  const target = document.querySelector(`[data-msg-id="${messageId}"]`);
  if (target) {
    target.classList.add('message-deleting');
    setTimeout(() => target.remove(), 250);
  }
});
