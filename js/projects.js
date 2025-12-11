// js/projects.js

const API_BASE = "http://localhost:3000";

// ================== FORMATO DE DINERO ==================
const money = (v) => {
  if (v === undefined || v === null || isNaN(v)) return "—";
  return Number(v).toLocaleString("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 2,
  });
};

// ================== BANNER (SweetAlert2) ==================
function banner(msg, type = "info") {
  const iconMap = {
    info: "info",
    success: "success",
    warning: "warning",
    danger: "error",
  };
  const titleMap = {
    info: "Información",
    success: "Éxito",
    warning: "Advertencia",
    danger: "Error",
  };

  Swal.fire({
    icon: iconMap[type] || "info",
    title: titleMap[type] || "Información",
    html: msg,
    toast: true,
    position: "top-end",
    showConfirmButton: false,
    timer: 6000,
    timerProgressBar: true,
    background: "#1a1a1a",
    color: "#ffffff",
  });
}

// ================== LLAMADAS A LA API ==================
async function apiGet(path) {
  const r = await fetch(API_BASE + path);
  if (!r.ok) throw new Error("GET " + path + " " + r.status);
  return r.json();
}

// ================== ESTADO GLOBAL ==================
const STATE = {
  projects: [],
  filtered: [],
};

// ================== USUARIO ACTUAL / ROLES ==================
let CURRENT_USER = null;
let CURRENT_ROLES_NORM = [];
let CURRENT_ID_DGENERAL = null;

/**
 * Carga el usuario desde localStorage.
 * Si no hay sesión, redirige a login.
 */
function loadCurrentUser() {
  try {
    const raw = localStorage.getItem("cp_usuario");
    if (!raw) {
      console.warn(
        "[PROJECTS] No hay cp_usuario en localStorage, redirigiendo a login"
      );
      window.location.href = "login.html";
      return;
    }

    const user = JSON.parse(raw);
    CURRENT_USER = user;

    const roles = Array.isArray(user.roles) ? user.roles : [];
    CURRENT_ROLES_NORM = roles
      .filter((r) => r != null)
      .map((r) => String(r).trim().toUpperCase());

    CURRENT_ID_DGENERAL = user.id_dgeneral != null ? Number(user.id_dgeneral) : null;

    console.log("[PROJECTS] Usuario:", CURRENT_USER);
    console.log("[PROJECTS] Roles:", CURRENT_ROLES_NORM);
    console.log("[PROJECTS] id_dgeneral (usuario):", CURRENT_ID_DGENERAL);
  } catch (e) {
    console.error("[PROJECTS] Error leyendo cp_usuario:", e);
    window.location.href = "login.html";
  }
}

function isAreaUser() {
  return CURRENT_ROLES_NORM.includes("AREA");
}

// ================== RENDER KPIs ==================
function renderKPIs() {
  const totalProjects = STATE.filtered.length;
  const totalPresupuesto = STATE.filtered.reduce(
    (acc, p) => acc + Number(p.presupuesto_total || 0),
    0
  );
  const totalGastado = STATE.filtered.reduce(
    (acc, p) => acc + Number(p.gastado_total || 0),
    0
  );
  const totalSaldo = STATE.filtered.reduce(
    (acc, p) => acc + Number(p.saldo_total || 0),
    0
  );

  document.getElementById("kpi-projects").textContent = totalProjects || "0";
  document.getElementById("kpi-presupuesto").textContent =
    money(totalPresupuesto);
  document.getElementById("kpi-gastado").textContent = money(totalGastado);
  document.getElementById("kpi-saldo").textContent = money(totalSaldo);
}

// ================== RENDER TABLA ==================
function renderTable() {
  const tbody = document.getElementById("tbody-projects");
  tbody.innerHTML = "";

  if (!STATE.filtered.length) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="text-center py-4 text-secondary">
          No se encontraron proyectos con el filtro aplicado.
        </td>
      </tr>
    `;
    document.getElementById("summary-label").textContent =
      "0 proyectos encontrados.";
    renderKPIs();
    return;
  }

  STATE.filtered.forEach((p) => {
    const saldo = Number(p.saldo_total || 0);
    const badgeClass =
      saldo < 0 ? "badge-saldo-negativo" : "badge-saldo-positivo";

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>
        <span class="badge text-bg-dark pill-project">${p.project}</span>
      </td>
      <td class="text-end">${Number(p.partidas || 0)}</td>
      <td class="text-end">${money(p.presupuesto_total)}</td>
      <td class="text-end">${money(p.gastado_total)}</td>
      <td class="text-end">
        <span class="badge ${badgeClass}">
          ${money(saldo)}
        </span>
      </td>
      <td class="text-end">
        <button class="btn btn-sm btn-outline-info btn-open" data-project="${p.project}">
          <i class="bi bi-box-arrow-in-right"></i> Ver detalle
        </button>
      </td>
    `;
    tbody.appendChild(tr);
  });

  document.getElementById(
    "summary-label"
  ).textContent = `${STATE.filtered.length} proyecto(s) mostrados.`;

  renderKPIs();

  // Eventos para los botones "Ver detalle"
  tbody.querySelectorAll(".btn-open").forEach((btn) => {
    btn.addEventListener("click", () => {
      const proj = btn.getAttribute("data-project");
      if (!proj) return;

      // guardamos el proyecto actual en localStorage para que index.html lo recupere
      localStorage.setItem("cp_current_project", proj);

      const url = `index.html?project=${encodeURIComponent(proj)}`;
      window.location.href = url;
    });
  });
}

// ================== FILTRO POR BUSCADOR ==================
function applyFilter() {
  const term = (document.getElementById("search-project").value || "")
    .trim()
    .toLowerCase();

  if (!term) {
    STATE.filtered = [...STATE.projects];
  } else {
    STATE.filtered = STATE.projects.filter((p) =>
      String(p.project || "").toLowerCase().includes(term)
    );
  }

  renderTable();
}

// ================== CARGAR PROYECTOS DESDE LA API ==================
async function loadProjects() {
  try {
    const data = await apiGet("/api/projects");
    let projects = Array.isArray(data) ? data : [];

    // 🔒 FILTRO PARA USUARIOS AREA: solo ven proyectos de su propio id_dgeneral
    if (isAreaUser() && CURRENT_ID_DGENERAL != null) {
      const myIdDg = Number(CURRENT_ID_DGENERAL);
      projects = projects.filter((p) => {
        const projIdDg =
          p.id_dgeneral != null ? Number(p.id_dgeneral) : null;
        return projIdDg === myIdDg;
      });
      console.log(
        "[PROJECTS] Filtro AREA por id_dgeneral. Usuario:",
        myIdDg,
        " → proyectos:",
        projects.length
      );
    }

    STATE.projects = projects;
    STATE.filtered = [...STATE.projects];
    renderTable();
  } catch (e) {
    console.error(e);
    banner(
      "No se pudieron cargar los proyectos. Verifica que el backend esté activo.",
      "danger"
    );
  }
}

// ================== INICIO ==================
window.addEventListener("DOMContentLoaded", async () => {
  // Primero cargamos al usuario actual y sus roles
  loadCurrentUser();

  // Luego cargamos los proyectos (con el filtro por rol AREA si aplica)
  await loadProjects();

  const input = document.getElementById("search-project");
  const btnClear = document.getElementById("btn-clear");

  input.addEventListener("input", () => {
    // filtro en tiempo real
    applyFilter();
  });

  btnClear.addEventListener("click", () => {
    input.value = "";
    applyFilter();
  });
});
