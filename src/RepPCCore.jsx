import { useState, useEffect, useRef } from "react";
import { db } from './firebase';
import { collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot } from 'firebase/firestore';

const TALLER = {
  nombre: "RepPC",
  titular: "Martino Bernardi",
  dni: "43.234.717",
  alias: "MARTINOBERNARDIPC",
  waLink: "https://wa.me/5493406426202",
  clientUrl: "https://taller-gestion-bay.vercel.app/cliente",
};

const PRECIO_EXCLUS = 50000;
const fmt = n => "$" + n.toLocaleString("es-AR") + " ARS";

function diasDesde(fechaStr) {
  if (!fechaStr) return 0;
  const [datePart] = fechaStr.split(",");
  const [d, m, y] = datePart.trim().split("/");
  const desde = new Date(+y, +m - 1, +d);
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  return Math.floor((hoy - desde) / (1000 * 60 * 60 * 24));
}

function CountdownBar({ label, totalDays, diasPasados, colorOk, colorWarn, colorDanger }) {
  const restantes = Math.max(0, totalDays - diasPasados);
  const pct = Math.min(100, (diasPasados / totalDays) * 100);
  const color = pct < 50 ? colorOk : pct < 80 ? colorWarn : colorDanger;
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, fontSize: 13 }}>
        <span style={{ color: "#94A3B8" }}>{label}</span>
        <span style={{ fontFamily: "var(--mo)", fontWeight: 700, color, fontSize: 15 }}>
          {restantes === 0 ? "VENCIDO" : restantes + " dia" + (restantes !== 1 ? "s" : "")}
        </span>
      </div>
      <div style={{ background: "var(--s2)", borderRadius: 8, height: 10, overflow: "hidden" }}>
        <div style={{ height: "100%", width: pct + "%", background: color, borderRadius: 8, transition: "width .5s" }} />
      </div>
      {restantes === 0 && <div style={{ fontSize: 11, color: colorDanger, marginTop: 4 }}>Plazo vencido</div>}
    </div>
  );
}

function SignaturePad({ title, onSave, onCancel }) {
  const canvasRef = useRef(null);
  const [drawing, setDrawing] = useState(false);
  useEffect(() => {
    const c = canvasRef.current; if (!c) return;
    const ctx = c.getContext("2d");
    c.width = c.offsetWidth; c.height = 160;
    ctx.fillStyle = "#162B50"; ctx.fillRect(0, 0, c.width, c.height);
    ctx.strokeStyle = "#06B6D4"; ctx.lineWidth = 2; ctx.lineCap = "round";
  }, []);
  const getPos = e => {
    const r = canvasRef.current.getBoundingClientRect();
    const t = e.touches ? e.touches[0] : e;
    return { x: t.clientX - r.left, y: t.clientY - r.top };
  };
  const start = e => { e.preventDefault(); setDrawing(true); const ctx = canvasRef.current.getContext("2d"); const p = getPos(e); ctx.beginPath(); ctx.moveTo(p.x, p.y); };
  const draw = e => { e.preventDefault(); if (!drawing) return; const ctx = canvasRef.current.getContext("2d"); const p = getPos(e); ctx.lineTo(p.x, p.y); ctx.stroke(); };
  const stop = e => { e.preventDefault(); setDrawing(false); };
  const clear = () => { const c = canvasRef.current; const ctx = c.getContext("2d"); ctx.fillStyle = "#162B50"; ctx.fillRect(0, 0, c.width, c.height); };
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontSize: 12, color: "var(--mu)", fontWeight: 700, marginBottom: 6, textTransform: "uppercase", letterSpacing: .5 }}>{title}</div>
      <div style={{ border: "2px solid var(--cy)", borderRadius: 12, overflow: "hidden", marginBottom: 8 }}>
        <canvas ref={canvasRef} style={{ width: "100%", height: 160, display: "block", touchAction: "none" }}
          onMouseDown={start} onMouseMove={draw} onMouseUp={stop} onMouseLeave={stop}
          onTouchStart={start} onTouchMove={draw} onTouchEnd={stop} />
      </div>
      <div style={{ fontSize: 10, color: "var(--mu)", textAlign: "center", marginBottom: 8 }}>Firma con el dedo o el mouse</div>
      <div style={{ display: "flex", gap: 8 }}>
        <button className="btn b-gh btn-sm" style={{ flex: 1 }} onClick={clear}>Borrar</button>
        {onCancel && <button className="btn b-gh btn-sm" style={{ flex: 1 }} onClick={onCancel}>Cancelar</button>}
        <button className="btn b-cy btn-sm" style={{ flex: 1 }} onClick={() => onSave(canvasRef.current.toDataURL("image/png"))}>Guardar</button>
      </div>
    </div>
  );
}

const ESTADOS = [
  { key: "recibido", label: "Ingresado / Recepcion", icon: "📥", color: "#38BDF8" },
  { key: "diagnostico", label: "En Diagnostico", icon: "🔍", color: "#7DD3FC" },
  { key: "presupuesto", label: "Presupuesto Enviado", icon: "📋", color: "#BAE6FD" },
  { key: "reparacion", label: "En Reparacion", icon: "🔧", color: "#0EA5E9" },
  { key: "listo", label: "Listo para Retirar", icon: "✅", color: "#22D3EE" },
  { key: "entregado", label: "Entregado", icon: "🎉", color: "#67E8F9" },
  { key: "cancelado", label: "Cancelado", icon: "❌", color: "#EF4444" },
];

function genId() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let c = "";
  for (let i = 0; i < 4; i++) c += chars[Math.floor(Math.random() * chars.length)];
  return c;
}
  
