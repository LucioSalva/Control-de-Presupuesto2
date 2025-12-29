import express from "express";
import { query, getClient } from "../db.js";

const router = express.Router();

/* =====================================================
   GET /api/suficiencias/next-folio
   ===================================================== */
router.get("/next-folio", async (_req, res) => {
  try {
    const r = await query(`
      SELECT COALESCE(MAX(folio_num), 0) + 1 AS folio_num
      FROM public.suficiencias
    `);
    res.json({ folio_num: Number(r.rows[0].folio_num) });
  } catch (e) {
    console.error("GET next-folio", e);
    res.status(500).json({ error: "Error obteniendo folio" });
  }
});

/* =====================================================
   POST /api/suficiencias
   ===================================================== */
router.post("/", async (req, res) => {
  const {
    fecha,
    dependencia,
    departamento,
    programa,
    proyecto,
    fuente,
    partida,
    mes_pago,
    justificacion_general,
    cantidad_con_letra,
    total,
    detalle = [],
  } = req.body || {};

  const totalNum = Number(total || 0);

  if (!fecha) return res.status(400).json({ error: "fecha es obligatoria" });
  if (!Number.isFinite(totalNum))
    return res.status(400).json({ error: "total inválido" });
  if (!Array.isArray(detalle))
    return res.status(400).json({ error: "detalle debe ser arreglo" });

  const client = await getClient();

  try {
    await client.query("BEGIN");

    await client.query("LOCK TABLE public.suficiencias IN EXCLUSIVE MODE");

    const folioQ = await client.query(`
      SELECT COALESCE(MAX(folio_num), 0) + 1 AS folio_num
      FROM public.suficiencias
    `);

    const folio_num = Number(folioQ.rows[0].folio_num);

    const ins = await client.query(
      `
      INSERT INTO public.suficiencias (
        folio_num,
        fecha,
        dependencia,
        departamento,
        programa,
        proyecto,
        fuente,
        partida,
        mes_pago,
        justificacion_general,
        cantidad_con_letra,
        total,
        created_at
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,NOW())
      RETURNING id, folio_num
      `,
      [
        folio_num,
        fecha,
        dependencia ?? null,
        departamento ?? null,
        programa ?? null,
        proyecto ?? null,
        fuente ?? null,
        partida ?? null,
        mes_pago ?? null,
        justificacion_general ?? null,
        cantidad_con_letra ?? null,
        totalNum,
      ]
    );

    const id = ins.rows[0].id;

    for (let i = 0; i < detalle.length; i++) {
      const d = detalle[i];

      await client.query(
        `
        INSERT INTO public.suficiencia_detalle (
          id_suficiencia,
          no,
          clave,
          concepto_partida,
          justificacion,
          descripcion,
          importe
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7)
        `,
        [
          id,
          i + 1,
          d.clave ?? null,
          d.concepto_partida ?? null,
          d.justificacion ?? null,
          d.descripcion ?? null,
          Number(d.importe || 0),
        ]
      );
    }

    await client.query("COMMIT");
    res.json({ ok: true, id, folio_num });
  } catch (e) {
    await client.query("ROLLBACK");
    console.error("POST /api/suficiencias", e);
    res.status(500).json({
      error: "Error guardando suficiencia",
      db: {
        message: e.message,
        code: e.code,
      },
    });
  } finally {
    client.release();
  }
});

export default router;
