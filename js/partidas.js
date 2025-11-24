// =====================================================
//  CONFIGURACIÓN Y UTILIDADES
// =====================================================

const API_URL = "http://localhost:3000";
const LS_PROJECT_KEY = "cp_current_project";

const MES = [
  "Ene", "Feb", "Mar", "Abr", "May", "Jun",
  "Jul", "Ago", "Sep", "Oct", "Nov", "Dic",
];

const money = (v) => {
  if (v === undefined || v === null || isNaN(v)) return "—";
  return Number(v).toLocaleString("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 2,
  });
};

const escapeHtml = (s) =>
  String(s).replace(
    /[&<>\"']/g,
    (c) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      }[c])
  );

// =====================================================
//  API HELPERS
// =====================================================

async function apiGet(path) {
  const r = await fetch(API_URL + path);
  if (!r.ok) throw new Error("GET " + path + " " + r.status);
  return r.json();
}

async function apiPost(path, body) {
  const r = await fetch(API_URL + path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok || data.error) throw new Error(data.error || "POST " + path);
  return data;
}

async function apiDelete(path) {
  const r = await fetch(API_URL + path, { method: "DELETE" });
  const data = await r.json().catch(() => ({}));
  if (!r.ok || data.error) throw new Error(data.error || "DELETE " + path);
  return data;
}

// =====================================================
//  STATE
// =====================================================

const STATE = {
  proyecto: "",
  partidas: [], // [{partida, presupuesto, saldo, gastado, recon}]
  gastos: [],   // [{id, fecha, descripcion, partida, monto}]
  filtroDesc: "",
};

// =====================================================
//  UI HELPERS
// =====================================================

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
    timer: 8000,
    timerProgressBar: true,
    background: "#1a1a1a",
    color: "#ffffff",
  });
}

const showSpinner = (v) => {
  const el = document.getElementById("spinner");
  if (el) el.style.display = v ? "block" : "none";
};

// =====================================================
//  CARGA DE DATOS PARA UN PROYECTO
// =====================================================

async function loadProyecto(proj) {
  STATE.proyecto = proj;
  localStorage.setItem(LS_PROJECT_KEY, proj);

  // 1) Partidas del proyecto (para el select)
  const detalles = await apiGet(
    "/api/detalles?project=" + encodeURIComponent(proj)
  );

  STATE.partidas = detalles.map((d) => ({
    partida: d.partida,
    presupuesto: Number(d.presupuesto || 0),
    saldo: Number(d.saldo_disponible || 0),
    gastado: Number(d.total_gastado || 0),
    recon: Number(d.total_reconducido || 0),
  }));

  // 2) Historial de gastos
  const gastos = await apiGet("/api/gastos?project=" + encodeURIComponent(proj));
  STATE.gastos = gastos.map((g) => ({
    id: g.id,
    partida: g.partida,
    descripcion: g.descripcion || "",
    monto: Number(g.monto || 0),
    fecha: g.fecha ? new Date(g.fecha) : null,
  }));
}

// =====================================================
//  RENDER: SELECT DE PARTIDAS
// =====================================================

function renderPartidasSelect() {
  const sel = document.getElementById("g-partida");
  if (!sel) return;

  sel.innerHTML =
    '<option value="" disabled selected>Selecciona una partida</option>';

  STATE.partidas
    .map((p) => p.partida)
    .filter((p) => p && p.trim().length)
    .sort((a, b) => a.localeCompare(b))
    .forEach((clave) => {
      const opt = document.createElement("option");
      opt.value = clave;
      opt.textContent = clave;
      sel.appendChild(opt);
    });
}

// =====================================================
//  RENDER: TABLA DE GASTOS + KPIs
// =====================================================

