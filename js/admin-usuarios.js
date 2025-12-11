// =====================================================
//  CONFIG
// =====================================================
const ADMIN_API_BASE = "http://localhost:3000";
const ENDPOINT_USUARIOS = `${ADMIN_API_BASE}/api/admin/usuarios`;

// Solo estos roles existen en la tabla roles (GOD, ADMIN, AREA)
const ROLES_VALIDOS = ["GOD", "ADMIN", "AREA"];

// =====================================================
//  GUARD: solo Lucio / GOD
// =====================================================
(function adminGuard() {
  try {
    const raw = localStorage.getItem("cp_usuario");
    if (!raw) {
      window.location.href = "login.html";
      return;
    }

    const user = JSON.parse(raw);
    const username = String(user.usuario || "").trim().toLowerCase();
    const userId = Number(user.id || 0);

    const roles = Array.isArray(user.roles) ? user.roles : [];
    const rolesNorm = roles
      .filter((r) => r != null)
      .map((r) => String(r).trim().toUpperCase());

    const esLucio =
      userId === 1 ||
      username === "lucio" ||
      username === "ing. lucio" ||
      username === "ing. lucio salvador";

    // 👇 aquí usamos GOD (la clave de tu tabla)
    const esDios = rolesNorm.includes("GOD");

    if (!(esLucio || esDios)) {
      console.warn("[ADMIN-GUARD] No es admin, mandando a index");
      window.location.href = "index.html";
    } else {
      console.log("[ADMIN-GUARD] Acceso permitido a admin-usuarios");
    }
  } catch (e) {
    console.error("[ADMIN-GUARD] Error parseando cp_usuario", e);
    window.location.href = "login.html";
  }
})();

// =====================================================
//  ESTADO
// =====================================================
let usuariosCache = [];
let usuarioModalInstance = null;

// =====================================================
//  UTILIDADES UI
// =====================================================
function showAlert(message, type = "info") {
  const alertBox = document.getElementById("alertBox");
  if (!alertBox) return;

  alertBox.className = "alert alert-" + type;
  alertBox.textContent = message;
  alertBox.classList.remove("d-none");
}

function hideAlert() {
  const alertBox = document.getElementById("alertBox");
  if (!alertBox) return;
  alertBox.classList.add("d-none");
}

function formatFecha(fechaStr) {
  if (!fechaStr) return "—";
  const d = new Date(fechaStr);
  if (isNaN(d.getTime())) return "—";
  const dia = String(d.getDate()).padStart(2, "0");
  const mes = String(d.getMonth() + 1).padStart(2, "0");
  const anio = d.getFullYear();
  const hora = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${dia}/${mes}/${anio} ${hora}:${min}`;
}

// =====================================================
//  API
// =====================================================
async function fetchUsuarios() {
  try {
    hideAlert();

    const res = await fetch(ENDPOINT_USUARIOS, {
      headers: {
        "Content-Type": "application/json",
      },
    });

    const data = await res.json().catch(() => null);

    if (!res.ok) {
      const msg = (data && data.error) || "Error al obtener usuarios";
      throw new Error(msg);
    }

    if (!Array.isArray(data)) {
      throw new Error("Respuesta inesperada del servidor");
    }

    usuariosCache = data;
    renderTablaUsuarios();
  } catch (err) {
    console.error("[ADMIN-USUARIOS] Error:", err);
    showAlert(err.message || "No se pudieron cargar los usuarios", "danger");
    usuariosCache = [];
    renderTablaUsuarios();
  }
}

async function crearUsuario(payload) {
  const res = await fetch(ENDPOINT_USUARIOS, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const msg = (data && data.error) || "Error al crear usuario";
    throw new Error(msg);
  }
  return data;
}

async function actualizarUsuario(id, payload) {
  const res = await fetch(`${ENDPOINT_USUARIOS}/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const msg = (data && data.error) || "Error al actualizar usuario";
    throw new Error(msg);
  }
  return data;
}

