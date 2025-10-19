const baseURL = window.location.origin;

async function registerUser(username, role, password) {
  try {
    const resp = await fetch(`${baseURL}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, role, password }),
    });
    const data = await resp.json();
    return { status: resp.status, data };
  } catch (err) {
    console.error("Error en fetch register:", err);
    return { status: 500, data: { message: "Error de conexión" } };
  }
}

async function loginUser(username, password) {
  try {
    const resp = await fetch(`${baseURL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    const data = await resp.json();
    const token = resp.headers.get("token");
    return { status: resp.status, token, data };
  } catch (err) {
    console.error("Error en fetch login:", err);
    return { status: 500, token: null, data: { message: "Error de conexión" } };
  }
}

document.addEventListener("DOMContentLoaded", function () {
  const path = window.location.pathname;

  // Registro
  if (path.includes("register.html")) {
    document.getElementById("btnRegister").onclick = async function () {
      const username = document.getElementById("username").value;
      const role = document.getElementById("role").value;
      const password = document.getElementById("password").value;
      const msg = document.getElementById("msg");

      if (!username || !role || !password) {
        msg.innerText = "Por favor llena todos los campos";
        return;
      }

      const res = await registerUser(username, role, password);
      if (res.status === 201 || res.status === 200) {
        msg.innerText = "Registrado exitosamente. Inicia sesión.";
      } else {
        if (res.data.errors) {
          msg.innerText = res.data.errors
            .map((e) => `${e.path.join(".")}: ${e.message}`)
            .join(", ");
        } else {
          msg.innerText = `Error ${res.status}: ${res.data.message}`;
        }
      }
    };
  }

  // Login
  if (path.includes("login.html")) {
    document.getElementById("btnLogin").onclick = async function () {
      const username = document.getElementById("username").value;
      const password = document.getElementById("password").value;
      const msg = document.getElementById("msg");

      if (!username || !password) {
        msg.innerText = "Por favor llena todos los campos";
        return;
      }

      const res = await loginUser(username, password);
      if (res.status === 200 && res.token) {
        localStorage.setItem("jwt_token", res.token);
        window.location.href = "chat.html";
      } else {
        if (res.data.errors) {
          msg.innerText = res.data.errors
            .map((e) => `${e.path.join(".")}: ${e.message}`)
            .join(", ");
        } else {
          msg.innerText = `Error ${res.status}: ${res.data.message}`;
        }
      }
    };
  }

  // Chat
  if (path.includes("chat.html")) {
    const token = localStorage.getItem("jwt_token");
    if (!token) {
      window.location.href = "login.html";
      return;
    }

    const socket = io({
      auth: { token },
    });

    socket.on("connect", function () {
      console.log("Conectado al socket:", socket.id);
    });

    socket.on("newPublicMessage", function (msg) {
      const div = document.getElementById("messages");
      const el = document.createElement("div");
      const d = new Date(msg.createdAt);
      const time = d.toLocaleTimeString();
      el.innerText = `${msg.username} (${time}): ${msg.content}`;
      div.appendChild(el);
      div.scrollTop = div.scrollHeight;
    });

    document.getElementById("btnSend").onclick = function () {
      const input = document.getElementById("messageInput");
      const text = input.value;
      if (!text) return;
      socket.emit("publicMessage", { content: text });
      input.value = "";
    };

    document.getElementById("btnLogout").onclick = function () {
      localStorage.removeItem("jwt_token");
      window.location.href = "login.html";
    };

    // Cargar mensajes previos
    fetch(`${baseURL}/chat`, {
      method: "GET",
      headers: { token: token },
    })
      .then(function (resp) {
        return resp.json();
      })
      .then(function (msgs) {
        const div = document.getElementById("messages");
        msgs.forEach(function (m) {
          const el = document.createElement("div");
          const d = new Date(m.createdAt);
          const time = d.toLocaleTimeString();
          el.innerText = `${m.username} (${time}): ${m.content}`;
          div.appendChild(el);
        });
        div.scrollTop = div.scrollHeight;
      })
      .catch(function (err) {
        console.error("Error al obtener mensajes:", err);
      });
  }
});
