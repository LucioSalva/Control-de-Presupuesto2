import { Router } from "express";
import { query, getClient } from "../db.js";

const router = Router();

/**
 * Auditoría: quién ejecuta la acción (viene del front en header)
 * Frontend manda: headers: { "x-user-id": <id del usuario logueado> }
 */
function getActorId(req) {
  const actorId = Number(req.headers["x-user-id"] || 0);
  return Number.isFinite(actorId) && actorId > 0 ? actorId : null;
}

/* =====================================================
   ADMINISTRACIÓN DE USUARIOS (CRUD) ✅ con auditoría
   Base path: /api/admin/usuarios
   ===================================================== */

// LISTA completa
router.get("/", async (_req, res) => {
  try {
    const sql = `
      SELECT
        u.id,
        u.nombre_completo,
        u.usuario,
        u.correo,
        u.activo,
        u.fecha_creacion,

        -- Dependencia general
        u.id_dgeneral,
        dg.clave AS dgeneral_clave,
        dg.dependencia AS dgeneral_nombre,

        -- Dependencia auxiliar
        u.id_dauxiliar,
        da.clave AS dauxiliar_clave,
        da.dependencia AS dauxiliar_nombre,

        -- Auditoría
        u.updated_by,
        u.updated_at,

        -- Roles
        COALESCE(
          ARRAY_AGG(DISTINCT r.clave) FILTER (WHERE r.clave IS NOT NULL),
          '{}'::text[]
        ) AS roles

      FROM public.usuarios u
      LEFT JOIN public.dgeneral dg ON dg.id = u.id_dgeneral
      LEFT JOIN public.dauxiliar da ON da.id = u.id_dauxiliar
      LEFT JOIN public.usuario_rol ur ON ur.id_usuario = u.id
      LEFT JOIN public.roles r ON r.id = ur.id_rol

      GROUP BY
        u.id,
        dg.clave,
        dg.dependencia,
        da.clave,
        da.dependencia

      ORDER BY u.id;
    `;

    const result = await query(sql);
    res.json(result.rows);
  } catch (err) {
    console.error("GET /api/admin/usuarios error:", err);
    res.status(500).json({ error: "Error obteniendo usuarios" });
  }
});

// CREAR usuario ✅ set updated_by/updated_at
router.post("/", async (req, res) => {
  const {
    nombre_completo,
    usuario,
    correo,
    password,
    id_dgeneral,
    id_dauxiliar,
    activo = true,
    roles = [],
  } = req.body;

  if (!nombre_completo || !usuario || !password) {
    return res.status(400).json({
      error: "Nombre completo, usuario y contraseña son obligatorios",
    });
  }

  const client = await getClient();
  try {
    await client.query("BEGIN");

    const actorId = getActorId(req);

    const ins = await client.query(
      `
      INSERT INTO usuarios (
        nombre_completo,
        usuario,
        correo,
        password,
        id_dgeneral,
        id_dauxiliar,
        activo,
        updated_by,
        updated_at
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,NOW())
      RETURNING id;
      `,
      [
        nombre_completo,
        usuario,
        correo || null,
        password,
        id_dgeneral || null,
        id_dauxiliar || null,
        !!activo,
        actorId,
      ]
    );

    const newId = ins.rows[0].id;

    // Roles
    await client.query("DELETE FROM usuario_rol WHERE id_usuario = $1", [newId]);

    if (Array.isArray(roles) && roles.length > 0) {
      for (const rClave of roles) {
        const r = String(rClave || "").trim().toUpperCase();
        if (!r) continue;

        const rolRow = await client.query(
          "SELECT id FROM roles WHERE UPPER(clave) = $1 LIMIT 1",
          [r]
        );

        if (rolRow.rowCount > 0) {
          const idRol = rolRow.rows[0].id;
          await client.query(
            `INSERT INTO usuario_rol (id_usuario, id_rol)
             VALUES ($1,$2)
             ON CONFLICT DO NOTHING;`,
            [newId, idRol]
          );
        }
      }
    }

    await client.query("COMMIT");
    res.json({ ok: true, id: newId });
  } catch (e) {
    await client.query("ROLLBACK");
    console.error("POST /api/admin/usuarios ERROR:", e);

    if (e.code === "23505") {
      return res
        .status(400)
        .json({ error: "Usuario o correo ya existen en el sistema" });
    }
    res.status(500).json({ error: "Error creando usuario" });
  } finally {
    client.release();
  }
});