function now() {
  return new Date().toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function estadoLabel(key) { return ESTADOS.find(e => e.key === key)?.label || key; }

async function generarPDF(order) {
  const { jsPDF } = window.jspdf;
  const d = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const W = 210, M = 18; let y = 0;
  const rct = (x, yy, w, h, hex) => { d.setFillColor(hex); d.rect(x, yy, w, h, "F"); };
  const ln = (x1, y1, x2, y2, hex) => { d.setDrawColor(hex || "#CBD5E1"); d.line(x1, y1, x2, y2); };
  const txt = (t, x, yy, o = {}) => { d.setFontSize(o.size || 10); d.setTextColor(o.color || "#0F172A"); d.setFont("helvetica", o.bold ? "bold" : "normal"); if (o.align) d.text(String(t), x, yy, { align: o.align }); else d.text(String(t), x, yy); };
  const chk = n => { if (y + n > 270) { d.addPage(); y = 18; } };

  // Header
  rct(0, 0, W, 42, "#0A1628"); rct(0, 0, 4, 42, "#06B6D4");
  txt("RepPC", M, 15, { size: 22, bold: true, color: "#06B6D4" });
  txt("Reparacion de PC", M, 23, { size: 9, color: "#7DD3FC" });
  txt("Titular: " + TALLER.titular + " DNI " + TALLER.dni, M, 30, { size: 8, color: "#64748B" });
  txt("Alias: " + TALLER.alias, M, 36, { size: 8, color: "#64748B" });
  txt("ORDEN", W - M, 13, { size: 8, color: "#64748B", align: "right" });
  txt(order.id, W - M, 21, { size: 18, bold: true, color: "#06B6D4", align: "right" });
  txt("Ingreso: " + order.fecha, W - M, 28, { size: 8, color: "#94A3B8", align: "right" });
  y = 50;

  // Cliente / equipo
  const half = (W - M * 2 - 4) / 2;
  rct(M, y, half, 34, "#F0F9FF"); rct(M + half + 4, y, half, 34, "#F0F9FF");
  d.setDrawColor("#BAE6FD"); d.rect(M, y, half, 34); d.rect(M + half + 4, y, half, 34);
  txt("CLIENTE", M + 4, y + 7, { size: 7, bold: true, color: "#0369A1" });
  txt(order.nombre, M + 4, y + 14, { size: 11, bold: true });
  txt("Tel: " + (order.telefono || "-"), M + 4, y + 21, { size: 9, color: "#334155" });
  txt("EQUIPO", M + half + 8, y + 7, { size: 7, bold: true, color: "#0369A1" });
  txt(order.marca, M + half + 8, y + 14, { size: 11, bold: true });
  txt("Estado: " + estadoLabel(order.estado), M + half + 8, y + 28, { size: 8, color: "#0369A1" });
  y += 40;

  // Problema
  chk(30); txt("PROBLEMA REPORTADO", M, y, { size: 8, bold: true, color: "#0369A1" });
  y += 4; ln(M, y, W - M, y, "#BAE6FD"); y += 5;
  const pL = d.splitTextToSize(order.problema || "No especificado.", W - M * 2 - 4);
  d.setFontSize(9); d.setTextColor("#1E293B"); d.setFont("helvetica", "normal"); d.text(pL, M, y); y += pL.length * 5 + 6;

  // Diagnostico
  if (order.diagnostico) {
    chk(30); txt("DIAGNOSTICO", M, y, { size: 8, bold: true, color: "#0369A1" });
    y += 4; ln(M, y, W - M, y, "#BAE6FD"); y += 5;
    const dL = d.splitTextToSize(order.diagnostico, W - M * 2 - 4);
    d.setFontSize(9); d.setTextColor("#1E293B"); d.setFont("helvetica", "normal"); d.text(dL, M, y); y += dL.length * 5 + 6;
  }

  // Trabajo realizado
  if (order.trabajoRealizado) {
    chk(30); txt("TRABAJO REALIZADO", M, y, { size: 8, bold: true, color: "#0369A1" });
    y += 4; ln(M, y, W - M, y, "#BAE6FD"); y += 5;
    const tL = d.splitTextToSize(order.trabajoRealizado, W - M * 2 - 4);
    d.setFontSize(9); d.setTextColor("#1E293B"); d.setFont("helvetica", "normal"); d.text(tL, M, y); y += tL.length * 5 + 6;
  }

  // Costo
  if (order.costoFinal) {
    chk(25); rct(M, y, W - M * 2, 20, "#0A1628"); rct(M, y, 3, 20, "#06B6D4");
    txt("COSTO TOTAL", M + 8, y + 8, { size: 9, bold: true, color: "#7DD3FC" });
    txt(order.costoFinal, W - M - 4, y + 8, { size: 15, bold: true, color: "#06B6D4", align: "right" }); y += 26;
  }

  // Transferencia
  chk(35); rct(M, y, W - M * 2, 30, "#F0F9FF"); d.setDrawColor("#BAE6FD"); d.rect(M, y, W - M * 2, 30);
  txt("DATOS PARA TRANSFERENCIA", M + 4, y + 7, { size: 7, bold: true, color: "#0369A1" });
  txt("Alias: " + TALLER.alias, M + 4, y + 14, { size: 9, bold: true });
  txt("Titular: " + TALLER.titular + " DNI " + TALLER.dni, M + 4, y + 21, { size: 8, color: "#334155" });
  txt("Verificar titular antes de transferir.", M + 4, y + 27, { size: 7, color: "#DC2626" }); y += 36;

  // Clausula
  chk(50); rct(M, y, W - M * 2, 46, "#FFFBEB"); d.setDrawColor("#FCD34D"); d.rect(M, y, W - M * 2, 46);
  txt("TERMINOS Y CONDICIONES", M + 4, y + 8, { size: 7, bold: true, color: "#92400E" });
  const cl = "El cliente tiene 30 dias para retirar el equipo sin costo adicional. Luego se aplica recargo diario. A los 90 dias se declara abandono segun Art. 2525, 2375, 2524 y 2523 del Codigo Civil y Comercial.";
  d.splitTextToSize(cl, W - M * 2 - 8).forEach((l, i) => txt(l, M + 4, y + 16 + i * 4.5, { size: 7, color: "#78350F" })); y += 52;

  // Firmas
  chk(45);
  txt("FIRMAS", M, y, { size: 8, bold: true, color: "#0369A1" }); y += 6;

  // Firma cliente
  if (order.firmaCliente) {
    try { d.addImage(order.firmaCliente, "PNG", M, y, 55, 22); } catch (_) { }
  }
  ln(M, y + 24, M + 58, y + 24, "#94A3B8");
  txt("Firma del cliente", M + 2, y + 29, { size: 7, color: "#94A3B8" });

  // Firma tecnico
  if (order.firmaTecnico) {
    try { d.addImage(order.firmaTecnico, "PNG", W - M - 58, y, 55, 22); } catch (_) { }
  }
  ln(W - M - 58, y + 24, W - M, y + 24, "#94A3B8");
  txt("Firma del tecnico / RepPC", W - M - 2, y + 29, { size: 7, color: "#94A3B8", align: "right" });

  d.save("RepPC_" + order.id + "_" + order.nombre.replace(/\s/g, "_") + ".pdf");
}

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@500&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
:root{--bg:#0A1628;--s1:#0F2040;--s2:#162B50;--cy:#06B6D4;--cy2:#22D3EE;--cy3:#67E8F9;--wh:#F0F9FF;--mu:#64748B;--bd:#1E3A5F;--tx:#E0F2FE;--go:#F59E0B;--re:#EF4444;--gr:#059669;--fn:'Plus Jakarta Sans',sans-serif;--mo:'JetBrains Mono',monospace;}
body{background:var(--bg);color:var(--tx);font-family:var(--fn);min-height:100vh;}
.layout{display:flex;min-height:100vh;}
.col-L{width:500px;flex-shrink:0;border-right:1px solid var(--bd);overflow-y:auto;background:var(--bg);}
.col-R{flex:1;background:#080F1C;overflow-y:auto;}
.col-R-top{padding:12px 18px;border-bottom:1px solid var(--bd);font-family:var(--mo);font-size:11px;color:var(--cy);letter-spacing:1.5px;position:sticky;top:0;background:var(--bg);z-index:5;}
@media(max-width:800px){.layout{flex-direction:column;}.col-L{width:100%;border-right:none;}.col-R-top{display:none;}.mob-hide{display:none!important;}.mob-nav{display:flex!important;}}
@media(min-width:801px){.mob-nav{display:none!important;}}
.mob-nav{display:none;gap:4px;padding:12px 12px 0;}
.mnb{flex:1;padding:11px 8px;border-radius:10px;border:1px solid var(--bd);background:var(--s1);color:var(--mu);font-family:var(--fn);font-size:13px;font-weight:700;cursor:pointer;transition:all .2s;}
.mnb.on{background:var(--cy);color:var(--bg);border-color:var(--cy);}
.hdr{padding:20px 14px 8px;}
.logo{display:flex;align-items:center;gap:10px;margin-bottom:4px;}
.logo-ic{width:38px;height:38px;background:var(--cy);border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0;}
.logo-nm{font-size:24px;font-weight:800;color:var(--cy);letter-spacing:-1px;}
.logo-tg{font-size:10px;color:var(--mu);letter-spacing:.5px;}
.hdr-ct{color:var(--mu);font-size:12px;margin-top:2px;}
.tabs{display:flex;gap:6px;padding:0 14px 10px;}
.tab{flex:1;padding:9px 8px;border-radius:10px;border:1px solid var(--bd);background:var(--s2);color:var(--mu);font-family:var(--fn);font-size:12px;font-weight:700;cursor:pointer;transition:all .2s;text-align:center;}
.tab.cy{background:var(--bg);color:var(--cy);border-color:var(--cy);}
.tab.gr{background:#064E3B;color:#6EE7B7;border-color:#6EE7B7;}
.srch{margin:0 14px 10px;}
.srch input{width:100%;background:var(--s2);border:1px solid var(--bd);border-radius:10px;color:var(--wh);font-family:var(--fn);font-size:14px;padding:11px 14px;outline:none;transition:border-color .2s;}
.srch input:focus{border-color:var(--cy);}
.filt-row{display:flex;gap:4px;padding:0 14px 10px;flex-wrap:wrap;}
.filt{padding:6px 10px;border-radius:8px;border:1px solid var(--bd);background:var(--s2);color:var(--mu);font-family:var(--fn);font-size:11px;font-weight:600;cursor:pointer;transition:all .2s;}
.filt.on{background:rgba(6,182,212,.15);color:var(--cy);border-color:var(--cy);}
.card{background:var(--s1);border:1px solid var(--bd);border-radius:14px;padding:14px 16px;margin:0 14px 8px;cursor:pointer;transition:border-color .2s,box-shadow .2s;}
.card:hover{border-color:var(--cy);box-shadow:0 0 0 1px rgba(6,182,212,.15);}
.card.del{opacity:.8;border-color:#064E3B;}
.cid{font-family:var(--mo);font-size:12px;color:var(--cy);letter-spacing:1px;}
.cid-g{color:#6EE7B7;}
.cnm{font-size:16px;font-weight:700;color:var(--wh);margin:4px 0 2px;}
.cdv{color:var(--mu);font-size:13px;}
.cdt{color:var(--mu);font-size:11px;margin-top:5px;}
.cst{display:inline-flex;align-items:center;gap:6px;margin-top:8px;background:var(--s2);border-radius:20px;padding:4px 12px;font-size:12px;font-weight:600;}
.bdg{display:inline-flex;align-items:center;gap:3px;border-radius:20px;padding:3px 9px;font-size:11px;font-weight:700;margin-left:4px;}
.bdg.b-go{background:var(--go);color:#0A1628;}
.bdg.b-bl{background:#0369A1;color:#E0F2FE;}
.fab{position:fixed;bottom:24px;right:20px;width:56px;height:56px;border-radius:50%;background:var(--cy);border:none;color:var(--bg);font-size:26px;cursor:pointer;box-shadow:0 4px 20px rgba(6,182,212,.5);transition:all .2s;display:flex;align-items:center;justify-content:center;z-index:10;}
.fab:hover{transform:scale(1.08);}
.sec{font-size:11px;color:var(--mu);letter-spacing:1px;text-transform:uppercase;font-weight:700;padding:0 16px;margin:14px 0 8px;}
.dhead{display:flex;align-items:center;gap:10px;padding:14px 14px 4px;}
.back{background:var(--s2);border:1px solid var(--bd);color:var(--tx);width:38px;height:38px;border-radius:10px;display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:18px;flex-shrink:0;}
.back:hover{border-color:var(--cy);}
.iblk{background:var(--s2);border-radius:12px;padding:14px;margin:0 14px 12px;border:1px solid var(--bd);}
.irow{display:flex;justify-content:space-between;align-items:flex-start;padding:8px 0;border-bottom:1px solid var(--bd);font-size:14px;gap:12px;}
.irow:last-child{border-bottom:none;}
.ik{color:var(--mu);flex-shrink:0;}
.iv{font-weight:600;color:var(--wh);text-align:right;}
.sgrid{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:12px;}
.sopt{background:var(--s2);border:2px solid var(--bd);border-radius:10px;padding:10px 8px;text-align:center;cursor:pointer;transition:all .2s;font-size:11px;color:var(--mu);}
.sopt.on{border-color:var(--cy);background:rgba(6,182,212,.1);color:var(--cy);}
.si{font-size:20px;display:block;margin-bottom:4px;}
.pr{display:flex;gap:8px;flex-wrap:wrap;margin-top:8px;}
.pt{width:72px;height:72px;border-radius:10px;object-fit:cover;border:1px solid var(--bd);}
.pa{width:72px;height:72px;border-radius:10px;border:2px dashed var(--bd);display:flex;align-items:center;justify-content:center;font-size:24px;cursor:pointer;color:var(--mu);background:var(--s2);transition:all .2s;}
.pa:hover{border-color:var(--cy);color:var(--cy);}
.plbl{font-size:11px;color:var(--mu);margin:4px 0;text-transform:uppercase;letter-spacing:.5px;font-weight:700;}
input[type=file]{display:none;}
.fs{padding:0 14px 80px;}
.fg{margin-bottom:14px;}
.fg label{display:block;font-size:11px;color:var(--mu);margin-bottom:6px;font-weight:700;letter-spacing:.8px;text-transform:uppercase;}
.fg input,.fg textarea{width:100%;background:var(--s2);border:1px solid var(--bd);border-radius:10px;color:var(--wh);font-family:var(--fn);font-size:15px;padding:12px 14px;outline:none;transition:border-color .2s;}
.fg input:focus,.fg textarea:focus{border-color:var(--cy);}
.fg textarea{resize:vertical;min-height:80px;}
.fg input::placeholder,.fg textarea::placeholder{color:var(--mu);}
.btn{width:100%;padding:13px;border-radius:12px;border:none;font-family:var(--fn);font-size:14px;font-weight:700;cursor:pointer;transition:all .2s;}
.btn:hover:not(:disabled){transform:translateY(-1px);}
.btn:disabled{opacity:.5;cursor:not-allowed;}
.b-cy{background:var(--cy);color:var(--bg);}
.b-cy:hover{background:var(--cy2);}
.b-go{background:var(--go);color:var(--bg);}
.b-gh{background:transparent;border:1px solid var(--bd);color:var(--tx);}
.b-gh:hover{border-color:var(--cy);}
.b-gn{background:#064E3B;color:#6EE7B7;border:1px solid #6EE7B7;}
.b-re{background:rgba(239,68,68,.15);border:1px solid rgba(239,68,68,.4);color:#FCA5A5;}
.b-pdf{background:var(--s2);color:var(--cy);border:1px solid var(--cy);}
.btn-sm{padding:8px 14px;font-size:13px;width:auto;border-radius:8px;}
@keyframes cp{0%,100%{box-shadow:0 0 10px rgba(6,182,212,.3);}50%{box-shadow:0 0 22px rgba(6,182,212,.7);}}
@keyframes gp{0%,100%{box-shadow:0 0 10px rgba(245,158,11,.25);}50%{box-shadow:0 0 22px rgba(245,158,11,.6);}}
@keyframes rocket{0%{transform:translateY(100vh) translateX(0);}100%{transform:translateY(-100vh) translateX(0);}}
@keyframes neonBorder{0%,100%{box-shadow:inset 0 0 10px rgba(6,182,212,.3), 0 0 5px rgba(6,182,212,.5);}50%{box-shadow:inset 0 0 15px rgba(6,182,212,.6), 0 0 10px rgba(6,182,212,.8);}}
.gl-cy{animation:cp 2s infinite;}
.gl-go{animation:gp 2s infinite;}
.wa{display:flex;align-items:center;justify-content:center;gap:8px;background:#25D366;color:white;border:none;border-radius:12px;padding:13px;font-family:var(--fn);font-size:14px;font-weight:700;cursor:pointer;width:100%;margin-bottom:10px;}
.wa:hover{background:#20BD5A;}
.pay-row{display:flex;gap:8px;align-items:center;}
.pay-ok{flex:1;border-radius:10px;padding:10px 14px;font-size:13px;font-weight:600;}
.pay-cy{background:rgba(6,182,212,.08);border:1px solid rgba(6,182,212,.3);color:var(--cy2);}
.pay-go{background:rgba(245,158,11,.08);border:1px solid rgba(245,158,11,.3);color:var(--go);}
.pay-x{flex-shrink:0;background:rgba(239,68,68,.1);border:1px solid rgba(239,68,68,.3);border-radius:10px;padding:10px 14px;color:#FCA5A5;font-size:13px;font-weight:700;cursor:pointer;font-family:var(--fn);}
.pay-x:hover{background:rgba(239,68,68,.2);}
.evlog{background:var(--s2);border-radius:10px;padding:12px;margin:0 14px 12px;border:1px solid var(--bd);}
.evit{display:flex;gap:8px;padding:6px 0;border-bottom:1px solid var(--bd);font-size:12px;}
.evit:last-child{border-bottom:none;}
.evt{flex:1;color:var(--tx);line-height:1.4;}
.evd{color:var(--mu);font-size:10px;flex-shrink:0;}
.hero{padding:28px 16px 16px;text-align:center;}
.h-logo{display:flex;align-items:center;justify-content:center;gap:10px;margin-bottom:6px;}
.h-ic{width:40px;height:40px;background:var(--cy);border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:20px;}
.h-nm{font-size:26px;font-weight:800;color:var(--cy);letter-spacing:-1px;}
.h-sb{font-size:12px;color:var(--mu);margin-bottom:18px;}
.h-id{font-family:var(--mo);font-size:30px;color:var(--cy);letter-spacing:2px;margin:8px 0 4px;}
.h-cl{font-size:19px;font-weight:700;color:var(--wh);}
.h-dv{color:var(--mu);font-size:14px;margin-top:4px;}
.h-ac{display:flex;flex-direction:column;gap:10px;margin-top:18px;width:100%;}
.bn-cy{background:rgba(6,182,212,.1);border:1px solid rgba(6,182,212,.3);border-radius:12px;padding:12px 16px;font-size:13px;color:var(--cy2);font-weight:700;text-align:center;}
.bn-go{background:rgba(245,158,11,.1);border:1px solid rgba(245,158,11,.3);border-radius:12px;padding:12px 16px;font-size:13px;color:var(--go);font-weight:700;text-align:center;}
.bn-gn{background:rgba(5,150,105,.1);border:1px solid rgba(5,150,105,.3);border-radius:12px;padding:12px 16px;font-size:13px;color:#34D399;font-weight:700;text-align:center;}
.bn-re{background:rgba(239,68,68,.08);border:1px solid rgba(239,68,68,.25);border-radius:12px;padding:12px 16px;font-size:13px;color:#FCA5A5;font-weight:700;text-align:center;}
.disc-old{font-size:14px;color:var(--mu);text-decoration:line-through;font-family:var(--mo);}
.disc-tag{display:inline-block;background:rgba(34,197,94,.15);border:1px solid rgba(34,197,94,.4);color:#4ADE80;border-radius:8px;padding:2px 8px;font-size:12px;font-weight:700;margin-left:6px;}
.disc-box{background:rgba(34,197,94,.1);border:1px solid rgba(34,197,94,.3);border-radius:12px;padding:12px 14px;margin-bottom:14px;}
.disc-new{font-size:20px;font-weight:800;color:#4ADE80;font-family:var(--mo);}
.tl-wrap{padding:0 16px 8px;}
.tl{display:flex;gap:14px;margin-bottom:6px;position:relative;}
.tl-dot{width:34px;height:34px;border-radius:50%;border:2px solid var(--bd);display:flex;align-items:center;justify-content:center;font-size:15px;flex-shrink:0;background:var(--s1);transition:all .3s;}
.tl-dot.dn{border-color:var(--cy);background:rgba(6,182,212,.15);}
.tl-dot.cu{border-color:var(--cy2);background:rgba(34,211,238,.15);box-shadow:0 0 14px rgba(6,182,212,.5);animation:cp 2s infinite;}
.tl-ln{position:absolute;left:16px;top:34px;width:2px;height:calc(100% + 6px);background:var(--bd);}
.tl-ln.dn{background:var(--cy);}
.tl-c{padding:5px 0 12px;}
.tl-lb{font-size:15px;font-weight:600;color:var(--mu);}
.tl-lb.dn{color:var(--cy3);}
.tl-lb.cu{color:var(--cy2);}
.tl-su{font-size:12px;color:var(--mu);margin-top:2px;}
.pcard{background:var(--s2);border:1px solid var(--cy);border-radius:14px;padding:16px;margin:0 14px 12px;}
.ptit{font-size:11px;color:var(--mu);font-weight:700;letter-spacing:.5px;text-transform:uppercase;margin-bottom:6px;}
.ptxt{font-size:14px;color:var(--wh);line-height:1.6;margin-bottom:12px;}
.pamt{background:var(--s1);border-radius:10px;padding:12px 14px;display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;}
.pk{font-size:13px;color:var(--mu);font-weight:600;}
.pv{font-size:22px;font-weight:800;font-family:var(--mo);color:var(--cy);}
.pv2{color:var(--cy2);}
.overlay{position:fixed;inset:0;background:rgba(5,10,20,.92);z-index:200;display:flex;align-items:flex-end;justify-content:center;padding:14px;}
.modal{background:var(--s1);border-radius:20px 20px 16px 16px;padding:24px;width:100%;max-width:480px;max-height:90vh;overflow-y:auto;}
.m-cy{border:1px solid var(--cy);}
.m-go{border:1px solid var(--go);}
.m-re{border:1px solid rgba(239,68,68,.5);}
.modal h2{font-size:20px;font-weight:800;margin-bottom:6px;}
.msub{color:var(--mu);font-size:13px;margin-bottom:16px;line-height:1.6;}
.bbox{background:var(--s2);border:1px solid var(--bd);border-radius:12px;padding:16px;margin-bottom:14px;}
.bamt{font-size:30px;font-weight:800;font-family:var(--mo);text-align:center;margin:6px 0 4px;}
.bamt-old{font-size:16px;font-family:var(--mo);text-align:center;color:var(--mu);text-decoration:line-through;margin-bottom:2px;}
.brow{display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid var(--bd);font-size:14px;}
.brow:last-child{border-bottom:none;}
.bk{color:var(--mu);}
.bv{font-weight:600;color:var(--wh);text-align:right;font-size:13px;}
.bnote{font-size:11px;text-align:center;padding:6px 10px;border-radius:8px;margin:6px 0 10px;line-height:1.5;}
.bn-b{background:rgba(6,182,212,.07);border:1px solid rgba(6,182,212,.2);color:var(--cy3);}
.bn-g{background:rgba(245,158,11,.07);border:1px solid rgba(245,158,11,.2);color:#FCD34D;}
.warn-cy{background:rgba(6,182,212,.06);border:1px solid rgba(6,182,212,.2);border-radius:12px;padding:14px 16px;margin-bottom:16px;}
.warn-go{background:rgba(245,158,11,.06);border:1px solid rgba(245,158,11,.2);border-radius:12px;padding:14px 16px;margin-bottom:16px;}
.warn-cy p,.warn-go p{font-size:14px;line-height:1.7;}
.warn-cy p strong{color:var(--cy2);}
.warn-go p strong{color:var(--go);}
.walert{background:rgba(239,68,68,.07);border:1px solid rgba(239,68,68,.2);border-radius:10px;padding:10px 14px;font-size:12px;color:#FCA5A5;margin-top:8px;line-height:1.5;}
.row2{display:flex;gap:10px;}
.empty{text-align:center;padding:60px 16px;color:var(--mu);}
.ei{font-size:52px;margin-bottom:14px;}
p.emp{font-size:15px;line-height:1.6;}
.accel-btn{position:relative;overflow:hidden;}
.accel-btn .rocket{position:absolute;pointer-events:none;}
.cam-picker{display:flex;gap:8px;margin-top:8px;}
`;

export default function RepPCCore({ viewMode = "both" }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mobView, setMobView] = useState("admin");
  const [adminTab, setAdminTab] = useState("list");
  const [listTab, setListTab] = useState("activos");
  const [statusFilter, setStatusFilter] = useState("todos");
  const [selId, setSelId] = useState(null);
  const [cliCode, setCliCode] = useState("");
  const [cliId, setCliId] = useState(null);
  const [modal, setModal] = useState(null);
  const [mStep, setMStep] = useState(1);
  const [confirmCfg, setConfirmCfg] = useState(null);
  const [search, setSearch] = useState("");
  const [pdfBusy, setPdfBusy] = useState(false);
  const [showSigCliente, setShowSigCliente] = useState(false);
  const [showSigTecnico, setShowSigTecnico] = useState(false);
  const [accelClicks, setAccelClicks] = useState(0);
  const [mesFilter, setMesFilter] = useState("todos");

  const [form, setForm] = useState({
    nombre: "", telefono: "", marca: "", problema: "", accesorios: "", notas: "",
    estado: "recibido", prioridad: "normal", prioridadPendiente: false,
    fotosRecepcion: [], fotosDurante: [], fotosListo: [],
    diagnostico: "", presupuestoMonto: "", costoRevision: "", costoFinal: "", trabajoRealizado: "",
    firmaCliente: null, firmaTecnico: null,
  });

  useEffect(() => {
    if (window.jspdf) return;
    const s = document.createElement("script");
    s.src = "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";
    document.head.appendChild(s);
  }, []);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "orders"), (snapshot) => {
      const data = [];
      snapshot.forEach((d) => data.push({ ...d.data(), firebaseId: d.id }));
      data.sort((a, b) => (b.updatedAt || "").localeCompare(a.updatedAt || ""));
      setOrders(data);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const uf = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const getO = id => orders.find(x => x.id === id);
  const selO = selId ? getO(selId) : null;
  const cliO = cliId ? getO(cliId) : null;
  const eIdx = key => ESTADOS.findIndex(e => e.key === key);

  async function updO(id, changes) {
    const order = orders.find(x => x.id === id);
    if (!order || !order.firebaseId) return;
    const updates = { ...changes, updatedAt: now() };
    if (changes.estado && changes.estado !== order.estado) {
      updates.historial = [...(order.historial || []), { estado: changes.estado, fecha: now() }];
      if (changes.estado === "listo") updates.fechaListo = now();
    }
    try { await updateDoc(doc(db, "orders", order.firebaseId), updates); }
    catch (e) { console.error("Error:", e); alert("Error al actualizar."); }
  }

  async function addEv(id, icon, text) {
    const order = orders.find(x => x.id === id);
    if (!order || !order.firebaseId) return;
    try {
      await updateDoc(doc(db, "orders", order.firebaseId), {
        eventos: [...(order.eventos || []), { icon, text, fecha: now() }], updatedAt: now()
      });
    } catch (e) { console.error("Error evento:", e); }
  }

  async function eliminarOrden(id) {
    const order = orders.find(x => x.id === id);
    if (!order || !order.firebaseId) return;
    try { await deleteDoc(doc(db, "orders", order.firebaseId)); setAdminTab("list"); setSelId(null); }
    catch (e) { console.error("Error eliminando:", e); alert("Error al eliminar."); }
  }

  function fotoF(key, files) {
    const u = Array.from(files).map(f => URL.createObjectURL(f));
    setForm(f => ({ ...f, [key]: [...f[key], ...u] }));
  }

  function fotoO(id, key, files) {
    const u = Array.from(files).map(f => URL.createObjectURL(f));
    const o = getO(id);
    if (o) updO(id, { [key]: [...(o[key] || []), ...u] });
  }

  async function createOrder() {
    if (!form.nombre || !form.marca) return alert("Nombre y equipo son obligatorios.");
    const id = genId();
    const o = { ...form, id, fecha: now(), updatedAt: now(), prioridad: "normal", prioridadPendiente: false, presupuestoRespuesta: null, historial: [{ estado: "recibido", fecha: now() }], eventos: [] };
    try {
      await addDoc(collection(db, "orders"), o);
      setForm({ nombre: "", telefono: "", marca: "", problema: "", accesorios: "", notas: "", estado: "recibido", prioridad: "normal", prioridadPendiente: false, fotosRecepcion: [], fotosDurante: [], fotosListo: [], diagnostico: "", presupuestoMonto: "", costoRevision: "", costoFinal: "", trabajoRealizado: "", firmaCliente: null, firmaTecnico: null });
      setAdminTab("list");
    } catch (e) { console.error("Error creando:", e); alert("Error al crear la orden."); }
  }

  const filtAll = orders.filter(o => (o.nombre || "").toLowerCase().includes(search.toLowerCase()) || (o.id || "").toLowerCase().includes(search.toLowerCase()) || (o.marca || "").toLowerCase().includes(search.toLowerCase()));
  const filtActivos = filtAll.filter(o => o.estado !== "entregado" && o.estado !== "cancelado");
  const filtEntregs = filtAll.filter(o => o.estado === "entregado" || o.estado === "cancelado");
  const filtByStatus = statusFilter === "todos" ? filtActivos : filtActivos.filter(o => o.estado === statusFilter);

  function parseMonto(str) {
    if (!str) return 0;
    const n = parseFloat(str.replace(/[^0-9.,]/g, "").replace(/\./g, "").replace(",", "."));
    return isNaN(n) ? 0 : n;
  }

  function getMesAnio(fechaStr) {
    if (!fechaStr) return null;
    const [datePart] = fechaStr.split(",");
    const parts = datePart.trim().split("/");
    if (parts.length < 3) return null;
    return parts[1] + "/" + parts[2];
  }

  const MESES_NOMBRE = { "01": "Enero", "02": "Febrero", "03": "Marzo", "04": "Abril", "05": "Mayo", "06": "Junio", "07": "Julio", "08": "Agosto", "09": "Septiembre", "10": "Octubre", "11": "Noviembre", "12": "Diciembre" };
  const entregsConMes = filtEntregs.map(o => ({ ...o, mesAnio: getMesAnio(o.fecha), monto: parseMonto(o.costoFinal) }));
  const mesesDisponibles = [...new Set(entregsConMes.map(o => o.mesAnio).filter(Boolean))].sort().reverse();
  const entregsFiltrados = mesFilter === "todos" ? filtEntregs : filtEntregs.filter(o => getMesAnio(o.fecha) === mesFilter);
  const totalRecaudado = entregsConMes.reduce((s, o) => s + o.monto, 0);
  const totalMesFiltrado = mesFilter === "todos" ? totalRecaudado : entregsConMes.filter(o => o.mesAnio === mesFilter).reduce((s, o) => s + o.monto, 0);
  const cantMesFiltrado = entregsFiltrados.length;

  function buscarOrden() {
    setTimeout(() => {
      const f = orders.find(o => (o.id || "").toLowerCase() === cliCode.trim().toLowerCase());
      if (f) setCliId(f.id);
      else alert("No se encontro una orden con ese codigo.");
    }, 100);
  }

  async function handlePDF(o) {
    if (!window.jspdf) { alert("PDF cargando..."); return; }
    setPdfBusy(true);
    try { await generarPDF(o); }
    catch (e) { alert("Error: " + e.message); }
    finally { setPdfBusy(false); }
  }

  const bRows = [["Alias", TALLER.alias], ["Titular", TALLER.titular], ["DNI", TALLER.dni]];

  function waSend(txt) { window.open(TALLER.waLink + "?text=" + encodeURIComponent(txt), "_blank"); }
  async function sharePres(txt) {
    if (navigator.share) { try { await navigator.share({ text: txt }); return; } catch (_) { } }
    window.open("https://wa.me/?text=" + encodeURIComponent(txt), "_blank");
  }

  function handleCameraInput(e, key, id) {
    const files = e.target.files;
    if (!files) return;
    if (id) fotoO(id, key, files);
    else fotoF(key, files);
  }

  // ── RENDER ──
  return (
    <>
      <style>{CSS}</style>
      <div className="layout" style={viewMode !== "both" ? { display: "block" } : {}}>

        {/* ====== ADMIN ====== */}
        {(viewMode === "admin" || viewMode === "both") && (
          <div className="col-L" style={viewMode === "admin" ? { width: "100%", borderRight: "none" } : {}}>
            {viewMode === "both" && <div className="mob-nav">
              <button className={"mnb" + (mobView === "admin" ? " on" : "")} onClick={() => setMobView("admin")}>Admin</button>
              <button className={"mnb" + (mobView === "client" ? " on" : "")} onClick={() => setMobView("client")}>Cliente</button>
            </div>}

            <div className={mobView === "client" && viewMode === "both" ? "mob-hide" : ""}>

              {/* LISTA */}
              {adminTab === "list" && (
                <>
                  {loading ? (
                    <div className="empty"><div className="ei">⏳</div><p className="emp">Cargando ordenes...</p></div>
                  ) : (<>
                    <div className="hdr">
                      <div className="logo"><div className="logo-ic">🖥️</div><div><div className="logo-nm">RepPC</div><div className="logo-tg">REPARACION DE PC</div></div></div>
                      <div className="hdr-ct">{filtActivos.length} activo{filtActivos.length !== 1 ? "s" : ""} - {filtEntregs.length} entregado{filtEntregs.length !== 1 ? "s" : ""}</div>
                    </div>
                    <div className="tabs">
                      <button className={"tab" + (listTab === "activos" ? " cy" : "")} onClick={() => { setListTab("activos"); setStatusFilter("todos"); }}>Activos ({filtActivos.length})</button>
                      <button className={"tab" + (listTab === "entregados" ? " gr" : "")} onClick={() => setListTab("entregados")}>Entregados ({filtEntregs.length})</button>
                    </div>
                    <div className="srch"><input placeholder="Buscar nombre, codigo o equipo..." value={search} onChange={e => setSearch(e.target.value)} /></div>

                    {listTab === "activos" && (
                      <div className="filt-row">
                        <button className={"filt" + (statusFilter === "todos" ? " on" : "")} onClick={() => setStatusFilter("todos")}>Todos</button>
                        {ESTADOS.filter(e => e.key !== "entregado" && e.key !== "cancelado").map(e => (
                          <button key={e.key} className={"filt" + (statusFilter === e.key ? " on" : "")} onClick={() => setStatusFilter(e.key)}>{e.icon} {e.label}</button>
                        ))}
                      </div>
                    )}

                    {listTab === "activos" && (
                      filtByStatus.length === 0
                        ? <div className="empty"><div className="ei">📭</div><p className="emp">No hay ordenes{statusFilter !== "todos" ? " en este estado" : ""}.<br />Presiona + para crear una.</p></div>
                        : filtByStatus.map(o => {
                          const est = ESTADOS.find(e => e.key === o.estado);
                          return (
                            <div key={o.id} className="card" onClick={() => { setSelId(o.id); setAdminTab("detail"); }}>
                              <div style={{ display: "flex", justifyContent: "space-between" }}>
                                <span className="cid">{o.id}</span>
                                <div>
                                  {o.prioridad === "premium" && <span className="bdg b-go">💎 PREMIUM</span>}
                                  {o.prioridadPendiente && <span className="bdg b-yw">⏳ PENDIENTE</span>}
                                </div>
                              </div>
                              <div className="cnm">{o.nombre}</div>
                              <div className="cdv">{o.marca}</div>
                              <span className="cst" style={{ color: est?.color }}>{est?.icon} {est?.label}</span>
                              <div className="cdt">{o.fecha}</div>
                            </div>
                          );
                        })
                    )}

                    {listTab === "entregados" && (
                      <>
                        {filtEntregs.length > 0 && (
                          <div style={{ margin: "0 14px 12px" }}>
                            <div style={{ background: "linear-gradient(135deg, #064E3B, #0F2040)", border: "1px solid #6EE7B7", borderRadius: 14, padding: 16 }}>
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                                <div style={{ fontSize: 11, color: "#6EE7B7", fontWeight: 700, letterSpacing: 1, textTransform: "uppercase" }}>Recaudacion</div>
                                <div style={{ fontSize: 11, color: "#6EE7B7" }}>{filtEntregs.length} orden{filtEntregs.length !== 1 ? "es" : ""}</div>
                              </div>
                              <div style={{ display: "flex", gap: 12, marginBottom: 12 }}>
                                <div style={{ flex: 1, background: "rgba(110,231,183,.08)", borderRadius: 10, padding: "10px 12px", textAlign: "center" }}>
                                  <div style={{ fontSize: 10, color: "#6EE7B7", fontWeight: 600, marginBottom: 4 }}>TOTAL HISTORICO</div>
                                  <div style={{ fontSize: 20, fontWeight: 800, color: "#6EE7B7", fontFamily: "var(--mo)" }}>{fmt(totalRecaudado)}</div>
                                </div>
                                {mesFilter !== "todos" && (
                                  <div style={{ flex: 1, background: "rgba(6,182,212,.08)", borderRadius: 10, padding: "10px 12px", textAlign: "center" }}>
                                    <div style={{ fontSize: 10, color: "var(--cy)", fontWeight: 600, marginBottom: 4 }}>{(() => { const [m] = mesFilter.split("/"); return (MESES_NOMBRE[m] || mesFilter).toUpperCase(); })()}</div>
                                    <div style={{ fontSize: 20, fontWeight: 800, color: "var(--cy)", fontFamily: "var(--mo)" }}>{fmt(totalMesFiltrado)}</div>
                                    <div style={{ fontSize: 10, color: "var(--mu)", marginTop: 2 }}>{cantMesFiltrado} orden{cantMesFiltrado !== 1 ? "es" : ""}</div>
                                  </div>
                                )}
                              </div>
                              <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                                <button className={"filt" + (mesFilter === "todos" ? " on" : "")} onClick={() => setMesFilter("todos")} style={{ fontSize: 10 }}>Todos</button>
                                {mesesDisponibles.map(ma => {
                                  const [m, y] = ma.split("/");
                                  return <button key={ma} className={"filt" + (mesFilter === ma ? " on" : "")} onClick={() => setMesFilter(ma)} style={{ fontSize: 10 }}>{(MESES_NOMBRE[m] || m) + " " + y}</button>;
                                })}
                              </div>
                            </div>
                          </div>
                        )}
                        {entregsFiltrados.length === 0
                          ? <div className="empty"><div className="ei">🎉</div><p className="emp">{mesFilter !== "todos" ? "No hay entregas en este mes." : "No hay equipos entregados aun."}</p></div>
                          : entregsFiltrados.map(o => (
                            <div key={o.id} className="card del" onClick={() => { setSelId(o.id); setAdminTab("detail"); }}>
                              <div style={{ display: "flex", justifyContent: "space-between" }}><span className="cid cid-g">{o.id}</span><span style={{ fontSize: 11, color: o.estado === "cancelado" ? "#FCA5A5" : "#6EE7B7", fontWeight: 700 }}>{o.estado === "cancelado" ? "CANCELADO" : "ENTREGADO"}</span></div>
                              <div className="cnm">{o.nombre}</div><div className="cdv">{o.marca}</div>
                              <div className="cdt">{o.fecha}</div>
                              {o.costoFinal && <div style={{ marginTop: 6, fontSize: 13, color: "#6EE7B7", fontWeight: 700 }}>{o.costoFinal}</div>}
                            </div>
                          ))
                        }
                      </>
                    )}
                    <div style={{ height: 90 }} />
                    <button className="fab" onClick={() => setAdminTab("new")}>+</button>
                  </>)}
                </>
              )}

              {/* NUEVA ORDEN */}
              {adminTab === "new" && (
                <>
                  <div className="dhead">
                    <button className="back" onClick={() => setAdminTab("list")}>&#8592;</button>
                    <div><div style={{ fontWeight: 800, fontSize: 18, color: "var(--wh)" }}>Nueva Orden</div></div>
                  </div>
                  <div className="fs">
                    {[["nombre", "Nombre del cliente", "Ej. Maria Gonzalez"], ["telefono", "Telefono", "+54 9 XXXX XXXXXX"], ["marca", "Marca / Modelo", "Ej. HP Pavilion 15"]].map(([k, l, p]) => (
                      <div key={k} className="fg"><label>{l}</label><input value={form[k]} onChange={e => uf(k, e.target.value)} placeholder={p} /></div>
                    ))}
                    <div className="fg"><label>Problema reportado</label><textarea value={form.problema} onChange={e => uf("problema", e.target.value)} placeholder="Que le pasa al equipo?" /></div>
                    <div className="fg"><label>Accesorios entregados</label><input value={form.accesorios} onChange={e => uf("accesorios", e.target.value)} placeholder="Cargador, funda, mouse..." /></div>
                    <div className="fg"><label>Notas internas</label><textarea value={form.notas} onChange={e => uf("notas", e.target.value)} placeholder="Observaciones..." style={{ minHeight: 60 }} /></div>
                    <div className="fg">
                      <label>Fotos en recepcion</label>
                      <div className="cam-picker">
                        <label style={{ flex: 1 }} className="pa" htmlFor="fR-cam">
                          📷<input id="fR-cam" type="file" accept="image/*" capture="environment" onChange={e => fotoF("fotosRecepcion", e.target.files)} />
                        </label>
                        <label style={{ flex: 1 }} className="pa" htmlFor="fR-gal">
                          🖼️<input id="fR-gal" type="file" accept="image/*" multiple onChange={e => fotoF("fotosRecepcion", e.target.files)} />
                        </label>
                      </div>
                      <div className="pr">
                        {form.fotosRecepcion.map((u, i) => <img key={i} src={u} className="pt" alt="" />)}
                      </div>
                    </div>

                    {/* FIRMAS */}
                    <div className="sec" style={{ padding: 0, marginBottom: 12 }}>Firmas de consentimiento</div>
                    {form.firmaCliente ? (
                      <div style={{ marginBottom: 14 }}>
                        <div style={{ fontSize: 11, color: "var(--mu)", fontWeight: 700, marginBottom: 4 }}>FIRMA DEL CLIENTE</div>
                        <img src={form.firmaCliente} alt="Firma cliente" style={{ height: 60, borderRadius: 8, border: "1px solid var(--bd)" }} />
                        <button className="btn b-gh btn-sm" style={{ marginTop: 6 }} onClick={() => uf("firmaCliente", null)}>Borrar firma</button>
                      </div>
                    ) : showSigCliente ? (
                      <SignaturePad title="Firma del cliente" onSave={(d) => { uf("firmaCliente", d); setShowSigCliente(false); }} onCancel={() => setShowSigCliente(false)} />
                    ) : (
                      <button className="btn b-gh" style={{ marginBottom: 14 }} onClick={() => setShowSigCliente(true)}>Registrar firma del cliente</button>
                    )}

                    {form.firmaTecnico ? (
                      <div style={{ marginBottom: 14 }}>
                        <div style={{ fontSize: 11, color: "var(--mu)", fontWeight: 700, marginBottom: 4 }}>FIRMA DEL TECNICO</div>
                        <img src={form.firmaTecnico} alt="Firma tecnico" style={{ height: 60, borderRadius: 8, border: "1px solid var(--bd)" }} />
                        <button className="btn b-gh btn-sm" style={{ marginTop: 6 }} onClick={() => uf("firmaTecnico", null)}>Borrar firma</button>
                      </div>
                    ) : showSigTecnico ? (
                      <SignaturePad title="Firma del tecnico" onSave={(d) => { uf("firmaTecnico", d); setShowSigTecnico(false); }} onCancel={() => setShowSigTecnico(false)} />
                    ) : (
                      <button className="btn b-gh" style={{ marginBottom: 14 }} onClick={() => setShowSigTecnico(true)}>Registrar firma del tecnico</button>
                    )}

                    <button className="btn b-cy" onClick={createOrder}>Crear Orden</button>
                  </div>
                </>
              )}

              {/* DETALLE */}
              {adminTab === "detail" && selO && (
                <>
                  <div className="dhead">
                    <button className="back" onClick={() => setAdminTab("list")}>&#8592;</button>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 800, fontSize: 17, color: "var(--wh)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{selO.nombre}</div>
                      <div style={{ color: "var(--cy)", fontSize: 12, fontFamily: "var(--mo)", letterSpacing: 1 }}>{selO.id}</div>
                    </div>
                    <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                      {selO.prioridad === "exclusiva" && <span className="bdg b-go">⭐ EXCLUSIVA</span>}
                    </div>
                  </div>

                  <div className="iblk">
                    {[["Equipo", selO.marca], ["Telefono", selO.telefono || "-"], ["Problema", selO.problema || "-"], ["Accesorios", selO.accesorios || "-"], ["Notas", selO.notas || "-"], ["Ingreso", selO.fecha]].map(([l, v]) => (
                      <div key={l} className="irow"><span className="ik">{l}</span><span className="iv">{v}</span></div>
                    ))}
                    {selO.firmaCliente && <div className="irow"><span className="ik">Firma cliente</span><span className="iv"><img src={selO.firmaCliente} alt="" style={{ height: 30, borderRadius: 4 }} /></span></div>}
                    {selO.firmaTecnico && <div className="irow"><span className="ik">Firma tecnico</span><span className="iv"><img src={selO.firmaTecnico} alt="" style={{ height: 30, borderRadius: 4 }} /></span></div>}
                  </div>

                  {/* ESTADO */}
                  {/* PRIORIDAD - CONTROL ADMIN */}
                  <div className="sec">Prioridad de reparación</div>
                  <div style={{ padding: "0 14px 12px" }}>
                    {selO.prioridad === "normal" ? (
                      <button className="btn b-go" onClick={() => { updO(selO.id, { prioridad: "premium" }); addEv(selO.id, "💎", "Admin cambio prioridad a Premium"); }}>
                        Cambiar a Premium - {fmt(PRECIO_EXCLUS)}
                      </button>
                    ) : (
                      <>
                        <div className="bn-go" style={{ marginBottom: 8 }}>💎 Prioridad Premium Activa</div>
                        <button className="btn b-re" onClick={() => { updO(selO.id, { prioridad: "normal" }); addEv(selO.id, "↩️", "Admin cambio prioridad a Normal"); }}>Cambiar a Normal</button>
                      </>
                    )}
                    {selO.prioridadPendiente && (
                      <div className="bn-yw" style={{ marginTop: 8 }}>⏳ Cliente solicito Premium - Pendiente confirmación</div>
                    )}
                  </div>

                  {/* ESTADO ACTUAL */}
                  <div className="sec">Estado actual</div>
                  <div style={{ padding: "0 14px 12px" }}>
                    <div className="sgrid">
                      {ESTADOS.map(e => (
                        <div key={e.key} className={"sopt" + (selO.estado === e.key ? " on" : "")} onClick={() => updO(selO.id, { estado: e.key })}>
                          <span className="si">{e.icon}</span><span>{e.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* ETAPA: DIAGNOSTICO */}
                  {(selO.estado === "recibido" || selO.estado === "diagnostico") && (
                    <>
                      <div className="sec">Diagnostico y presupuesto</div>
                      <div style={{ padding: "0 14px 12px" }}>
                        <div className="fg"><label>Diagnostico del equipo</label><textarea value={selO.diagnostico || ""} onChange={e => updO(selO.id, { diagnostico: e.target.value })} placeholder="Describe el problema encontrado..." /></div>
                        <div className="fg"><label>Monto del presupuesto</label><input value={selO.presupuestoMonto || ""} onChange={e => updO(selO.id, { presupuestoMonto: e.target.value })} placeholder="Ej. $65.000 ARS" /></div>
                        <div className="fg"><label>Costo de revision / diagnostico</label><input value={selO.costoRevision || ""} onChange={e => updO(selO.id, { costoRevision: e.target.value })} placeholder="Ej. $30.000 ARS" /></div>
                        {selO.presupuestoMonto ? (
                          <button className="btn b-cy" onClick={() => {
                            updO(selO.id, { estado: "presupuesto", presupuestoRespuesta: null });
                            addEv(selO.id, "📋", "Presupuesto enviado - " + selO.presupuestoMonto);
                            sharePres("Hola " + selO.nombre + "!\nDiagnostico de tu equipo " + selO.marca + "\nProblema: " + (selO.diagnostico || "-") + "\nPresupuesto aproximado de reparacion: " + selO.presupuestoMonto + "\n\nIngresa tu codigo " + selO.id + " en:\n" + TALLER.clientUrl + "\npara aceptar o rechazar la reparacion, o responde este mensaje. Gracias.\nRepPC");
                          }}>Enviar presupuesto al cliente</button>
                        ) : (
                          <div style={{ fontSize: 12, color: "var(--mu)", padding: "6px 0" }}>Completa el monto para enviar el presupuesto.</div>
                        )}
                      </div>
                    </>
                  )}

                  {/* ETAPA: PRESUPUESTO ENVIADO */}
                  {selO.estado === "presupuesto" && (
                    <>
                      <div className="sec">Presupuesto enviado</div>
                      <div style={{ padding: "0 14px 12px" }}>
                        <div className="iblk">
                          <div className="irow"><span className="ik">Diagnostico</span><span className="iv">{selO.diagnostico || "-"}</span></div>
                          <div className="irow"><span className="ik">Monto</span><span className="iv" style={{ color: "var(--cy)" }}>{selO.presupuestoMonto}</span></div>
                        </div>
                        {selO.presupuestoRespuesta ? (
                          <div className={selO.presupuestoRespuesta === "aceptado" ? "bn-gn" : "bn-re"}>
                            {selO.presupuestoRespuesta === "aceptado" ? "El cliente acepto el presupuesto" : "El cliente rechazo el presupuesto"}
                          </div>
                        ) : <div className="bn-go">Esperando respuesta del cliente...</div>}
                      </div>
                    </>
                  )}

                  {/* ETAPA: EN REPARACION */}
                  {selO.estado === "reparacion" && (
                    <>
                      <div className="sec">Presupuesto aceptado</div>
                      <div style={{ padding: "0 14px 12px" }}>
                        <div className="iblk">
                          <div className="irow"><span className="ik">Diagnostico</span><span className="iv">{selO.diagnostico || "-"}</span></div>
                          <div className="irow"><span className="ik">Presupuesto</span><span className="iv" style={{ color: "var(--cy)" }}>{selO.presupuestoMonto || "-"}</span></div>
                        </div>
                        <div className="bn-gn">Cliente acepto el presupuesto</div>
                      </div>
                    </>
                  )}

                  {/* ETAPA: LISTO PARA RETIRAR */}
                  {selO.estado === "listo" && (
                    <>
                      <div className="sec">Cierre de orden</div>
                      <div style={{ padding: "0 14px 12px" }}>
                        <div className="fg"><label>Costo final de la reparacion</label><input value={selO.costoFinal || ""} onChange={e => updO(selO.id, { costoFinal: e.target.value })} placeholder="Ej. $85.000 ARS" /></div>
                        <div className="fg"><label>Trabajo realizado</label><textarea value={selO.trabajoRealizado || ""} onChange={e => updO(selO.id, { trabajoRealizado: e.target.value })} placeholder="Describe todo lo que se hizo..." /></div>
                        <button className="btn b-cy" style={{ marginBottom: 8 }} onClick={() => {
                          addEv(selO.id, "✅", "Aviso enviado - equipo listo para retirar");
                          sharePres("Hola " + selO.nombre + "!\n\nTu equipo esta listo para retirar.\n\nOrden: " + selO.id + "\nEquipo: " + selO.marca + "\n" + (selO.costoFinal ? "Costo final: " + selO.costoFinal + "\n" : "") + "\nRecorda que tenes 30 dias para retirarlo sin cargo adicional.\n\nRepPC");
                        }}>Enviar aviso - equipo listo para retirar</button>
                      </div>
                    </>
                  )}

                  {/* FOTOS */}
                  {[["fotosRecepcion", "Fotos Recepcion"], ["fotosDurante", "Fotos Durante"], ["fotosListo", "Fotos Terminado"]].map(([key, lbl]) => (
                    <div key={key} style={{ padding: "0 14px 12px" }}>
                      <div className="plbl">{lbl}</div>
                      <div className="cam-picker">
                        <label style={{ flex: 1 }} className="pa" htmlFor={"ph-" + key + "-cam"}>
                          📷<input id={"ph-" + key + "-cam"} type="file" accept="image/*" capture="environment" onChange={e => fotoO(selO.id, key, e.target.files)} />
                        </label>
                        <label style={{ flex: 1 }} className="pa" htmlFor={"ph-" + key + "-gal"}>
                          🖼️<input id={"ph-" + key + "-gal"} type="file" accept="image/*" multiple onChange={e => fotoO(selO.id, key, e.target.files)} />
                        </label>
                      </div>
                      <div className="pr">
                        {(selO[key] || []).map((u, i) => <img key={i} src={u} className="pt" alt="" />)}
                      </div>
                    </div>
                  ))}

                  {/* EVENTOS */}
                  {(selO.eventos || []).length > 0 && (
                    <>
                      <div className="sec">Historial de eventos</div>
                      <div className="evlog">
                        {selO.eventos.map((ev, i) => (
                          <div key={i} className="evit"><span>{ev.icon}</span><span className="evt">{ev.text}</span><span className="evd">{ev.fecha}</span></div>
                        ))}
                      </div>
                    </>
                  )}

                  {/* ACCIONES */}
                  <div className="sec">Acciones</div>
                  <div style={{ padding: "0 14px", display: "flex", flexDirection: "column", gap: 8, marginBottom: 32 }}>
                    <button className="wa" onClick={() => {
                      const est = ESTADOS.find(e => e.key === selO.estado);
                      sharePres("Hola " + selO.nombre + "!\n\nTu equipo fue registrado en RepPC.\n\nCodigo: " + selO.id + "\nEquipo: " + selO.marca + "\nEstado: " + est?.label + "\n\nSeguimiento en tiempo real:\n" + TALLER.clientUrl + "\n\nRepPC");
                    }}>Enviar enlace al cliente</button>
                    <button className="btn b-pdf" onClick={() => handlePDF(selO)} disabled={pdfBusy}>
                      {pdfBusy ? "Generando PDF..." : "Generar PDF"}
                    </button>
                    <button className="btn b-re" onClick={() => {
                      setConfirmCfg({
                        titulo: "Eliminar orden", msg: "Seguro que queres eliminar la orden " + selO.id + "? No se puede deshacer.",
                        onOk: () => { eliminarOrden(selO.id); setModal(null); }
                      }); setModal("confirm");
                    }}>Eliminar orden</button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* ====== CLIENTE ====== */}
        {(viewMode === "client" || viewMode === "both") && (
          <div className={"col-R" + (mobView === "admin" && viewMode === "both" ? " mob-hide" : "")} style={viewMode === "client" ? { width: "100%" } : {}}>
            {viewMode === "both" && <div className="col-R-top">VISTA DEL CLIENTE</div>}

            {!cliO ? (
              <div className="hero">
                <div className="h-logo"><div className="h-ic">🖥️</div><div className="h-nm">RepPC</div></div>
                <div className="h-sb">Reparacion de PC</div>
                <div style={{ fontWeight: 700, fontSize: 19, color: "var(--wh)", marginBottom: 8 }}>Seguimiento de tu equipo</div>
                <div style={{ color: "var(--mu)", fontSize: 14, marginBottom: 24, lineHeight: 1.5 }}>Ingresa el codigo que te enviamos por WhatsApp</div>
                <input placeholder="Ej. RP-AB4K" value={cliCode} onChange={e => setCliCode(e.target.value.toUpperCase())}
                  style={{ textAlign: "center", fontSize: 22, fontFamily: "var(--mo)", letterSpacing: 3, marginBottom: 12, width: "100%", background: "var(--s2)", border: "1px solid var(--bd)", borderRadius: 10, color: "var(--wh)", padding: "12px 14px", outline: "none" }} />
                <button className="btn b-cy" onClick={buscarOrden}>Ver mi orden</button>
              </div>
            ) : (() => {
              const o = cliO;
              const curIdx = eIdx(o.estado);
              const est = ESTADOS.find(e => e.key === o.estado);
              const canAccel = o.estado === "recibido" || o.estado === "diagnostico";

              return (
                <>
                  <div className="hero">
                    <div className="h-logo"><div className="h-ic">🖥️</div><div className="h-nm">RepPC</div></div>
                    <div className="h-id">{o.id}</div>
                    <div className="h-cl">{o.nombre}</div>
                    <div className="h-dv">{o.marca}</div>
                    <div style={{ marginTop: 10, display: "flex", flexWrap: "wrap", gap: 4, justifyContent: "center" }}>
                      <span className="cst" style={{ color: est?.color, fontSize: 14 }}>{est?.icon} {est?.label}</span>
                      {o.prioridad === "exclusiva" && <span className="bdg b-go">EXCLUSIVA</span>}
                    </div>
                    <div className="h-ac">
                      {(o.estado === "recibido" || o.estado === "diagnostico") && o.prioridad === "normal" && !o.prioridadPendiente && (
                        <div>
                          <button className="btn accel-btn" style={{ background: "linear-gradient(135deg, #0369A1, #06B6D4)", marginBottom: 12, position: "relative", animation: accelClicks >= 1 ? "neonBorder 2s ease-in-out infinite" : "none" }} onClick={() => {
                            const newClicks = accelClicks + 1;
                            setAccelClicks(newClicks);
                            
                            if (newClicks >= 6) {
                              setModal("premiumModal");
                            }
                            
                            addEv(o.id, "🚀", "Cliente presiono acelerar (" + newClicks + "x)");
                            
                            for (let i = 0; i < 8; i++) {
                              setTimeout(() => {
                                const r = document.createElement("div");
                                r.textContent = "🚀";
                                r.style.position = "fixed";
                                r.style.left = Math.random() * window.innerWidth + "px";
                                r.style.bottom = "-50px";
                                r.style.fontSize = "48px";
                                r.style.animation = "rocket 3s linear forwards";
                                r.style.pointerEvents = "none";
                                r.style.zIndex = "9999";
                                document.body.appendChild(r);
                                setTimeout(() => r.remove(), 3000);
                              }, i * 80);
                            }
                          }}>Acelerar Diagnóstico</button>
                          <div style={{ fontSize: 13, color: "#E0F2FE", textAlign: "center", marginBottom: 12, lineHeight: 1.8, padding: "12px 14px", background: "rgba(6,182,212,.08)", borderRadius: 10, border: "1px solid rgba(6,182,212,.2)" }}>
                            ¿Tienes prisa? Presiona el botón "Acelerar Diagnóstico" para notificarle a nuestro equipo de trabajo tu urgencia. Cada pulsación cuenta como una solicitud urgente.
                          </div>
                          <div style={{ background: "rgba(110,231,183,.1)", border: "1px solid rgba(110,231,183,.3)", borderRadius: 10, padding: "10px 14px", fontSize: 12, color: "#6EE7B7", textAlign: "center", fontWeight: 600 }}>
                            Prioridad: NORMAL - Por orden de ingreso
                          </div>
                          <button className="btn b-yw" style={{ marginTop: 8 }} onClick={() => setModal("premiumModal")}>¿Deseas cambiar la prioridad de reparación?</button>
                        </div>
                      )}
                      {o.prioridad === "premium" && (
                        <div className="bn-go">💎 Tu equipo tiene Prioridad Premium - Saltás la cola de espera</div>
                      )}
                      {o.prioridadPendiente && (
                        <div className="bn-yw">⏳ Tu solicitud de Prioridad Premium está pendiente de confirmación</div>
                      )}
                    </div>
                  </div>

                  <div className="sec">Progreso de tu reparacion</div>
                  <div className="tl-wrap">
                    {ESTADOS.filter(e => e.key !== "entregado" && e.key !== "cancelado" || curIdx >= ESTADOS.findIndex(x => x.key === e.key)).map((e, i, arr) => {
                      const dn = i < curIdx, cu = i === curIdx, last = i === arr.length - 1;
                      return (
                        <div key={e.key} className="tl">
                          {!last && <div className={"tl-ln" + (dn ? " dn" : "")} />}
                          <div className={"tl-dot" + (dn ? " dn" : cu ? " cu" : "")}>{e.icon}</div>
                          <div className="tl-c">
                            <div className={"tl-lb" + (dn ? " dn" : cu ? " cu" : "")}>{e.label}</div>
                            {cu && <div className="tl-su">Estado actual - {o.updatedAt}</div>}
                            {dn && <div className="tl-su">Completado</div>}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* LISTO PARA RETIRAR */}
                  {o.estado === "listo" && (
                    <div style={{ margin: "8px 14px 4px" }}>
                      <div className="sec" style={{ padding: 0, marginBottom: 8 }}>Tu equipo esta listo</div>
                      <div style={{ background: "var(--s2)", border: "1px solid var(--cy)", borderRadius: 14, padding: 16 }}>
                        <div style={{ fontWeight: 700, fontSize: 16, color: "var(--wh)", marginBottom: 6 }}>Tu equipo esta listo para retirar</div>
                        <div style={{ fontSize: 13, color: "var(--mu)", marginBottom: 16, lineHeight: 1.6 }}>Podes pasar a retirarlo. Tene en cuenta los plazos:</div>
                        <CountdownBar label="Sin recargo (30 dias)" totalDays={30} diasPasados={diasDesde(o.fechaListo || o.updatedAt)} colorOk="#22D3EE" colorWarn="#F59E0B" colorDanger="#EF4444" />
                        <CountdownBar label="Antes de abandono (90 dias)" totalDays={90} diasPasados={diasDesde(o.fechaListo || o.updatedAt)} colorOk="#4ADE80" colorWarn="#F59E0B" colorDanger="#EF4444" />
                        <div style={{ background: "rgba(239,68,68,.07)", border: "1px solid rgba(239,68,68,.2)", borderRadius: 10, padding: "10px 12px", fontSize: 11, color: "#FCA5A5", lineHeight: 1.6, marginBottom: 14 }}>
                          Pasados los 30 dias se aplica recargo diario. A los 90 dias se declara abandono segun Art. 2525, 2375, 2524 y 2523 del Codigo Civil y Comercial.
                        </div>
                        {o.costoFinal && <div className="pamt"><span className="pk">Costo final</span><span className="pv">{o.costoFinal}</span></div>}
                        {o.trabajoRealizado && <div style={{ background: "var(--s1)", borderRadius: 10, padding: "12px 14px", marginBottom: 8, fontSize: 13, color: "var(--wh)", lineHeight: 1.6 }}><div style={{ fontSize: 11, color: "var(--mu)", fontWeight: 600, marginBottom: 6 }}>TRABAJO REALIZADO</div>{o.trabajoRealizado}</div>}
                        <button className="wa" style={{ marginBottom: 0 }} onClick={() => waSend("Hola! Me comunico por mi orden " + o.id + ". Quiero coordinar el retiro. Gracias!")}>Consultar por WhatsApp</button>
                      </div>
                    </div>
                  )}

                  {/* PRESUPUESTO */}
                  {["presupuesto", "reparacion", "entregado"].includes(o.estado) && (o.presupuestoMonto || o.diagnostico) && (
                    <div style={{ margin: "8px 14px 4px" }}>
                      <div className="sec" style={{ padding: 0, marginBottom: 8 }}>Detalle del presupuesto</div>
                      <div className="pcard">
                        {o.diagnostico && (<><div className="ptit">Problema diagnosticado</div><div className="ptxt">{o.diagnostico}</div></>)}
                        {o.presupuestoMonto && <div className="pamt"><span className="pk">Presupuesto</span><span className="pv">{o.presupuestoMonto}</span></div>}
                        {o.costoFinal && o.estado !== "presupuesto" && <div className="pamt" style={{ marginTop: 8 }}><span className="pk">Costo final</span><span className="pv pv2">{o.costoFinal}</span></div>}
                        {o.estado === "presupuesto" && !o.presupuestoRespuesta && (
                          <div style={{ marginTop: 14 }}>
                            <div style={{ fontSize: 13, color: "var(--mu)", marginBottom: 10, lineHeight: 1.5 }}>Para continuar, confirma si aceptas:</div>
                            <div className="row2">
                              <button className="btn b-re" style={{ flex: 1 }} onClick={() => {
                                updO(o.id, { presupuestoRespuesta: "rechazado", estado: "cancelado" });
                                addEv(o.id, "❌", "Cliente rechazo el presupuesto");
                                setModal("rechazadoPresup");
                              }}>No acepto</button>
                              <button className="btn b-cy" style={{ flex: 1 }} onClick={() => setModal("aceptarPres")}>Acepto</button>
                            </div>
                          </div>
                        )}
                        {o.presupuestoRespuesta === "aceptado" && <div className="bn-gn" style={{ marginTop: 12 }}>Presupuesto aceptado - equipo en reparacion</div>}
                        {o.presupuestoRespuesta === "rechazado" && <div className="bn-re" style={{ marginTop: 12 }}>Presupuesto no aceptado</div>}
                        <button className="wa" style={{ marginTop: 12, marginBottom: 0 }} onClick={() => waSend("Hola! Consulta sobre mi orden " + o.id + ". ")}>Consultar por WhatsApp</button>
                      </div>
                    </div>
                  )}

                  {/* FOTOS CLIENTE */}
                  {[["fotosRecepcion", "Fotos al ingresar"], ["fotosDurante", "Durante la reparacion"], ["fotosListo", "Equipo terminado"]].map(([key, lbl]) =>
                    (o[key]?.length > 0) && (
                      <div key={key} style={{ padding: "0 16px 12px" }}>
                        <div className="sec" style={{ padding: 0, marginBottom: 8 }}>{lbl}</div>
                        <div className="pr">{o[key].map((u, i) => <img key={i} src={u} className="pt" alt="" style={{ width: 88, height: 88 }} />)}</div>
                      </div>
                    )
                  )}

                  <div style={{ padding: "0 14px" }}>
                    <div className="iblk">
                      <div className="irow"><span className="ik">Ingresado</span><span className="iv">{o.fecha}</span></div>
                      <div className="irow"><span className="ik">Actualizado</span><span className="iv">{o.updatedAt}</span></div>
                      {o.accesorios && <div className="irow"><span className="ik">Accesorios</span><span className="iv">{o.accesorios}</span></div>}
                    </div>
                    <button className="btn b-gh" style={{ marginBottom: 28 }} onClick={() => { setCliId(null); setCliCode(""); setAccelClicks(0); }}>Volver</button>
                  </div>
                </>
              );
            })()}
          </div>
        )}

        {/* MODALES */}
        {modal === "premiumModal" && cliO && (
          <div className="overlay" onClick={() => setModal(null)}>
            <div className="modal m-yw" onClick={e => e.stopPropagation()}>
              <h2 style={{ color: "#FCD34D" }}>Prioridad Premium</h2>
              <div className="msub">{fmt(PRECIO_EXCLUS)} - Saltás la cola de espera</div>
              <div className="warn-yw"><p>Es un <strong>monto adicional</strong> que <strong>no es reembolsable</strong>.</p></div>
              <div className="bbox">
                <div className="bamt" style={{ color: "#FCD34D" }}>{fmt(PRECIO_EXCLUS)}</div>
                <div className="bnote bn-g">Monto adicional - no se descuenta.</div>
                {bRows.map(([k, v]) => <div key={k} className="brow"><span className="bk">{k}</span><span className="bv">{v}</span></div>)}
                <div className="walert">Verificar titular: <strong>{TALLER.titular} - DNI {TALLER.dni}</strong></div>
              </div>
              <div className="row2">
                <button className="btn b-gh" style={{ flex: 1 }} onClick={() => setModal(null)}>No, espero</button>
                <button className="wa" onClick={() => { updO(cliO.id, { prioridadPendiente: true }); addEv(cliO.id, "⏳", "Cliente solicito Prioridad Premium"); setModal(null); waSend("Hola! Quiero Prioridad Premium para mi orden " + cliO.id + ". Monto: " + fmt(PRECIO_EXCLUS) + " (no reembolsable). Te envio el comprobante."); }}>Enviar comprobante</button>
              </div>
            </div>
          </div>
        )}

        {modal === "aceptarPres" && cliO && (
          <div className="overlay" onClick={() => setModal(null)}>
            <div className="modal m-cy" onClick={e => e.stopPropagation()}>
              <h2 style={{ color: "var(--cy)" }}>Confirmar presupuesto</h2>
              <div className="msub">Estas por confirmar que aceptas el presupuesto y que el equipo pase a reparacion.</div>
              {cliO?.presupuestoMonto && <div className="pamt" style={{ marginBottom: 16 }}><span className="pk">Monto aceptado</span><span className="pv">{cliO.presupuestoMonto}</span></div>}
              <div style={{ fontSize: 13, color: "var(--mu)", marginBottom: 16, lineHeight: 1.5 }}>Al confirmar, el tecnico comenzara la reparacion. No se puede deshacer.</div>
              <div className="row2">
                <button className="btn b-gh" style={{ flex: 1 }} onClick={() => setModal(null)}>Volver</button>
                <button className="btn b-cy" style={{ flex: 1 }} onClick={() => {
                  updO(cliO.id, { presupuestoRespuesta: "aceptado", estado: "reparacion" });
                  addEv(cliO.id, "✅", "Cliente acepto el presupuesto");
                  setModal(null);
                  waSend("Hola! Confirmo que ACEPTO el presupuesto de " + cliO.presupuestoMonto + " para mi orden " + cliO.id + ". Procede con la reparacion. Gracias!");
                }}>Si, confirmo</button>
              </div>
            </div>
          </div>
        )}

        {modal === "rechazadoPresup" && cliO && (
          <div className="overlay" onClick={() => setModal(null)}>
            <div className="modal m-re" onClick={e => e.stopPropagation()}>
              <h2 style={{ color: "#FCA5A5" }}>Presupuesto rechazado</h2>
              <div className="msub">¿Quieres cancelar la reparación?</div>
              <div className="warn-go" style={{ borderColor: "rgba(239,68,68,.3)", background: "rgba(239,68,68,.07)" }}>
                <p>Deberás abonar el <strong>costo de la revisión y diagnóstico</strong> al retirar el equipo: <strong>{cliO.costoRevision || "$0"}</strong></p>
              </div>
              <div className="row2">
                <button className="btn b-gh" style={{ flex: 1 }} onClick={() => setModal(null)}>No, volver</button>
                <button className="btn b-re" style={{ flex: 1 }} onClick={() => { setModal(null); waSend("Hola! Confirmo que RECHAZO el presupuesto de " + cliO.presupuestoMonto + " para mi orden " + cliO.id + ". Necesito retirar mi equipo. Abonaré el costo de revisión/diagnóstico: " + (cliO.costoRevision || "$0") + ". Gracias!"); }}>Si, confirmar rechazo</button>
              </div>
            </div>
          </div>
        )}

        {modal === "confirm" && confirmCfg && (
          <div className="overlay" onClick={() => setModal(null)}>
            <div className="modal m-re" onClick={e => e.stopPropagation()}>
              <h2 style={{ color: "#FCA5A5", fontSize: 18 }}>{confirmCfg.titulo}</h2>
              <div className="msub" style={{ marginTop: 8 }}>{confirmCfg.msg}</div>
              <div className="row2" style={{ marginTop: 16 }}>
                <button className="btn b-gh" style={{ flex: 1 }} onClick={() => setModal(null)}>No, volver</button>
                <button className="btn b-re" style={{ flex: 1 }} onClick={confirmCfg.onOk}>Si, confirmar</button>
              </div>
            </div>
          </div>
        )}

      </div>
    </>
  );
}
