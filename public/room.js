const baseURL = window.location.origin;
const token = sessionStorage.getItem("jwt_token");

if (!token) {
  window.location.href = "login.html";
}

// Obtener código de la sala de la URL
const urlParams = new URLSearchParams(window.location.search);
const roomCode = urlParams.get("code");

if (!roomCode) {
  alert("Código de sala no válido");
  window.location.href = "dashboard.html";
}

// Variables globales
let roomData = null;
let socket = null;
let currentUserId = null;
let connectedUsers = new Set();
let userVotes = {}; // Guardar votos del usuario actual
let currentChart = null; // Instancia de Chart.js

// Decodificar token
function parseJwt(token) {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(c => {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    return JSON.parse(jsonPayload);
  } catch (e) {
    return null;
  }
}

const userData = parseJwt(token);
if (userData) {
  currentUserId = userData.id;
  connectedUsers.add(userData.username);
}

// Cargar información de la sala
async function loadRoomInfo() {
  try {
    const resp = await fetch(`${baseURL}/rooms/${roomCode}`, {
      headers: { token }
    });

    if (!resp.ok) {
      alert("Sala no encontrada");
      window.location.href = "dashboard.html";
      return;
    }

    roomData = await resp.json();
    document.getElementById("roomName").innerText = roomData.name;
    document.getElementById("roomCode").innerText = roomData.code;
    document.getElementById("roomDescription").innerText = roomData.description || "";

    // Mostrar botón de crear votación solo si es el creador
    if (roomData.creatorId === currentUserId) {
      document.getElementById("btnCreatePoll").style.display = "inline-block";
    }

    // Cargar votaciones activas
    loadPolls();
    
  } catch (err) {
    console.error("Error al cargar sala:", err);
  }
}

// Cargar mensajes previos del chat
async function loadMessages() {
  try {
    const resp = await fetch(`${baseURL}/chat?roomId=${roomData.id}`, {
      headers: { token }
    });
    const messages = await resp.json();
    
    const container = document.getElementById("messages");
    container.innerHTML = "";
    
    messages.forEach(msg => {
      addMessageToDOM(msg);
    });
  } catch (err) {
    console.error("Error al cargar mensajes:", err);
  }
}

// Conectar Socket.io
function connectSocket() {
  socket = io({
    auth: { token }
  });

  socket.on("connect", () => {
    console.log("Conectado al servidor");
    socket.emit("joinRoom", roomCode);
    updateUsersList();
  });

  socket.on("userJoined", (data) => {
    connectedUsers.add(data.username);
    updateUsersList();
    addSystemMessage(`${data.username} se unió a la sala`);
  });

  socket.on("userLeft", (data) => {
    connectedUsers.delete(data.username);
    updateUsersList();
    addSystemMessage(`${data.username} salió de la sala`);
  });

  socket.on("newRoomMessage", (msg) => {
    addMessageToDOM(msg);
  });

  socket.on("newPoll", (poll) => {
    addPollToDOM(poll);
    addSystemMessage("Nueva votación creada: " + poll.question);
  });

  socket.on("pollResults", (results) => {
    updatePollResults(results);
  });

  socket.on("pollClosed", (data) => {
    markPollAsClosed(data.pollId);
    addSystemMessage("La votación ha sido cerrada");
  });

  socket.on("voteError", (data) => {
    alert("Error al votar: " + data.message);
  });

  socket.on("disconnect", () => {
    console.log("Desconectado del servidor");
  });
}

// Enviar mensaje
function sendMessage() {
  const input = document.getElementById("messageInput");
  const content = input.value.trim();
  
  if (!content) return;
  
  socket.emit("roomMessage", {
    roomCode,
    roomId: roomData.id,
    content
  });
  
  input.value = "";
}

// Permitir enviar con Enter
document.addEventListener("DOMContentLoaded", () => {
  const input = document.getElementById("messageInput");
  if (input) {
    input.addEventListener("keypress", (e) => {
      if (e.key === "Enter") {
        sendMessage();
      }
    });
  }
});

// Agregar mensaje al DOM
function addMessageToDOM(msg) {
  const container = document.getElementById("messages");
  const div = document.createElement("div");
  div.className = "message";
  
  const time = new Date(msg.createdAt).toLocaleTimeString();
  div.innerHTML = `
    <strong>${msg.username}</strong>
    <span class="time">${time}</span>
    <div>${msg.content}</div>
  `;
  
  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
}

// Mensaje del sistema
function addSystemMessage(text) {
  const container = document.getElementById("messages");
  const div = document.createElement("div");
  div.className = "message";
  div.style.background = "#fff3cd";
  div.style.borderLeft = "4px solid #ffc107";
  div.innerHTML = `<em>ℹ️ ${text}</em>`;
  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
}

// Actualizar lista de usuarios
function updateUsersList() {
  const container = document.getElementById("usersList");
  container.innerHTML = "";
  
  connectedUsers.forEach(username => {
    const badge = document.createElement("span");
    badge.className = "user-badge";
    badge.innerText = username;
    container.appendChild(badge);
  });
}

// Cargar votaciones
function loadPolls() {
  const container = document.getElementById("pollsContainer");
  container.innerHTML = "";
  
  if (!roomData.polls || roomData.polls.length === 0) {
    container.innerHTML = "<p style='text-align:center; color:#666;'>No hay votaciones activas</p>";
    return;
  }
  
  roomData.polls.forEach(poll => {
    addPollToDOM(poll);
  });
}

// Agregar votación al DOM
function addPollToDOM(poll) {
  const container = document.getElementById("pollsContainer");
  
  // Remover mensaje de "no hay votaciones"
  if (container.innerHTML.includes("No hay votaciones")) {
    container.innerHTML = "";
  }
  
  const div = document.createElement("div");
  div.className = poll.isOpen ? "poll-active" : "poll-active poll-closed";
  div.id = `poll-${poll.id}`;
  
  let statusBadge = poll.isOpen 
    ? '<span class="poll-status status-open">🟢 ABIERTA</span>'
    : '<span class="poll-status status-closed">🔴 CERRADA</span>';
  
  let optionsHTML = "";
  const hasVoted = userVotes[poll.id];
  
  if (poll.isOpen) {
    // Mostrar opciones para votar
    poll.options.forEach(opt => {
      const isVoted = hasVoted === opt.id;
      const votedClass = isVoted ? 'voted' : '';
      const votedIndicator = isVoted ? '<span class="vote-indicator">✓ Tu voto</span>' : '';
      
      optionsHTML += `
        <button class="vote-button ${votedClass}" onclick="vote(${poll.id}, ${opt.id})" ${isVoted ? 'disabled' : ''}>
          <span>${opt.text}</span>
          ${votedIndicator}
        </button>
      `;
    });
  }
  
  // Botones de acción
  let actionButtons = "";
  if (roomData.creatorId === currentUserId) {
    if (poll.isOpen) {
      actionButtons += `<button class="btn btn-danger" style="margin-top:15px; margin-right:10px;" onclick="closePoll(${poll.id})">🔒 Cerrar Votación</button>`;
    }
    actionButtons += `<button class="btn btn-primary chart-button" onclick="showChart(${poll.id})">📊 Ver Gráfico</button>`;
  } else {
    // Usuarios normales también pueden ver el gráfico
    actionButtons += `<button class="btn btn-primary chart-button" onclick="showChart(${poll.id})">📊 Ver Resultados</button>`;
  }
  
  div.innerHTML = `
    ${statusBadge}
    <h4 class="poll-question">${poll.question}</h4>
    <div id="poll-options-${poll.id}">
      ${optionsHTML}
    </div>
    <div id="poll-results-${poll.id}" class="poll-results"></div>
    ${actionButtons}
  `;
  
  container.appendChild(div);
  
  // Cargar resultados
  loadPollResults(poll.id);
}

// Votar
async function vote(pollId, optionId) {
  // Verificar si ya votó
  if (userVotes[pollId]) {
    alert("Ya has votado en esta encuesta");
    return;
  }

  socket.emit("submitVote", {
    roomCode,
    pollId,
    optionId
  });

  // Guardar voto localmente
  userVotes[pollId] = optionId;
  
  // Actualizar UI inmediatamente
  const buttons = document.querySelectorAll(`#poll-options-${pollId} .vote-button`);
  buttons.forEach(btn => {
    btn.disabled = true;
    if (btn.onclick.toString().includes(`${optionId}`)) {
      btn.classList.add('voted');
      btn.innerHTML = btn.innerHTML.replace('</span>', '</span><span class="vote-indicator">✓ Tu voto</span>');
    }
  });

  addSystemMessage("Tu voto ha sido registrado");
}

// Cargar resultados de votación
async function loadPollResults(pollId) {
  try {
    const resp = await fetch(`${baseURL}/polls/${pollId}/results`, {
      headers: { token }
    });
    const results = await resp.json();
    updatePollResults(results);
  } catch (err) {
    console.error("Error al cargar resultados:", err);
  }
}

// Actualizar resultados en el DOM
function updatePollResults(results) {
  const pollId = results.pollId || results.id;
  const container = document.getElementById(`poll-results-${pollId}`);
  if (!container) return;
  
  container.innerHTML = "<h5 style='margin-top:20px; margin-bottom:15px;'>📊 Resultados en tiempo real:</h5>";
  
  const totalVotes = results.totalVotes || 0;
  
  results.options.forEach(opt => {
    const percentage = totalVotes > 0 ? ((opt.votes / totalVotes) * 100).toFixed(1) : 0;
    
    const resultDiv = document.createElement("div");
    resultDiv.className = "result-item";
    resultDiv.innerHTML = `
      <div class="result-label">
        <span>${opt.text}</span>
        <span class="result-percentage">${opt.votes} votos (${percentage}%)</span>
      </div>
      <div class="result-bar">
        <div class="result-fill" style="width: ${percentage}%">
          ${percentage}%
        </div>
      </div>
    `;
    
    container.appendChild(resultDiv);
  });
}

// Cerrar votación
function closePoll(pollId) {
  if (!confirm("¿Cerrar esta votación? Los usuarios ya no podrán votar.")) return;
  
  socket.emit("closePoll", {
    roomCode,
    pollId
  });
}

// Marcar votación como cerrada
function markPollAsClosed(pollId) {
  const pollDiv = document.getElementById(`poll-${pollId}`);
  if (pollDiv) {
    pollDiv.classList.add("poll-closed");
    const statusBadge = pollDiv.querySelector(".poll-status");
    if (statusBadge) {
      statusBadge.className = "poll-status status-closed";
      statusBadge.innerHTML = "🔴 CERRADA";
    }
    const optionsDiv = document.getElementById(`poll-options-${pollId}`);
    if (optionsDiv) {
      optionsDiv.innerHTML = "<p style='color:#999; font-style:italic;'>La votación ha sido cerrada</p>";
    }
  }
}

// Mostrar gráfico con Chart.js
async function showChart(pollId) {
  try {
    const resp = await fetch(`${baseURL}/polls/${pollId}/results`, {
      headers: { token }
    });
    const results = await resp.json();
    
    const modal = document.getElementById("chartModal");
    modal.style.display = "flex";
    modal.style.position = "fixed";
    modal.style.top = "0";
    modal.style.left = "0";
    modal.style.width = "100%";
    modal.style.height = "100%";
    modal.style.background = "rgba(0,0,0,0.6)";
    modal.style.justifyContent = "center";
    modal.style.alignItems = "center";
    modal.style.zIndex = "1000";
    
    // Destruir gráfico anterior si existe
    if (currentChart) {
      currentChart.destroy();
    }
    
    const ctx = document.getElementById("resultsChart").getContext("2d");
    
    const labels = results.options.map(opt => opt.text);
    const data = results.options.map(opt => opt.votes);
    const totalVotes = results.totalVotes || 0;
    
    currentChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [{
          label: 'Número de Votos',
          data: data,
          backgroundColor: [
            'rgba(102, 126, 234, 0.8)',
            'rgba(118, 75, 162, 0.8)',
            'rgba(40, 167, 69, 0.8)',
            'rgba(255, 193, 7, 0.8)',
            'rgba(220, 53, 69, 0.8)',
            'rgba(23, 162, 184, 0.8)'
          ],
          borderColor: [
            'rgba(102, 126, 234, 1)',
            'rgba(118, 75, 162, 1)',
            'rgba(40, 167, 69, 1)',
            'rgba(255, 193, 7, 1)',
            'rgba(220, 53, 69, 1)',
            'rgba(23, 162, 184, 1)'
          ],
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: true,
            position: 'top',
          },
          title: {
            display: true,
            text: `${results.question} (Total: ${totalVotes} votos)`,
            font: {
              size: 16,
              weight: 'bold'
            }
          },
          tooltip: {
            callbacks: {
              label: function(context) {
                const value = context.parsed.y;
                const percentage = totalVotes > 0 ? ((value / totalVotes) * 100).toFixed(1) : 0;
                return ` ${value} votos (${percentage}%)`;
              }
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              stepSize: 1
            }
          }
        }
      }
    });
    
  } catch (err) {
    console.error("Error al mostrar gráfico:", err);
    alert("Error al cargar los resultados");
  }
}

