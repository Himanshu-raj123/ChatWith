let chatForm = document.getElementById('chat-input')
let input =  document.getElementById('messageInput')

const socket = io();

socket.emit("active", loggedInUserEmail)

chatForm.addEventListener('submit', (event) => {
   event.preventDefault();
   const inputMessage = input.value.trim();
   if (inputMessage) {
      let selectedEmail =  document.getElementById('reciverEmail').value
      socket.emit("privateMessage", inputMessage, loggedInUserEmail,selectedEmail);
      input.value = "";
   }
})

socket.on("privateMessage", ( sender,message) => {

  if(document.getElementById('reciverEmail').innerText === sender || document.getElementById('reciverEmail').innerText === receiver){
   let chatbox = document.getElementById('chat-messages')
   let div = document.createElement('div')

   if (sender === loggedInUserEmail) {
      div.setAttribute('class', 'sent')
   } else {
      div.setAttribute('class', 'received')
   }

   div.innerText = message;
   chatbox.appendChild(div);
  }
})

let children = document.getElementById("chats").children;
let chats = Array.from(children)

chats.forEach(elm => {
  elm.onclick = () => {
    const selectedEmail = elm.innerText;   // email from clicked user

    // id2 div select karo
    let id2 = document.getElementById("id2");

    // id2 ke andar ka content replace karo
    id2.innerHTML = `
      <div id="user">
        <div><i class="fa-solid fa-user"></i></div>
        <div>
          <span id="reciverEmail">${selectedEmail}</span><br>
          <span>(Chatting Now)</span>
        </div>
      </div>

      <div id="chat-messages"></div>

      <form id="chat-input">
        <input type="text" id="messageInput" placeholder="Type a message..." />
        <button type="submit" id="sendBtn"><i class="fa-solid fa-paper-plane"></i></button>
      </form>
    `;


    let chatForm = document.getElementById('chat-input');
    let input = document.getElementById('messageInput');

    chatForm.addEventListener('submit', (event) => {
      event.preventDefault();
      const inputMessage = input.value.trim();
      if (inputMessage) {
        socket.emit("privateMessage", inputMessage, loggedInUserEmail, selectedEmail);
        input.value = "";
      }
    });
  };
});

