// Estado global para las partidas
const PARTIDAS_STATE = {
  partidas: [],
  ivaAplicado: false,
  proyectoId: '',
  fechaPartida: '',
  fechaCreacion: '',
  fechaActualizacion: ''
};

// === API base ===
const API_URL = 'http://localhost:3000';

async function apiGet(path) {
  const r = await fetch(API_URL + path);
  if (!r.ok) throw new Error('GET ' + path + ' ' + r.status);
  return r.json();
}

async function apiPost(path, body) {
  const r = await fetch(API_URL + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok || data.error) throw new Error(data.error || ('POST ' + path));
  return data;
}

async function apiDelete(path) {
  const r = await fetch(API_URL + path, { method: 'DELETE' });
  const d = await r.json().catch(() => ({}));
  if (!r.ok || d.error) throw new Error(d.error || ('DELETE ' + path));
  return d;
}

// Función para formatear dinero
const money = (v) => {
  if (v === undefined || v === null || isNaN(v)) return '$0.00';
  return Number(v).toLocaleString('es-MX', { 
    style: 'currency', 
    currency: 'MXN', 
    minimumFractionDigits: 2,
    maximumFractionDigits: 2 
  });
};

// Función para formatear fecha
function formatearFecha(fecha) {
  if (!fecha) return '--/--/----';
  const date = new Date(fecha);
  return date.toLocaleDateString('es-MX', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
}

// Función para obtener fecha actual en formato YYYY-MM-DD
function obtenerFechaActual() {
  return new Date().toISOString().split('T')[0];
}

// Función para mostrar fecha actual en español
function mostrarFechaActual() {
  const ahora = new Date();
  const opciones = { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  };
  return ahora.toLocaleDateString('es-MX', opciones);
}

// Función para convertir número a letras
function numeroALetras(numero) {
  const unidades = ['', 'UN', 'DOS', 'TRES', 'CUATRO', 'CINCO', 'SEIS', 'SIETE', 'OCHO', 'NUEVE'];
  const decenas = ['', 'DIEZ', 'VEINTE', 'TREINTA', 'CUARENTA', 'CINCUENTA', 'SESENTA', 'SETENTA', 'OCHENTA', 'NOVENTA'];
  const especiales = ['DIEZ', 'ONCE', 'DOCE', 'TRECE', 'CATORCE', 'QUINCE', 'DIECISÉIS', 'DIECISIETE', 'DIECIOCHO', 'DIECINUEVE'];
  const centenas = ['', 'CIENTO', 'DOSCIENTOS', 'TRESCIENTOS', 'CUATROCIENTOS', 'QUINIENTOS', 'SEISCIENTOS', 'SETECIENTOS', 'OCHOCIENTOS', 'NOVECIENTOS'];

  if (numero === 0) return 'CERO';

  let entero = Math.floor(numero);
  let decimal = Math.round((numero - entero) * 100);
  let letras = '';

  // Procesar parte entera
  if (entero > 0) {
    if (entero >= 1000000) {
      let millones = Math.floor(entero / 1000000);
      if (millones === 1) {
        letras += 'UN MILLÓN ';
      } else {
        letras += numeroALetras(millones) + ' MILLONES ';
      }
      entero %= 1000000;
    }

    if (entero >= 1000) {
      let miles = Math.floor(entero / 1000);
      if (miles === 1) {
        letras += 'MIL ';
      } else {
        letras += numeroALetras(miles) + ' MIL ';
      }
      entero %= 1000;
    }

    if (entero >= 100) {
      letras += centenas[Math.floor(entero / 100)] + ' ';
      entero %= 100;
    }

    if (entero >= 10 && entero <= 19) {
      letras += especiales[entero - 10] + ' ';
      entero = 0;
    } else if (entero >= 20) {
      letras += decenas[Math.floor(entero / 10)];
      entero %= 10;
      if (entero > 0) {
        letras += ' Y ' + unidades[entero] + ' ';
      } else {
        letras += ' ';
      }
    } else if (entero > 0) {
      letras += unidades[entero] + ' ';
    }
  } else {
    letras = 'CERO ';
  }

  letras += 'PESOS';

  // Procesar decimales
  if (decimal > 0) {
    letras += ` ${decimal.toString().padStart(2, '0')}/100`;
  } else {
    letras += ' 00/100';
  }

  letras += ' M.N.';

  return letras.trim();
}

// Calcular importe total automáticamente
function calcularImporteTotal() {
  const cantidad = parseFloat(document.getElementById('cantidad').value) || 0;
  const precioUnitario = parseFloat(document.getElementById('precio-unitario').value) || 0;
  const importeTotal = cantidad * precioUnitario;
  
  document.getElementById('importe-total').value = money(importeTotal);
  return importeTotal;
}

// Actualizar cálculos generales
function actualizarCalculosGenerales() {
  const subtotal = PARTIDAS_STATE.partidas.reduce((sum, partida) => sum + partida.importeTotal, 0);
  
  let iva = 0;
  let totalGeneral = subtotal;
  
  if (PARTIDAS_STATE.ivaAplicado) {
    iva = subtotal * 0.16;
    totalGeneral = subtotal + iva;
  }
  
  document.getElementById('subtotal').textContent = money(subtotal);
  document.getElementById('iva').textContent = money(iva);
  document.getElementById('total-general').textContent = money(totalGeneral);
  document.getElementById('total-letras').textContent = numeroALetras(totalGeneral);
}

// Agregar partida a la tabla
function agregarPartidaATabla(partida, index) {
  const tbody = document.getElementById('tbody-partidas');
  const tr = document.createElement('tr');
  
  tr.innerHTML = `
    <td>${index + 1}</td>
    <td>${partida.cantidad}</td>
    <td>${partida.unidadMedida}</td>
    <td>${partida.descripcion}</td>
    <td class="text-end">${money(partida.precioUnitario)}</td>
    <td class="text-end">${money(partida.importeTotal)}</td>
    <td class="text-center">
      <button class="btn btn-sm btn-outline-danger btn-eliminar" data-index="${index}">
        <i class="bi bi-trash"></i>
      </button>
    </td>
  `;
  
  tbody.appendChild(tr);
  
  // Agregar evento de eliminación
  tr.querySelector('.btn-eliminar').addEventListener('click', function() {
    const index = parseInt(this.getAttribute('data-index'));
    eliminarPartida(index);
  });
}

// Eliminar partida
function eliminarPartida(index) {
  PARTIDAS_STATE.partidas.splice(index, 1);
  renderizarPartidas();
  actualizarCalculosGenerales();
  actualizarFechas();
}

// Renderizar todas las partidas
function renderizarPartidas() {
  const tbody = document.getElementById('tbody-partidas');
  tbody.innerHTML = '';
  
  PARTIDAS_STATE.partidas.forEach((partida, index) => {
    agregarPartidaATabla(partida, index);
  });
}

// Actualizar información de fechas
function actualizarFechas() {
  const ahora = new Date().toISOString();
  if (!PARTIDAS_STATE.fechaCreacion) {
    PARTIDAS_STATE.fechaCreacion = ahora;
  }
  PARTIDAS_STATE.fechaActualizacion = ahora;
  
  document.getElementById('fecha-creacion').textContent = formatearFecha(PARTIDAS_STATE.fechaCreacion);
  document.getElementById('fecha-actualizacion').textContent = formatearFecha(PARTIDAS_STATE.fechaActualizacion);
}

// Preguntar por IVA
async function preguntarIVA() {
  if (PARTIDAS_STATE.partidas.length === 0) return;
  
  const { value: aceptaIVA } = await Swal.fire({
    title: '¿Aplicar IVA?',
    text: '¿Desea aplicar el 16% de IVA al subtotal?',
    icon: 'question',
    showCancelButton: true,
    confirmButtonText: 'Sí, aplicar IVA',
    cancelButtonText: 'No, sin IVA',
    confirmButtonColor: '#198754',
    cancelButtonColor: '#6c757d'
  });
  
  PARTIDAS_STATE.ivaAplicado = aceptaIVA;
  actualizarCalculosGenerales();
  actualizarFechas();
}

// Limpiar formulario
function limpiarFormulario() {
  document.getElementById('form-partida-detalle').reset();
  document.getElementById('importe-total').value = '';
}

// Guardar partidas en la base de datos
async function guardarPartidas() {
  if (!PARTIDAS_STATE.proyectoId) {
    Swal.fire({
      title: 'Error',
      text: 'Por favor ingrese un ID de proyecto',
      icon: 'error',
      confirmButtonText: 'Aceptar'
    });
    return;
  }

  if (PARTIDAS_STATE.partidas.length === 0) {
    Swal.fire({
      title: 'Error',
      text: 'No hay partidas para guardar',
      icon: 'warning',
      confirmButtonText: 'Aceptar'
    });
    return;
  }

  try {
    const datos = {
      proyectoId: PARTIDAS_STATE.proyectoId,
      partidas: PARTIDAS_STATE.partidas,
      ivaAplicado: PARTIDAS_STATE.ivaAplicado,
      fechaPartida: PARTIDAS_STATE.fechaPartida,
      fechaCreacion: PARTIDAS_STATE.fechaCreacion,
      fechaActualizacion: PARTIDAS_STATE.fechaActualizacion
    };

    const resultado = await apiPost('/api/partidas', datos);
    
    Swal.fire({
      title: 'Éxito',
      text: 'Partidas guardadas correctamente en la base de datos',
      icon: 'success',
      confirmButtonText: 'Aceptar'
    });
    
    return resultado;
  } catch (error) {
    Swal.fire({
      title: 'Error',
      text: 'No se pudieron guardar las partidas: ' + error.message,
      icon: 'error',
      confirmButtonText: 'Aceptar'
    });
    throw error;
  }
}

// Cargar partidas desde la base de datos
async function cargarPartidas() {
  const proyectoId = document.getElementById('proyecto-id').value.trim();
  
  if (!proyectoId) {
    Swal.fire({
      title: 'Error',
      text: 'Por favor ingrese un ID de proyecto',
      icon: 'error',
      confirmButtonText: 'Aceptar'
    });
    return;
  }

  try {
    const partidas = await apiGet(`/api/partidas?proyectoId=${encodeURIComponent(proyectoId)}`);
    
    PARTIDAS_STATE.proyectoId = proyectoId;
    PARTIDAS_STATE.partidas = partidas.partidas || [];
    PARTIDAS_STATE.ivaAplicado = partidas.ivaAplicado || false;
    PARTIDAS_STATE.fechaPartida = partidas.fechaPartida || '';
    PARTIDAS_STATE.fechaCreacion = partidas.fechaCreacion || '';
    PARTIDAS_STATE.fechaActualizacion = partidas.fechaActualizacion || '';
    
    renderizarPartidas();
    actualizarCalculosGenerales();
    actualizarFechas();
    
    // Actualizar campos del formulario
    document.getElementById('fecha-partida').value = PARTIDAS_STATE.fechaPartida;
    
    Swal.fire({
      title: 'Éxito',
      text: `Se cargaron ${PARTIDAS_STATE.partidas.length} partidas`,
      icon: 'success',
      timer: 2000,
      showConfirmButton: false
    });
    
  } catch (error) {
    Swal.fire({
      title: 'Error',
      text: 'No se pudieron cargar las partidas: ' + error.message,
      icon: 'error',
      confirmButtonText: 'Aceptar'
    });
  }
}

// Exportar a Excel
function exportarAExcel() {
  if (PARTIDAS_STATE.partidas.length === 0) {
    Swal.fire({
      title: 'No hay datos',
      text: 'No hay partidas para exportar',
      icon: 'warning',
      confirmButtonText: 'Entendido'
    });
    return;
  }
  
  // Crear workbook
  const wb = XLSX.utils.book_new();
  
  // Preparar datos
  const datos = PARTIDAS_STATE.partidas.map((partida, index) => ({
    'No.': index + 1,
    'Cantidad': partida.cantidad,
    'Unidad de Medida': partida.unidadMedida,
    'Descripción': partida.descripcion,
    'Precio Unitario': partida.precioUnitario,
    'Importe Total': partida.importeTotal
  }));
  
  // Agregar totales
  const subtotal = PARTIDAS_STATE.partidas.reduce((sum, partida) => sum + partida.importeTotal, 0);
  const iva = PARTIDAS_STATE.ivaAplicado ? subtotal * 0.16 : 0;
  const total = subtotal + iva;
  
  datos.push(
    {},
    { 'Descripción': 'SUBTOTAL:', 'Importe Total': subtotal },
    { 'Descripción': 'IVA (16%):', 'Importe Total': iva },
    { 'Descripción': 'TOTAL:', 'Importe Total': total },
    { 'Descripción': 'TOTAL EN LETRAS:', 'Importe Total': numeroALetras(total) },
    {},
    { 'Descripción': 'PROYECTO ID:', 'Importe Total': PARTIDAS_STATE.proyectoId },
    { 'Descripción': 'FECHA PARTIDA:', 'Importe Total': PARTIDAS_STATE.fechaPartida },
    { 'Descripción': 'FECHA CREACIÓN:', 'Importe Total': formatearFecha(PARTIDAS_STATE.fechaCreacion) },
    { 'Descripción': 'FECHA ACTUALIZACIÓN:', 'Importe Total': formatearFecha(PARTIDAS_STATE.fechaActualizacion) }
  );
  
  const ws = XLSX.utils.json_to_sheet(datos);
  XLSX.utils.book_append_sheet(wb, ws, 'Partidas Detalladas');
  
  // Descargar archivo
  const fechaExportacion = new Date().toISOString().split('T')[0];
  XLSX.writeFile(wb, `partidas_detalladas_${PARTIDAS_STATE.proyectoId}_${fechaExportacion}.xlsx`);
  
  Swal.fire({
    title: 'Éxito',
    text: 'Partidas exportadas correctamente',
    icon: 'success',
    timer: 2000,
    showConfirmButton: false
  });
}

// Filtrar partidas
function filtrarPartidas() {
  const busqueda = document.getElementById('buscar-partidas').value.toLowerCase();
  const filas = document.querySelectorAll('#tbody-partidas tr');
  
  filas.forEach(fila => {
    const textoFila = fila.textContent.toLowerCase();
    fila.style.display = textoFila.includes(busqueda) ? '' : 'none';
  });
}

// Event Listeners
document.addEventListener('DOMContentLoaded', function() {
  // Mostrar fecha actual
  document.getElementById('fecha-actual').textContent = mostrarFechaActual();
  document.getElementById('fecha-partida').value = obtenerFechaActual();
  PARTIDAS_STATE.fechaPartida = obtenerFechaActual();
  
  // Calcular importe total automáticamente
  document.getElementById('cantidad').addEventListener('input', calcularImporteTotal);
  document.getElementById('precio-unitario').addEventListener('input', calcularImporteTotal);
  
  // Actualizar fecha de partida
  document.getElementById('fecha-partida').addEventListener('change', function() {
    PARTIDAS_STATE.fechaPartida = this.value;
    actualizarFechas();
  });
  
  // Formulario de partida
  document.getElementById('form-partida-detalle').addEventListener('submit', function(e) {
    e.preventDefault();
    
    const cantidad = parseFloat(document.getElementById('cantidad').value);
    const unidadMedida = document.getElementById('unidad-medida').value.trim();
    const descripcion = document.getElementById('descripcion').value.trim();
    const precioUnitario = parseFloat(document.getElementById('precio-unitario').value);
    const importeTotal = calcularImporteTotal();
    
    if (!cantidad || !unidadMedida || !descripcion || !precioUnitario) {
      Swal.fire({
        title: 'Error',
        text: 'Por favor complete todos los campos',
        icon: 'error',
        confirmButtonText: 'Aceptar'
      });
      return;
    }
    
    const nuevaPartida = {
      cantidad,
      unidadMedida,
      descripcion,
      precioUnitario,
      importeTotal
    };
    
    PARTIDAS_STATE.partidas.push(nuevaPartida);
    renderizarPartidas();
    actualizarCalculosGenerales();
    actualizarFechas();
    limpiarFormulario();
    
    // Preguntar por IVA si es la primera partida
    if (PARTIDAS_STATE.partidas.length === 1) {
      preguntarIVA();
    }
    
    Swal.fire({
      title: 'Éxito',
      text: 'Partida agregada correctamente',
      icon: 'success',
      timer: 2000,
      showConfirmButton: false
    });
  });
  
  // Botón limpiar todo
  document.getElementById('btn-limpiar-partidas').addEventListener('click', function() {
    Swal.fire({
      title: '¿Está seguro?',
      text: 'Esta acción eliminará todas las partidas',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, limpiar todo',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#dc3545'
    }).then((result) => {
      if (result.isConfirmed) {
        PARTIDAS_STATE.partidas = [];
        PARTIDAS_STATE.ivaAplicado = false;
        PARTIDAS_STATE.fechaCreacion = '';
        PARTIDAS_STATE.fechaActualizacion = '';
        renderizarPartidas();
        actualizarCalculosGenerales();
        actualizarFechas();
        limpiarFormulario();
        
        Swal.fire({
          title: 'Limpiado',
          text: 'Todas las partidas han sido eliminadas',
          icon: 'success',
          timer: 2000,
          showConfirmButton: false
        });
      }
    });
  });
  
  // Botón exportar
  document.getElementById('btn-export-partidas').addEventListener('click', exportarAExcel);
  
  // Botón guardar
  document.getElementById('btn-guardar-partidas').addEventListener('click', guardarPartidas);
  
  // Botón cargar partidas
  document.getElementById('btn-cargar-partidas').addEventListener('click', cargarPartidas);
  
  // Buscar partidas
  document.getElementById('buscar-partidas').addEventListener('input', filtrarPartidas);
  
  // Botón para cambiar IVA
  document.getElementById('iva').addEventListener('click', function() {
    preguntarIVA();
  });
  
  // Inicializar fechas
  actualizarFechas();
});