function renderGastos() {
  const tbody = document.querySelector("#tabla-gastos tbody");
  const tfootTotal = document.getElementById("tfoot-total");
  if (!tbody || !tfootTotal) return;

  const filtro = (STATE.filtroDesc || "").toLowerCase();

  tbody.innerHTML = "";
  let total = 0;

  STATE.gastos
    .filter(
      (g) =>
        !filtro ||
        String(g.descripcion || "")
          .toLowerCase()
          .includes(filtro)
    )
    .sort((a, b) => {
      const ta = a.fecha ? a.fecha.getTime() : 0;
      const tb = b.fecha ? b.fecha.getTime() : 0;
      return tb - ta; // más reciente primero
    })
    .forEach((g) => {
      total += Number(g.monto || 0);

      const d = g.fecha
        ? `${String(g.fecha.getUTCDate()).padStart(2, "0")}/${
            MES[g.fecha.getUTCMonth()]
          }/${g.fecha.getUTCFullYear()}`
        : "—";

      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${d}</td>
        <td>${escapeHtml(g.descripcion || "")}</td>
        <td>${escapeHtml(g.partida || "")}</td>
        <td class="text-end">${money(g.monto)}</td>
        <td class="text-end">
          <button class="btn btn-outline-danger btn-sm" data-id="${g.id}">
            <i class="bi bi-trash"></i>
          </button>
        </td>
      `;
      tbody.appendChild(tr);
    });

  tfootTotal.textContent = money(total);
  const kpiCount = document.getElementById("kpi-gastos-cantidad");
  const kpiTotal = document.getElementById("kpi-gastos-total");
  if (kpiCount) kpiCount.textContent = String(STATE.gastos.length);
  if (kpiTotal) kpiTotal.textContent = money(total);

  // Borrar gasto
  tbody.querySelectorAll("button[data-id]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = btn.getAttribute("data-id");
      const ok = await Swal.fire({
        icon: "warning",
        title: "Eliminar gasto",
        text: "¿Deseas eliminar este gasto?",
        showCancelButton: true,
        confirmButtonText: "Sí, eliminar",
        cancelButtonText: "Cancelar",
        background: "#1a1a1a",
        color: "#ffffff",
      });
      if (!ok.isConfirmed) return;

      try {
        await apiDelete(`/api/gastos/${id}`);
        await refresh(); // recargar datos
        banner("Gasto eliminado", "success");
      } catch (e) {
        banner(e.message, "danger");
      }
    });
  });
}

// =====================================================
//  REFRESH GENERAL
// =====================================================

async function refresh(projectOverride) {
  const input = document.getElementById("proj-code");
  const proj =
    (projectOverride && projectOverride.trim()) ||
    STATE.proyecto ||
    (input ? input.value.trim() : "");

  if (!proj) {
    banner("Captura un <strong>ID de proyecto</strong>.", "warning");
    return;
  }

  if (input) input.value = proj;
  showSpinner(true);
  try {
    await loadProyecto(proj);
    renderPartidasSelect();
    renderGastos();
  } catch (e) {
    console.error("refresh error:", e);
    banner(
      "No se pudo cargar información del proyecto. " + escapeHtml(e.message),
      "danger"
    );
  } finally {
    showSpinner(false);
  }
}

// =====================================================
//  EVENTOS
// =====================================================

// Buscar proyecto desde navbar
const navSearchForm = document.getElementById("nav-search");
if (navSearchForm) {
  navSearchForm.addEventListener("submit", async (ev) => {
    ev.preventDefault();
    const project = (document.getElementById("proj-code")?.value || "").trim();
    if (!project) return;
    await refresh(project);
  });
}

// Filtrar / limpiar descripción
document.getElementById("btn-filtrar")?.addEventListener("click", () => {
  STATE.filtroDesc = document.getElementById("f-buscar")?.value || "";
  renderGastos();
});

document.getElementById("btn-limpiar")?.addEventListener("click", () => {
  const fb = document.getElementById("f-buscar");
  if (fb) fb.value = "";
  STATE.filtroDesc = "";
  renderGastos();
});

// Exportar Excel (botón de arriba y el de abajo)
["btn-export-xlsx-top", "btn-export-xlsx"].forEach((id) => {
  const btn = document.getElementById(id);
  if (!btn) return;
  btn.addEventListener("click", () => {
    const wb = XLSX.utils.book_new();
    const sh = XLSX.utils.json_to_sheet(
      STATE.gastos.map((g) => ({
        Fecha: g.fecha ? g.fecha.toISOString().slice(0, 10) : "",
        Descripción: g.descripcion,
        Partida: g.partida,
        Monto: Number(g.monto || 0),
      }))
    );
    XLSX.utils.book_append_sheet(wb, sh, "Gastos");
    const proj = STATE.proyecto || "proyecto";
    XLSX.writeFile(
      wb,
      `gastos_${proj.replace(/[^a-z0-9_\-]+/gi, "_")}.xlsx`
    );
  });
});

// Botón Reiniciar (sólo limpia vista local, NO borra BD)
document.getElementById("btn-reset")?.addEventListener("click", () => {
  const input = document.getElementById("proj-code");
  if (input) input.value = "";
  STATE.proyecto = "";
  STATE.partidas = [];
  STATE.gastos = [];
  STATE.filtroDesc = "";
  renderPartidasSelect();
  renderGastos();
  try {
    localStorage.removeItem(LS_PROJECT_KEY);
  } catch {}
  banner(
    "Vista limpia. Captura un nuevo ID de proyecto para seguir trabajando.",
    "info"
  );
});

// Registrar gasto
document.getElementById("form-gasto")?.addEventListener("submit", async (ev) => {
  ev.preventDefault();

  const project =
    STATE.proyecto ||
    (document.getElementById("proj-code")?.value || "").trim();
  const fecha = document.getElementById("g-fecha")?.value || null;
  const descripcion = document.getElementById("g-desc")?.value.trim() || "";
  const partida = document.getElementById("g-partida")?.value || "";
  const monto = parseFloat(
    document.getElementById("g-monto")?.value || "0"
  );

  if (!project)
    return banner("Captura el ID de proyecto antes de registrar", "warning");
  if (!partida || !descripcion || !Number.isFinite(monto) || monto <= 0)
    return banner("Completa partida, descripción y monto válido", "warning");

  try {
    await apiPost("/api/gastos", {
      project,
      partida,
      fecha,
      descripcion,
      monto,
    });
    await refresh(project);
    banner("Gasto registrado", "success");
    ev.target.reset();
    // volver a poner fecha de hoy
    const today = new Date().toISOString().slice(0, 10);
    const gf = document.getElementById("g-fecha");
    if (gf) gf.value = today;
  } catch (e) {
    banner(e.message, "danger");
  }
});

// =====================================================
//  INICIALIZACIÓN
// =====================================================

window.addEventListener("DOMContentLoaded", async () => {
  // Fecha de hoy por defecto
  const today = new Date().toISOString().slice(0, 10);
  const gf = document.getElementById("g-fecha");
  if (gf) gf.value = today;

  // Resolver proyecto: ?project=... o localStorage
  const params = new URLSearchParams(window.location.search);
  const qProject = params.get("project");
  const memProject = localStorage.getItem(LS_PROJECT_KEY);
  const proj = (qProject || memProject || "").trim();

  const input = document.getElementById("proj-code");
  if (proj && input) input.value = proj;

  if (proj) {
    await refresh(proj);
  } else {
    renderPartidasSelect();
    renderGastos();
  }
});
