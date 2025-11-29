// ===== Utilidades =====
function toNum(v) {
  const n = Number(v);
  return isNaN(n) ? 0 : n;
}

// Actualiza badge de ejercicio
const ejercicioInput = document.getElementById('ejercicio');
const badgeEjercicio = document.getElementById('badge-ejercicio');

if (ejercicioInput && badgeEjercicio) {
  badgeEjercicio.textContent = ejercicioInput.value || '—';
  ejercicioInput.addEventListener('input', () => {
    badgeEjercicio.textContent = ejercicioInput.value || '—';
  });
}

// Cálculo automático de presupuesto modificado y por ejercer
const campoModificado = document.getElementById('presupuesto_modificado');
const campoPorEjercer = document.getElementById('por_ejercer');

function recalcularPresupuesto() {
  const original = toNum(document.getElementById('presupuesto_original').value);
  const amp = toNum(document.getElementById('ampliaciones').value);
  const red = toNum(document.getElementById('reducciones').value);
  const mod = original + amp - red;
  if (campoModificado) campoModificado.value = mod.toFixed(2);
  recalcularPorEjercer();
}

function recalcularPorEjercer() {
  const mod = toNum(campoModificado.value);
  const devAcum = toNum(document.getElementById('devengado_acum').value);
  const recon = toNum(document.getElementById('reconduccion').value);
  const porEj = mod - devAcum + recon;
  if (campoPorEjercer) campoPorEjercer.value = porEj.toFixed(2);
}

// Eventos para recálculo
['presupuesto_original', 'ampliaciones', 'reducciones'].forEach(id => {
  const el = document.getElementById(id);
  if (el) el.addEventListener('input', recalcularPresupuesto);
});

['devengado_acum', 'reconduccion'].forEach(id => {
  const el = document.getElementById(id);
  if (el) el.addEventListener('input', recalcularPorEjercer);
});

// ===== Carga de catálogos (si ya tienes endpoints REST) =====
// Descomenta y ajusta URLs para llenar los selects automáticamente.
async function cargarCatalogo(selectId, url, valueField = 'id', textField = 'descripcion') {
  const select = document.getElementById(selectId);
  if (!select) return;
  try {
    const res = await fetch(url);
    const json = await res.json();
    if (!Array.isArray(json)) return;
    json.forEach(item => {
      const opt = document.createElement('option');
      opt.value = item[valueField];
      opt.textContent = item[textField];
      select.appendChild(opt);
    });
  } catch (err) {
    console.error(`Error cargando catálogo ${selectId}:`, err);
  }
}

// Ejemplos (ajusta las URLs a tus endpoints reales)
// cargarCatalogo('id_dgeneral', '/api/dgeneral', 'id', 'descripcion');
// cargarCatalogo('id_dauxiliar', '/api/dauxiliar', 'id', 'dependencia');
// cargarCatalogo('id_fuente', '/api/fuentes', 'id', 'fuente');
// cargarCatalogo('id_programa', '/api/programas', 'id', 'descripcion');
// cargarCatalogo('id_proyecto', '/api/proyectos', 'id', 'descripcion');
// cargarCatalogo('id_partida', '/api/partidas', 'id', 'descripcion');

// ===== Envío del formulario =====
const form = document.getElementById('form-ejecucion');

if (form) {
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const data = Object.fromEntries(new FormData(form).entries());

    try {
      const res = await fetch('/api/reporte-ejecucion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      const json = await res.json();

      if (!res.ok || !json.ok) {
        console.error(json);
        alert('Error al guardar el registro de ejecución.');
        return;
      }

      alert('Registro guardado con ID: ' + json.id);
      form.reset();
      recalcularPresupuesto();
      badgeEjercicio.textContent = ejercicioInput.value || '—';
    } catch (err) {
      console.error(err);
      alert('Error de conexión con el servidor.');
    }
  });
}
