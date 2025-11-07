const baseURL = window.location.origin;
const token = localStorage.getItem("jwt_token");

if (!token) {
  window.location.href = "login.html";
}

// Decodificar token para obtener username
function parseJwt(token) {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    return JSON.parse(jsonPayload);
  } catch (e) {
    return null;
  }
}

const userData = parseJwt(token);
if (userData) {
  document.getElementById("username").innerText = userData.username;
}

// Cargar salas activas
async function loadRooms() {
  try {
    const resp = await fetch(`${baseURL}/rooms`, {
      headers: { token }
    });
    const rooms = await resp.json();
    
    const container = document.getElementById("roomsList");
    container.innerHTML = "";
    
    if (rooms.length === 0) {
      container.innerHTML = "<p style='text-align:center; color:#666;'>No hay salas activas. ¡Crea una!</p>";
      return;
    }
    
    rooms.forEach(room => {
      const div = document.createElement("div");
      div.className = "room-card";
      div.onclick = () => enterRoom(room.code);
      
      div.innerHTML = `
        <span class="room-code">${room.code}</span>
        <h4>${room.name}</h4>
        <p style="color:#666; margin:10px 0;">${room.description || 'Sin descripción'}</p>
        <p style="color:#999; font-size:0.9rem;">
          Creada por: ${room.creator.username} | 
          Votaciones: ${room._count.polls}
        </p>
      `;
      
      container.appendChild(div);
    });
  } catch (err) {
    console.error("Error al cargar salas:", err);
    document.getElementById("roomsList").innerHTML = "<p style='color:red;'>Error al cargar las salas</p>";
  }
}

// Crear sala
async function createRoom() {
  const name = document.getElementById("roomName").value;
  const description = document.getElementById("roomDescription").value;
  const msg = document.getElementById("createMsg");
  
  if (!name) {
    msg.innerText = "El nombre es requerido";
    msg.className = "msg msg-error";
    return;
  }
  
  try {
    const resp = await fetch(`${baseURL}/rooms`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        token
      },
      body: JSON.stringify({ name, description })
    });
    
    const data = await resp.json();
    
    if (resp.ok) {
      msg.innerText = `¡Sala creada! Código: ${data.code}`;
      msg.className = "msg msg-success";
      setTimeout(() => {
        hideCreateRoomModal();
        enterRoom(data.code);
      }, 1500);
    } else {
      msg.innerText = data.message || "Error al crear sala";
      msg.className = "msg msg-error";
    }
  } catch (err) {
    msg.innerText = "Error de conexión";
    msg.className = "msg msg-error";
  }
}

// Unirse con código
async function joinRoom() {
  const code = document.getElementById("roomCode").value.toUpperCase();
  const msg = document.getElementById("joinMsg");
  
  if (!code) {
    msg.innerText = "Ingresa un código";
    msg.className = "msg msg-error";
    return;
  }
  
  try {
    const resp = await fetch(`${baseURL}/rooms/${code}`, {
      headers: { token }
    });
    
    if (resp.ok) {
      enterRoom(code);
    } else {
      msg.innerText = "Sala no encontrada";
      msg.className = "msg msg-error";
    }
  } catch (err) {
    msg.innerText = "Error de conexión";
    msg.className = "msg msg-error";
  }
}

function enterRoom(code) {
  window.location.href = `room.html?code=${code}`;
}

function logout() {
  localStorage.removeItem("jwt_token");
  window.location.href = "login.html";
}

function showCreateRoomModal() {
  document.getElementById("createRoomModal").style.display = "flex";
  document.getElementById("createRoomModal").style.position = "fixed";
  document.getElementById("createRoomModal").style.top = "0";
  document.getElementById("createRoomModal").style.left = "0";
  document.getElementById("createRoomModal").style.width = "100%";
  document.getElementById("createRoomModal").style.height = "100%";
  document.getElementById("createRoomModal").style.background = "rgba(0,0,0,0.5)";
  document.getElementById("createRoomModal").style.justifyContent = "center";
  document.getElementById("createRoomModal").style.alignItems = "center";
  document.getElementById("createRoomModal").style.zIndex = "1000";
}

function hideCreateRoomModal() {
  document.getElementById("createRoomModal").style.display = "none";
  document.getElementById("roomName").value = "";
  document.getElementById("roomDescription").value = "";
  document.getElementById("createMsg").innerText = "";
}

function showJoinRoomModal() {
  document.getElementById("joinRoomModal").style.display = "flex";
  document.getElementById("joinRoomModal").style.position = "fixed";
  document.getElementById("joinRoomModal").style.top = "0";
  document.getElementById("joinRoomModal").style.left = "0";
  document.getElementById("joinRoomModal").style.width = "100%";
  document.getElementById("joinRoomModal").style.height = "100%";
  document.getElementById("joinRoomModal").style.background = "rgba(0,0,0,0.5)";
  document.getElementById("joinRoomModal").style.justifyContent = "center";
  document.getElementById("joinRoomModal").style.alignItems = "center";
  document.getElementById("joinRoomModal").style.zIndex = "1000";
}

function hideJoinRoomModal() {
  document.getElementById("joinRoomModal").style.display = "none";
  document.getElementById("roomCode").value = "";
  document.getElementById("joinMsg").innerText = "";
}

// Cargar al inicio
loadRooms();

// Actualizar cada 5 segundos
setInterval(loadRooms, 5000);