// Cerrar modal de gráfico
function hideChartModal() {
  document.getElementById("chartModal").style.display = "none";
  if (currentChart) {
    currentChart.destroy();
    currentChart = null;
  }
}

// Descargar gráfico como imagen
function downloadChart() {
  if (!currentChart) return;
  
  const url = currentChart.toBase64Image();
  const link = document.createElement('a');
  link.download = `resultados-votacion-${Date.now()}.png`;
  link.href = url;
  link.click();
}

// Modal crear votación
function showCreatePollModal() {
  document.getElementById("createPollModal").style.display = "flex";
  document.getElementById("createPollModal").style.position = "fixed";
  document.getElementById("createPollModal").style.top = "0";
  document.getElementById("createPollModal").style.left = "0";
  document.getElementById("createPollModal").style.width = "100%";
  document.getElementById("createPollModal").style.height = "100%";
  document.getElementById("createPollModal").style.background = "rgba(0,0,0,0.6)";
  document.getElementById("createPollModal").style.justifyContent = "center";
  document.getElementById("createPollModal").style.alignItems = "center";
  document.getElementById("createPollModal").style.zIndex = "1000";
}

function hideCreatePollModal() {
  document.getElementById("createPollModal").style.display = "none";
  document.getElementById("pollQuestion").value = "";
  document.getElementById("optionsContainer").innerHTML = `
    <input type="text" class="poll-option-input" placeholder="Opción 1" />
    <input type="text" class="poll-option-input" placeholder="Opción 2" />
  `;
  document.getElementById("pollMsg").innerText = "";
}

