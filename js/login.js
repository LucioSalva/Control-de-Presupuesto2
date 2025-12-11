const API_URL = "http://localhost:3000/api/login";

const LS_KEYS_TO_CLEAR = [
  "cp_app_data_v1",
  "cp_current_project",
  "cp_current_project_keys",
  "cp_partidas",
];

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
      const res = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ usuario, password }),
      });

      let data;
      try {
        data = await res.json();
      } catch (parseErr) {
        throw new Error("La API no regresó JSON válido.");
      }

      if (!res.ok || data.error) {
        throw new Error(data.error || "Usuario o contraseña incorrectos.");
      }

      localStorage.setItem("cp_token", data.token);
      localStorage.setItem("cp_usuario", JSON.stringify(data.usuario));

      // ----------------------------
      // Obtener roles y usuario
      // ----------------------------
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

      // 🔥 siempre limpiar el estado previo del sistema
      LS_KEYS_TO_CLEAR.forEach((k) => {
        try { localStorage.removeItem(k); } catch {}
      });

      // ----------------------------
      // REDIRECCIONES
      // ----------------------------

      // 1) DIOS o LUCIO → administración de usuarios
      if (esLucio || esDios) {
        window.location.href = "admin-usuarios.html";
        return;
      }

      // 2) ADMIN → DIRECTO A projects.html
      if (esAdmin) {
        window.location.href = "projects.html";
        return;
      }

      // 3) Cualquier otro rol → index.html (vacío)
      window.location.href = "index.html";

    } catch (err) {
      console.error(err);
      errorBox.textContent = err.message;
      errorBox.classList.remove("d-none");
    }
  });
});