async function eliminarUsuario(id) {
  const res = await fetch(`${ENDPOINT_USUARIOS}/${id}`, {
    method: "DELETE",
  });

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const msg = (data && data.error) || "Error al eliminar usuario";
    throw new Error(msg);
  }
  return data;
}

// =====================================================
//  RENDERIZAR TABLA
// =====================================================
function renderTablaUsuarios() {
  const tbody = document.querySelector("#tablaUsuarios tbody");
  const emptyState = document.getElementById("emptyState");
  const resumen = document.getElementById("usuariosResumen");

  if (!tbody) return;
  tbody.innerHTML = "";

  if (!Array.isArray(usuariosCache) || usuariosCache.length === 0) {
    if (emptyState) emptyState.classList.remove("d-none");
    if (resumen) resumen.textContent = "";
    return;
  }

  if (emptyState) emptyState.classList.add("d-none");

  usuariosCache.forEach((u) => {
    const tr = document.createElement("tr");
    const roles = Array.isArray(u.roles) ? u.roles.join(", ") : "";

    tr.innerHTML = `
      <td>${u.id}</td>
      <td>${u.nombre_completo || ""}</td>
      <td>${u.usuario || ""}</td>
      <td>${u.correo || ""}</td>
      <td>${u.dgeneral_nombre || ""}</td>
      <td>${roles}</td>
      <td>${u.activo ? "Sí" : "No"}</td>
      <td>${formatFecha(u.fecha_creacion)}</td>
      <td class="text-center">
        <button class="btn btn-sm btn-outline-primary me-1"
                data-action="edit" data-id="${u.id}">
          Editar
        </button>
        <button class="btn btn-sm btn-outline-danger"
                data-action="delete" data-id="${u.id}">
          Eliminar
        </button>
      </td>
    `;

    tbody.appendChild(tr);
  });

  if (resumen) {
    resumen.textContent = `Total de usuarios: ${usuariosCache.length}`;
  }
}

// =====================================================
//  MODAL: abrir / llenar / leer datos
// =====================================================
function abrirModalNuevoUsuario() {
  limpiarFormularioUsuario();
  const titulo = document.getElementById("usuarioModalLabel");
  if (titulo) titulo.textContent = "Nuevo usuario";

  const idInput = document.getElementById("usuarioId");
  if (idInput) idInput.value = "";

  if (!usuarioModalInstance) {
    const modalEl = document.getElementById("usuarioModal");
    usuarioModalInstance = new bootstrap.Modal(modalEl);
  }
  usuarioModalInstance.show();
}

function abrirModalEditarUsuario(usuario) {
  limpiarFormularioUsuario();
  const titulo = document.getElementById("usuarioModalLabel");
  if (titulo) titulo.textContent = `Editar usuario #${usuario.id}`;

  document.getElementById("usuarioId").value = usuario.id;
  document.getElementById("nombreCompleto").value =
    usuario.nombre_completo || "";
  document.getElementById("usuarioInput").value = usuario.usuario || "";
  document.getElementById("correo").value = usuario.correo || "";
  document.getElementById("idDgeneral").value = usuario.id_dgeneral || "";
  document.getElementById("activo").checked = !!usuario.activo;
  document.getElementById("password").value = usuario.password || ""; 

  const roles = Array.isArray(usuario.roles) ? usuario.roles : [];
  const rolesNorm = roles.map((r) => String(r).trim().toUpperCase());

  document.querySelectorAll(".rol-check").forEach((chk) => {
    const value = String(chk.value || "").trim().toUpperCase();
    chk.checked = rolesNorm.includes(value);
  });

  if (!usuarioModalInstance) {
    const modalEl = document.getElementById("usuarioModal");
    usuarioModalInstance = new bootstrap.Modal(modalEl);
  }
  usuarioModalInstance.show();
}

function limpiarFormularioUsuario() {
  document.getElementById("usuarioForm").reset();
  document.getElementById("usuarioId").value = "";
  document.querySelectorAll(".rol-check").forEach((chk) => {
    chk.checked = false;
  });
}

