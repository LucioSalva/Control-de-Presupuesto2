(() => {
  // =====================================================
  //  CONFIGURACIÓN Y UTILIDADES
  // =====================================================
  const BASE = (window.API_URL || "http://localhost:3000").replace(/\/$/, "");
  const LS_PROJECT_KEY = "cp_current_project";

  const MES = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];

  const money = (v) => {
    if (v === undefined || v === null || isNaN(v)) return "—";
    return Number(v).toLocaleString("es-MX", {
      style: "currency",
      currency: "MXN",
      maximumFractionDigits: 2,
    });
  };

  const escapeHtml = (s) =>
    String(s).replace(/[&<>\"']/g, (c) => ({
      "&":"&amp;",
      "<":"&lt;",
      ">":"&gt;",
      '"':"&quot;",
      "'":"&#39;",
    }[c]));

  // =====================================================
  //  API HELPERS  (✅ ya no usa API_URL)
  // =====================================================
  async function apiGet(path) {
    const r = await fetch(`${BASE}${path}`);
    const text = await r.text();
    let data = null;
    try { data = text ? JSON.parse(text) : null; } catch {}
    if (!r.ok) throw new Error(data?.error || `GET ${path} ${r.status}`);
    return data;
  }

  async function apiPost(path, body) {
    const r = await fetch(`${BASE}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const text = await r.text();
    let data = null;
    try { data = text ? JSON.parse(text) : null; } catch {}
    if (!r.ok || data?.error) throw new Error(data?.error || `POST ${path}`);
    return data;
  }

  async function apiDelete(path) {
    const r = await fetch(`${BASE}${path}`, { method: "DELETE" });
    const text = await r.text();
    let data = null;
    try { data = text ? JSON.parse(text) : null; } catch {}
    if (!r.ok || data?.error) throw new Error(data?.error || `DELETE ${path}`);
    return data;
  }

  // =====================================================
  //  STATE
  // =====================================================
  const STATE = {
    proyecto: "",
    partidas: [],
    gastos: [],
    filtroDesc: "",
  };

  // =====================================================
  //  UI HELPERS
  // =====================================================
  function banner(msg, type = "info") {
    const iconMap = { info:"info", success:"success", warning:"warning", danger:"error" };
    const titleMap = { info:"Información", success:"Éxito", warning:"Advertencia", danger:"Error" };

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

    const detalles = await apiGet(`/api/detalles?project=${encodeURIComponent(proj)}`);

    STATE.partidas = (detalles || []).map((d) => ({
      partida: d.partida,
      presupuesto: Number(d.presupuesto || 0),
      saldo: Number(d.saldo_disponible || 0),
      gastado: Number(d.total_gastado || 0),
      recon: Number(d.total_reconducido || 0),
    }));

    const gastos = await apiGet(`/api/gastos?project=${encodeURIComponent(proj)}`);
    STATE.gastos = (gastos || []).map((g) => ({
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

    sel.innerHTML = '<option value="" disabled selected>Selecciona una partida</option>';

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
      .filter((g) => !filtro || String(g.descripcion || "").toLowerCase().includes(filtro))
      .sort((a, b) => (b.fecha?.getTime() || 0) - (a.fecha?.getTime() || 0))
      .forEach((g) => {
        total += Number(g.monto || 0);

        const d = g.fecha
          ? `${String(g.fecha.getUTCDate()).padStart(2, "0")}/${MES[g.fecha.getUTCMonth()]}/${g.fecha.getUTCFullYear()}`
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
          await refresh();
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
      banner("No se pudo cargar información del proyecto. " + escapeHtml(e.message), "danger");
    } finally {
      showSpinner(false);
    }
  }

  // =====================================================
  //  EVENTOS
  // =====================================================
  document.getElementById("nav-search")?.addEventListener("submit", async (ev) => {
    ev.preventDefault();
    const project = (document.getElementById("proj-code")?.value || "").trim();
    if (!project) return;
    await refresh(project);
  });

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

  // Registrar gasto
  document.getElementById("form-gasto")?.addEventListener("submit", async (ev) => {
    ev.preventDefault();

    const project = STATE.proyecto || (document.getElementById("proj-code")?.value || "").trim();
    const fecha = document.getElementById("g-fecha")?.value || null;
    const descripcion = document.getElementById("g-desc")?.value.trim() || "";
    const partida = document.getElementById("g-partida")?.value || "";
    const monto = parseFloat(document.getElementById("g-monto")?.value || "0");

    if (!project) return banner("Captura el ID de proyecto antes de registrar", "warning");
    if (!partida || !descripcion || !Number.isFinite(monto) || monto <= 0)
      return banner("Completa partida, descripción y monto válido", "warning");

    try {
      await apiPost("/api/gastos", { project, partida, fecha, descripcion, monto });
      await refresh(project);
      banner("Gasto registrado", "success");
      ev.target.reset();
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
    const today = new Date().toISOString().slice(0, 10);
    const gf = document.getElementById("g-fecha");
    if (gf) gf.value = today;

    const params = new URLSearchParams(window.location.search);
    const qProject = params.get("project");
    const memProject = localStorage.getItem(LS_PROJECT_KEY);
    const proj = (qProject || memProject || "").trim();

    const input = document.getElementById("proj-code");
    if (proj && input) input.value = proj;

    if (proj) await refresh(proj);
    else {
      renderPartidasSelect();
      renderGastos();
    }
  });
})();
