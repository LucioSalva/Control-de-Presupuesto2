import express from "express";
import { query } from "../db.js";

const router = express.Router();

/* =====================================================
   LOGIN (simple, sin JWT por ahora)
   ===================================================== */
router.post("/login", async (req, res) => {
  const { usuario, password } = req.body;

  if (!usuario || !password) {
    return res.status(400).json({ error: "Usuario y contraseña son requeridos" });
  }

  try {
    const sql = `
      SELECT u.id,
             u.nombre_completo,
             u.usuario,
             u.correo,
             u.password,
             u.id_dgeneral,
             u.id_dauxiliar,
             u.activo,
             d.clave AS dgeneral_clave,
             d.dependencia AS dgeneral_nombre,
             ARRAY(
               SELECT r.clave
               FROM usuario_rol ur
               JOIN roles r ON r.id = ur.id_rol
               WHERE ur.id_usuario = u.id
             ) AS roles
      FROM usuarios u
      LEFT JOIN dgeneral d ON d.id = u.id_dgeneral
      LEFT JOIN dauxiliar da ON da.id = u.id_dauxiliar
      WHERE u.usuario = $1
      LIMIT 1;
    `;

    const result = await query(sql, [usuario]);

    if (result.rowCount === 0) {
      return res.status(401).json({ error: "Credenciales inválidas" });
    }

    const user = result.rows[0];

    if (!user.activo) {
      return res.status(403).json({ error: "Usuario inactivo" });
    }

    // ⚠ SIN bcrypt, comparación directa
    if (user.password !== password) {
      return res.status(401).json({ error: "Credenciales inválidas" });
    }

    // Token "de mentiritas"
    const token = `token-${user.id}-${Date.now()}`;

    return res.json({
      token,
      usuario: {
        id: user.id,
        nombre_completo: user.nombre_completo,
        usuario: user.usuario,
        correo: user.correo,
        roles: user.roles,
        id_dgeneral: user.id_dgeneral,
        id_dauxiliar: user.id_dauxiliar,
        dgeneral_clave: user.dgeneral_clave,
        dgeneral_nombre: user.dgeneral_nombre,
      },
    });
  } catch (err) {
    console.error("Error en /api/login:", err);
    return res.status(500).json({ error: "Error interno" });
  }
});

export default router;