// Lee datos del formulario y arma payload
function obtenerPayloadFormulario() {
  const idStr = document.getElementById("usuarioId").value.trim();
  const id = idStr ? Number(idStr) : null;

  const nombre_completo = document
    .getElementById("nombreCompleto")
    .value.trim();
  const usuario = document.getElementById("usuarioInput").value.trim();
  const correo = document.getElementById("correo").value.trim();
  const password = document.getElementById("password").value;
  const idDgeneralStr = document.getElementById("idDgeneral").value.trim();
  const id_dgeneral = idDgeneralStr ? Number(idDgeneralStr) : null;
  const activo = document.getElementById("activo").checked;

  // Roles desde los checkboxes
  let roles = [];
  document.querySelectorAll(".rol-check").forEach((chk) => {
    if (chk.checked) roles.push(chk.value);
  });

  // Normalizar y asegurarnos que solo vayan GOD / ADMIN / AREA
  roles = roles
    .map((r) => String(r || "").trim().toUpperCase())
    .filter((r) => ROLES_VALIDOS.includes(r));

  if (!nombre_completo || !usuario) {
    throw new Error("Nombre completo y usuario son obligatorios");
  }

  const payload = {
    nombre_completo,
    usuario,
    correo: correo || null,
    id_dgeneral,
    activo,
    roles,
  };

  // Si hay contraseña capturada, la mandamos (para crear o cambiar)
  if (password && password.trim().length > 0) {
    payload.password = password;
  }

  return { id, payload };
}

// =====================================================
//  INIT
// =====================================================
document.addEventListener("DOMContentLoaded", () => {
  // Botón volver
  const btnVolver = document.getElementById("btnVolver");
  if (btnVolver) {
    btnVolver.addEventListener("click", () => {
      window.location.href = "index.html";
    });
  }

  // Botón nuevo usuario
  const btnNuevoUsuario = document.getElementById("btnNuevoUsuario");
  if (btnNuevoUsuario) {
    btnNuevoUsuario.addEventListener("click", () => {
      abrirModalNuevoUsuario();
    });
  }

  // Submit del formulario (crear / actualizar)
  const form = document.getElementById("usuarioForm");
  if (form) {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      try {
        const { id, payload } = obtenerPayloadFormulario();
        let msg;

        if (id == null) {
          await crearUsuario(payload);
          msg = "Usuario creado correctamente.";
        } else {
          await actualizarUsuario(id, payload);
          msg = "Usuario actualizado correctamente.";
        }

        if (usuarioModalInstance) {
          usuarioModalInstance.hide();
        }
        showAlert(msg, "success");
        await fetchUsuarios();
      } catch (err) {
        console.error("[USUARIO-FORM] Error:", err);
        showAlert(err.message || "No se pudo guardar el usuario", "danger");
      }
    });
  }

  // Delegación de eventos en la tabla (editar / eliminar)
  const tbody = document.querySelector("#tablaUsuarios tbody");
  if (tbody) {
    tbody.addEventListener("click", async (e) => {
      const btn = e.target.closest("button[data-action]");
      if (!btn) return;

      const action = btn.getAttribute("data-action");
      const id = Number(btn.getAttribute("data-id") || "0");
      if (!id) return;

      const usuario = usuariosCache.find((u) => u.id === id);

      if (action === "edit") {
        if (!usuario) return;
        abrirModalEditarUsuario(usuario);
      }

      if (action === "delete") {
        if (!usuario) return;
        const confirmado = window.confirm(
          `¿Seguro que deseas eliminar al usuario "${usuario.usuario}" (#${usuario.id})?`
        );
        if (!confirmado) return;

        try {
          await eliminarUsuario(id);
          showAlert("Usuario eliminado correctamente.", "success");
          await fetchUsuarios();
        } catch (err) {
          console.error("[DELETE-USUARIO] Error:", err);
          showAlert(
            err.message || "No se pudo eliminar el usuario",
            "danger"
          );
        }
      }
    });
  }

  // Cargar usuarios inicial
  fetchUsuarios();
});