// ACTUALIZAR usuario ✅ set updated_by/updated_at
router.put("/:id", async (req, res) => {
  const id = Number(req.params.id || 0);
  if (!id) return res.status(400).json({ error: "ID inválido" });

  const {
    nombre_completo,
    usuario,
    correo,
    password,
    id_dgeneral,
    id_dauxiliar,
    activo = true,
    roles = [],
  } = req.body;

  if (!nombre_completo || !usuario) {
    return res
      .status(400)
      .json({ error: "Nombre completo y usuario son obligatorios" });
  }

  const client = await getClient();
  try {
    await client.query("BEGIN");

    const actorId = getActorId(req);

    if (password && password.trim().length > 0) {
      await client.query(
        `
        UPDATE usuarios
           SET nombre_completo = $1,
               usuario         = $2,
               correo          = $3,
               password        = $4,
               id_dgeneral     = $5,
               id_dauxiliar    = $6,
               activo          = $7,
               updated_by      = $8,
               updated_at      = NOW()
         WHERE id = $9;
        `,
        [
          nombre_completo,
          usuario,
          correo || null,
          password,
          id_dgeneral || null,
          id_dauxiliar || null,
          !!activo,
          actorId,
          id,
        ]
      );
    } else {
      await client.query(
        `
        UPDATE usuarios
           SET nombre_completo = $1,
               usuario         = $2,
               correo          = $3,
               id_dgeneral     = $4,
               id_dauxiliar    = $5,
               activo          = $6,
               updated_by      = $7,
               updated_at      = NOW()
         WHERE id = $8;
        `,
        [
          nombre_completo,
          usuario,
          correo || null,
          id_dgeneral || null,
          id_dauxiliar || null,
          !!activo,
          actorId,
          id,
        ]
      );
    }

    // Roles
    await client.query("DELETE FROM usuario_rol WHERE id_usuario = $1", [id]);

    if (Array.isArray(roles) && roles.length > 0) {
      for (const rClave of roles) {
        const r = String(rClave || "").trim().toUpperCase();
        if (!r) continue;

        const rolRow = await client.query(
          "SELECT id FROM roles WHERE UPPER(clave) = $1 LIMIT 1",
          [r]
        );

        if (rolRow.rowCount > 0) {
          const idRol = rolRow.rows[0].id;
          await client.query(
            `INSERT INTO usuario_rol (id_usuario, id_rol)
             VALUES ($1,$2)
             ON CONFLICT DO NOTHING;`,
            [id, idRol]
          );
        }
      }
    }

    await client.query("COMMIT");
    res.json({ ok: true });
  } catch (e) {
    await client.query("ROLLBACK");
    console.error("PUT /api/admin/usuarios/:id ERROR:", e);

    if (e.code === "23505") {
      return res
        .status(400)
        .json({ error: "Usuario o correo ya existen en el sistema" });
    }
    res.status(500).json({ error: "Error actualizando usuario" });
  } finally {
    client.release();
  }
});

// ELIMINAR usuario ✅ set updated_by/updated_at antes de borrar
router.delete("/:id", async (req, res) => {
  const id = Number(req.params.id || 0);
  if (!id) return res.status(400).json({ error: "ID inválido" });

  const client = await getClient();
  try {
    await client.query("BEGIN");

    const actorId = getActorId(req);

    // fuerza updated_by/updated_at antes del DELETE (útil para auditoría/trigger)
    await client.query(
      `UPDATE public.usuarios
          SET updated_by = $1,
              updated_at = NOW()
        WHERE id = $2`,
      [actorId, id]
    );

    await client.query("DELETE FROM usuario_rol WHERE id_usuario = $1", [id]);
    await client.query("DELETE FROM usuarios WHERE id = $1", [id]);

    await client.query("COMMIT");
    res.json({ ok: true });
  } catch (e) {
    await client.query("ROLLBACK");
    console.error("DELETE /api/admin/usuarios/:id ERROR:", e);
    res.status(500).json({ error: "Error eliminando usuario" });
  } finally {
    client.release();
  }
});

export default router;
