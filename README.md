# 💼 CONTROL PRESUPUESTO WEB

### Sistema Integral para la Gestión, Control y Seguimiento del Presupuesto Municipal

---

## 🏛️ Contexto Institucional

**CONTROL PRESUPUESTO WEB 3** es un sistema desarrollado por la  
**Subdirección de Tecnologías de la Información y la Comunicación (TIC's)**  
del **H. Ayuntamiento de Ecatepec de Morelos**, con el objetivo de **optimizar la administración presupuestal** de los recursos municipales mediante herramientas digitales modernas, transparentes y accesibles desde la web.

El sistema automatiza procesos relacionados con la planeación, asignación y ejecución del gasto público, eliminando la dependencia de hojas de cálculo manuales y promoviendo la eficiencia administrativa con total transparencia.

---

## 🎯 Objetivo del Sistema

Proveer una plataforma unificada para el **registro, consulta, análisis y control del presupuesto municipal**, permitiendo a las áreas responsables:

- ✅ Registrar **partidas presupuestales** y sus montos iniciales  
- ✅ Capturar **gastos y reconducciones** en tiempo real  
- ✅ Consultar indicadores gráficos de **ejercicio del presupuesto**  
- ✅ Exportar información en formatos **Excel (.xlsx)** y **CSV**  
- ✅ Prevenir errores y saldos negativos mediante **alertas inteligentes**

---

## ⭐ Características Principales

| Módulo | Descripción |
|--------|-------------|
| 📊 **Dashboard de Control** | Visualización en tiempo real de totales de presupuesto, gasto, saldo y reconducciones con métricas clave |
| 💸 **Gestión de Partidas** | Alta, edición y seguimiento detallado de partidas presupuestales por proyecto |
| 🧾 **Registro de Gastos** | Control preciso de cada egreso con fecha, concepto, partida y validaciones automáticas |
| 🔁 **Reconducciones Presupuestales** | Movimientos entre partidas origen y destino en operaciones seguras y auditables |
| 📈 **Gráficos Interactivos** | Visualizaciones dinámicas con *Chart.js* para análisis mensual, por partida o global |
| ⚠️ **Sistema de Alertas** | Notificaciones inteligentes para saldos negativos, datos incompletos y anomalías |
| 💾 **Exportación Avanzada** | Generación de reportes completos en formatos Excel y CSV con estructura profesional |
| 🔍 **Búsqueda y Filtros** | Herramientas avanzadas para localizar partidas y movimientos específicos |

---

## 🛠️ Arquitectura Tecnológica

### Frontend
| Tecnología | Propósito |
|------------|-----------|
| ![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white) | Estructura semántica y accesibilidad |
| ![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white) | Diseño responsive y moderno |
| ![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black) | Lógica de aplicación e interactividad |
| ![Bootstrap](https://img.shields.io/badge/Bootstrap-7952B3?style=for-the-badge&logo=bootstrap&logoColor=white) | Framework UI profesional |

### Backend & Base de Datos
| Tecnología | Función |
|------------|---------|
| ![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white) | Runtime del servidor |
| ![Express.js](https://img.shields.io/badge/Express.js-000000?style=for-the-badge&logo=express&logoColor=white) | Framework de aplicación web |
| ![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=for-the-badge&logo=postgresql&logoColor=white) | Base de datos relacional |

### Librerías y Herramientas
| Tecnología | Utilidad |
|------------|----------|
| ![Chart.js](https://img.shields.io/badge/Chart.js-FF6384?style=for-the-badge&logo=chartdotjs&logoColor=white) | Visualización de datos y gráficos |
| ![SweetAlert2](https://img.shields.io/badge/SweetAlert2-EE6E6E?style=for-the-badge) | Alertas y notificaciones UX |
| ![SheetJS](https://img.shields.io/badge/SheetJS-217346?style=for-the-badge) | Exportación a Excel/XLSX |
| ![Git](https://img.shields.io/badge/Git-F05032?style=for-the-badge&logo=git&logoColor=white) | Control de versiones |

---

## 🚀 Instalación y Configuración

### Prerrequisitos
- Node.js 16+ 
- PostgreSQL 12+
- Navegador moderno (Chrome 90+, Firefox 88+, Safari 14+)

### Configuración Inicial
```bash
# Clonar repositorio
git clone https://github.com/ecatepec-tics/control-presupuesto-web.git

# Instalar dependencias
npm install

# Configurar variables de entorno
cp .env.example .env

# Inicializar base de datos
npm run init-db

# Ejecutar en desarrollo
npm run dev
Variables de Entorno
env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=presupuesto_municipal
DB_USER=usuario
DB_PASS=contraseña
PORT=3000
NODE_ENV=production
📊 Estructura de la Base de Datos
sql
-- Tabla principal de partidas presupuestales
CREATE TABLE partidas (
    id SERIAL PRIMARY KEY,
    proyecto VARCHAR(50) NOT NULL,
    partida VARCHAR(20) NOT NULL,
    presupuesto DECIMAL(15,2) DEFAULT 0,
    saldo_disponible DECIMAL(15,2) DEFAULT 0,
    fecha_registro TIMESTAMP DEFAULT NOW()
);

-- Tabla de movimientos y gastos
CREATE TABLE gastos (
    id SERIAL PRIMARY KEY,
    partida_id INTEGER REFERENCES partidas(id),
    monto DECIMAL(15,2) NOT NULL,
    descripcion TEXT,
    fecha_gasto DATE,
    created_at TIMESTAMP DEFAULT NOW()
);

Documentación Adicional
📚 Manual de Usuario

🛠️ Guía de Instalación

🔧 API Documentation

📄 Licencia y Uso
Este sistema es desarrollado y mantenido por la Subdirección de TIC's del H. Ayuntamiento de Ecatepec de Morelos para uso institucional interno.

© 2025 H. Ayuntamiento de Ecatepec de Morelos. Todos los derechos reservados.

<div align="center">
🏆 Comprometidos con la Excelencia en la Gestión Pública Digital
"Innovación tecnológica al servicio de la transparencia y eficiencia municipal"

</div> ```