function addPollOption() {
  const container = document.getElementById("optionsContainer");
  const count = container.querySelectorAll(".poll-option-input").length + 1;
  const input = document.createElement("input");
  input.type = "text";
  input.className = "poll-option-input";
  input.placeholder = `Opción ${count}`;
  container.appendChild(input);
}

// Crear votación
function createPoll() {
  const question = document.getElementById("pollQuestion").value.trim();
  const optionInputs = document.querySelectorAll(".poll-option-input");
  const options = Array.from(optionInputs)
    .map(input => input.value.trim())
    .filter(val => val !== "");
  
  const msg = document.getElementById("pollMsg");
  
  if (!question) {
    msg.innerText = "La pregunta es requerida";
    msg.className = "msg msg-error";
    return;
  }
  
  if (options.length < 2) {
    msg.innerText = "Debes tener al menos 2 opciones";
    msg.className = "msg msg-error";
    return;
  }
  
  socket.emit("createPoll", {
    roomCode,
    roomId: roomData.id,
    question,
    options
  });
  
  hideCreatePollModal();
}

// Copiar código de la sala
function copyRoomCode() {
  const code = roomCode;
  navigator.clipboard.writeText(code).then(() => {
    const btn = event.target;
    const originalText = btn.innerText;
    btn.innerText = "✅ Copiado!";
    btn.style.background = "#28a745";
    
    setTimeout(() => {
      btn.innerText = originalText;
      btn.style.background = "";
    }, 2000);
  }).catch(err => {
    console.error("Error al copiar:", err);
    alert("Código: " + code);
  });
}

// Navegación
function goToDashboard() {
  leaveRoom();
  window.location.href = "dashboard.html";
}

function leaveRoom() {
  if (socket) {
    socket.emit("leaveRoom", roomCode);
    socket.disconnect();
  }
}

// Inicializar
loadRoomInfo();
connectSocket();

// Al cerrar la ventana
window.addEventListener("beforeunload", () => {
  leaveRoom();
});