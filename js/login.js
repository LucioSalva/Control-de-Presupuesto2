(() => {
  // Base de API desde config.js (window.API_URL)
  const API = (window.API_URL || "http://localhost:3000").replace(/\/$/, "");

  const LS_KEYS_TO_CLEAR = [
    "cp_app_data_v1",
    "cp_current_project",
    "cp_current_project_keys",
    "cp_partidas",
  ];

  // Helper: fetch JSON seguro (evita el "Unexpected token <")
  async function fetchJson(url, options = {}) {
    const res = await fetch(url, options);
    const text = await res.text();

    let data = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      // si no es JSON, data queda null
    }

    if (!res.ok) {
      const msg = data?.error || `HTTP ${res.status} (${res.statusText})`;
      throw new Error(msg);
    }

    if (data == null) {
      throw new Error("La API no regresó JSON válido.");
    }

    return data;
  }

  document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("loginForm");
    const errorBox = document.getElementById("loginError");
    if (!form) return;

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      errorBox.classList.add("d-none");
      errorBox.textContent = "";

      const usuario = document.getElementById("usuario").value.trim();
      const password = document.getElementById("password").value;

      try {
        // ✅ AQUÍ estaba el error: debe ser /api/login y usando API (no API_URL)
        const data = await fetchJson(`${API}/api/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ usuario, password }),
        });

        // Guardar token/usuario
        localStorage.setItem("cp_token", data.token);
        localStorage.setItem("cp_usuario", JSON.stringify(data.usuario));

        // ✅ compatibilidad con tus otros scripts (que buscan token/authToken)
        localStorage.setItem("token", data.token);
        localStorage.setItem("authToken", data.token);

        // limpiar estado previo
        LS_KEYS_TO_CLEAR.forEach((k) => {
          try { localStorage.removeItem(k); } catch {}
        });

        // roles y usuario
        const user = data.usuario || {};
        const roles = Array.isArray(user.roles) ? user.roles : [];
        const rolesNorm = roles.map((r) => String(r).trim().toUpperCase());
        const username = String(user.usuario || "").trim().toLowerCase();
        const userId = Number(user.id || 0);

        const esLucio =
          userId === 1 ||
          username === "lucio" ||
          username === "ing. lucio" ||
          username === "ing. lucio salvador";

        const esDios = rolesNorm.includes("DIOS");
        const esAdmin = rolesNorm.includes("ADMIN");

        // redirecciones
        if (esLucio || esDios) {
          window.location.href = "admin-usuarios.html";
          return;
        }
        if (esAdmin) {
          window.location.href = "projects.html";
          return;
        }
        window.location.href = "index.html";
      } catch (err) {
        console.error(err);
        errorBox.textContent = err.message;
        errorBox.classList.remove("d-none");
      }
    });
  });
})();
