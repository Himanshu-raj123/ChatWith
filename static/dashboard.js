let chatForm = document.getElementById('chat-input');
let input = document.getElementById('messageInput');

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

// Register active user
socket.emit("active", loggedInUserEmail, loggedInUserName);

// Handle sending message
chatForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const inputMessage = input.value.trim();
  if (inputMessage) {
    let selectedEmail = document.getElementById('reciverEmail').innerText;
    socket.emit("privateMessage", inputMessage, loggedInUserEmail, selectedEmail);

    // Show message in sender’s chat box
    let chatbox = document.getElementById('chat-messages');
    let div = document.createElement('div');
    div.setAttribute('class', 'sent');
    div.innerHTML = `
        <div class="msg-content">${inputMessage}</div>
        <div class="msg-meta">
           <span class="msg-time">${formatTime(new Date())}</span>
           <span class="msg-status"><i class="fa-solid fa-check"></i></span>
        </div>
    `;
    chatbox.appendChild(div);
    setTimeout(() => {
      chatbox.scrollTop = chatbox.scrollHeight;
    }, 0);

    input.value = "";
  }
});

socket.on("privateMessage", (msgData) => {
  let activeChat = document.getElementById('reciverEmail');
  let sender = msgData.sender;

  // Show only if current chat is with the sender
  if (activeChat && activeChat.innerText === sender && loggedInUserEmail != sender) {
    let chatbox = document.getElementById('chat-messages');
    let div = document.createElement('div');
    div.setAttribute('class', 'received');
    div.innerHTML = `
        <div class="msg-content">${msgData.message}</div>
        <div class="msg-meta">
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
          <div><i class="fa-solid fa-user"></i></div>
          <div>
            <span id="reciverEmail" style="display:none;">${selectedEmail}</span>
            <span style="font-weight: 600; font-size: 1.1rem; color: #1e293b;">${selectedName}</span><br>
            <span style="font-size: 0.85rem; color: #64748b;">${selectedEmail}</span>
          </div>
        </div>

        <div id="chat-messages">
           ${chatHistory.map(msg => `
              <div class="${msg.sender === loggedInUserEmail ? 'sent' : 'received'}">
                 <div class="msg-content">${msg.message}</div>
                 <div class="msg-meta">
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
            <div class="msg-content">${inputMessage}</div>
            <div class="msg-meta">
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
