// ===== utilidades =====
const API_URL = "http://localhost:3000";
const LS_PROJECT_KEY = "cp_current_project";
const MES = [
  "Ene",
  "Feb",
  "Mar",
  "Abr",
  "May",
  "Jun",
  "Jul",
  "Ago",
  "Sep",
  "Oct",
  "Nov",
  "Dic",
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
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[
        c
      ])
  );
// ===== API helpers =====
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
  const d = await r.json().catch(() => ({}));
  if (!r.ok || d.error) throw new Error(d.error || "DELETE " + path);
  return d;
}

// ===== Estado =====
const STATE = {
  proyecto: "",
  partidas: [], // [{partida, presupuesto, saldo, gastado, recon}]
  gastos: [], // [{id, fecha, descripcion, partida, monto}]
};

// ===== UI helpers =====
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
const showSpinner = (v) =>
  (document.getElementById("spinner").style.display = v ? "block" : "none");

// ===== Carga de datos =====
async function loadProyecto(proj) {
  STATE.proyecto = proj;
  localStorage.setItem(LS_PROJECT_KEY, proj);

  // 1) Cargar partidas del proyecto para llenar el <select>
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

  // 2) Cargar gastos (nueva tabla gastos_detalle)
  //   Endpoint esperado: GET /api/gastos?project=ID  -> [{id, fecha, descripcion, partida, monto}]
  STATE.gastos = await apiGet(
    "/api/gastos?project=" + encodeURIComponent(proj)
  );
}

function renderPartidasSelect() {
  const sel = document.getElementById("g-partida");
  sel.innerHTML =
    '<option value="" disabled selected>Selecciona una partida</option>';
  STATE.partidas
    .map((p) => p.partida)
    .sort((a, b) => a.localeCompare(b))
    .forEach((clave) => {
      const opt = document.createElement("option");
      opt.value = clave;
      opt.textContent = clave;
      sel.appendChild(opt);
    });
}

function renderGastos() {
  const filtrosDesc = (document.getElementById("f-buscar").value || "")
    .trim()
    .toLowerCase();
  const tbody = document.querySelector("#tabla-gastos tbody");
  const tfootTotal = document.getElementById("tfoot-total");
  tbody.innerHTML = "";

  let total = 0;
  STATE.gastos
    .filter(
      (g) =>
        !filtrosDesc ||
        String(g.descripcion || "")
          .toLowerCase()
          .includes(filtrosDesc)
    )
    .sort((a, b) => {
      const ta = a.fecha ? new Date(a.fecha).getTime() : 0;
      const tb = b.fecha ? new Date(b.fecha).getTime() : 0;
      return tb - ta; // más reciente primero
    })
    .forEach((g) => {
      total += Number(g.monto || 0);
      const d = g.fecha
        ? `${String(new Date(g.fecha).getUTCDate()).padStart(2, "0")}/${
            MES[new Date(g.fecha).getUTCMonth()]
          }/${new Date(g.fecha).getUTCFullYear()}`
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
  document.getElementById("kpi-gastos-cantidad").textContent = String(
    STATE.gastos.length
  );
  document.getElementById("kpi-gastos-total").textContent = money(total);

  // bind borrar
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
        color: "#fff",
      });
      if (!ok.isConfirmed) return;
      try {
        await apiDelete(`/api/gastos/${id}`);
        await refresh();
        banner("Gasto eliminado", "success");
      } catch (e) {
        banner(e.message, "danger");
      }
    });
  });
}

async function refresh() {
  const proj =
    STATE.proyecto || (document.getElementById("proj-code").value || "").trim();
  if (!proj) return;
  showSpinner(true);
  try {
    await loadProyecto(proj);
    renderPartidasSelect();
    renderGastos();
  } catch (e) {
    banner(
      "No se pudo cargar información del proyecto. " + e.message,
      "danger"
    );
  } finally {
    showSpinner(false);
  }
}

// ===== Eventos =====
document.getElementById("nav-search").addEventListener("submit", async (ev) => {
  ev.preventDefault();
  const val = (document.getElementById("proj-code").value || "").trim();
  if (!val) return;
  await refresh();
});

document.getElementById("btn-volver").addEventListener("click", () => {
  const proj = STATE.proyecto || localStorage.getItem(LS_PROJECT_KEY) || "";
  const url = proj
    ? `index.html?project=${encodeURIComponent(proj)}`
    : "index.html";
  window.location.href = url;
});

document.getElementById("btn-filtrar").addEventListener("click", renderGastos);
document.getElementById("btn-limpiar").addEventListener("click", () => {
  document.getElementById("f-buscar").value = "";
  renderGastos();
});

document.getElementById("btn-export-xlsx").addEventListener("click", () => {
  const wb = XLSX.utils.book_new();
  const sh = XLSX.utils.json_to_sheet(
    STATE.gastos.map((g) => ({
      Fecha: g.fecha ? new Date(g.fecha).toISOString().slice(0, 10) : "",
      Descripción: g.descripcion,
      Partida: g.partida,
      Monto: Number(g.monto || 0),
    }))
  );
  XLSX.utils.book_append_sheet(wb, sh, "Gastos");
  const proj = STATE.proyecto || "proyecto";
  XLSX.writeFile(wb, `gastos_${proj.replace(/[^a-z0-9_\-]+/gi, "_")}.xlsx`);
});

// Registrar gasto
document.getElementById("form-gasto").addEventListener("submit", async (ev) => {
  ev.preventDefault();
  const project =
    STATE.proyecto || (document.getElementById("proj-code").value || "").trim();
  const fecha = document.getElementById("g-fecha").value || null;
  const descripcion = document.getElementById("g-desc").value.trim();
  const partida = document.getElementById("g-partida").value;
  const monto = parseFloat(document.getElementById("g-monto").value);

  if (!project)
    return banner("Captura el ID de proyecto antes de registrar", "warning");
  if (!partida || !descripcion || isNaN(monto) || monto <= 0)
    return banner("Completa partida, descripción y monto válido", "warning");

  try {
    await apiPost("/api/gastos", {
      project,
      partida,
      fecha,
      descripcion,
      monto,
    });
    await refresh();
    banner("Gasto registrado", "success");
    ev.target.reset();
    document.getElementById("g-partida").value = "";
  } catch (e) {
    banner(e.message, "danger");
  }
});

// ===== Init =====
window.addEventListener("DOMContentLoaded", async () => {
  // set defaults
  const today = new Date().toISOString().slice(0, 10);
  document.getElementById("g-fecha").value = today;

  // resolver proyecto por prioridad: query ?project= , input, localStorage
  const params = new URLSearchParams(window.location.search);
  const qProject = params.get("project");
  const memProject = localStorage.getItem(LS_PROJECT_KEY);
  const proj = qProject || memProject || "";

  if (proj) document.getElementById("proj-code").value = proj;

  if (proj) {
    await refresh();
  }
});
