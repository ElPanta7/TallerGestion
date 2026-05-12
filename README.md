# RepPC - Aplicación Completa con Rutas Separadas

## 🚀 DESCRIPCIÓN

Aplicación web completa para gestión de taller de reparación de PC con:
- Panel de administración (con login)
- Vista del cliente (pública)
- Base de datos Firebase en tiempo real
- Rutas separadas para cada vista

---

## 🔐 CREDENCIALES DE ADMINISTRADOR

**Usuario:** Martino  
**Contraseña:** TallerNFS

---

## 📱 RUTAS DE LA APLICACIÓN

### `/` (Raíz)
- Redirige automáticamente a `/cliente`

### `/login`
- Pantalla de login para administrador
- Requiere usuario y contraseña

### `/admin`
- Panel completo de administración
- Requiere login previo
- Incluye:
  - Crear nuevas órdenes
  - Confirmar pagos (diagnóstico acelerado y prioridad exclusiva)
  - Cambiar estados
  - Enviar presupuestos
  - Generar PDFs
  - Subir fotos
  - Ver historial de eventos

### `/cliente`
- Vista pública para clientes
- Solo requiere código de orden (ej: RP-AB4K)
- Incluye:
  - Timeline de progreso
  - Ver presupuesto
  - Aceptar/rechazar presupuesto
  - Pagar servicios adicionales
  - Contadores para retiro
  - Consultar por WhatsApp

---

## 🌐 CÓMO SUBIR A VERCEL

### PASO 1: Preparar el proyecto
1. Descomprimí este archivo ZIP
2. Tenés que tener la carpeta `reppc-deploy-final`

### PASO 2: Crear cuenta en Vercel
1. Andá a https://vercel.com
2. Click en "Sign Up"
3. Elegí "Continue with GitHub" (recomendado)

### PASO 3: Subir el proyecto

**OPCIÓN A: Arrastrando carpeta**
1. En Vercel, click en "Add New..." → "Project"
2. Click en "Browse" o arrastrá la carpeta `reppc-deploy-final`
3. Vercel detecta automáticamente que es Vite + React
4. Click en "Deploy"
5. Esperá 2-3 minutos

**OPCIÓN B: Vía GitHub (más profesional)**
1. Subí el contenido de `reppc-deploy-final` a un repo de GitHub
2. En Vercel, click en "Import Project"
3. Conectá el repo
4. Deploy automático

### PASO 4: URLs resultantes
Una vez deployado, Vercel te da una URL base:
```
https://reppc-xxxxx.vercel.app
```

Las rutas quedan así:
- `https://reppc-xxxxx.vercel.app/` → Redirige a cliente
- `https://reppc-xxxxx.vercel.app/login` → Login admin
- `https://reppc-xxxxx.vercel.app/admin` → Panel admin (requiere login)
- `https://reppc-xxxxx.vercel.app/cliente` → Vista cliente

---

## 📋 CÓMO COMPARTIR CON CLIENTES

### URL para clientes:
```
https://reppc-xxxxx.vercel.app/cliente
```

### URL para vos (admin):
```
https://reppc-xxxxx.vercel.app/admin
```
*(Guardala en favoritos)*

---

## 🔥 FIREBASE YA ESTÁ CONFIGURADO

✅ Base de datos Firestore conectada  
✅ Sincronización en tiempo real  
✅ Los cambios en admin se ven instantáneamente en cliente  
✅ Datos persisten entre sesiones  

---

## 🛠️ SI QUERÉS DESARROLLAR LOCALMENTE

1. Instalá Node.js (https://nodejs.org)
2. Abrí terminal en la carpeta del proyecto
3. Ejecutá:
```bash
npm install
npm run dev
```
4. Abrí http://localhost:5173

---

## ✨ FUNCIONALIDADES COMPLETAS

### Panel Admin:
- ✅ Lista de órdenes (activos/entregados)
- ✅ Crear nueva orden con fotos
- ✅ Confirmar diagnóstico acelerado ($25.000)
- ✅ Confirmar prioridad exclusiva ($50.000 o $25.000 con descuento)
- ✅ Cancelar pagos con confirmación
- ✅ Cambiar estados (6 estados)
- ✅ Cargar diagnóstico y presupuesto
- ✅ Enviar presupuesto con selector de contactos
- ✅ Subir fotos por etapa
- ✅ Generar PDF profesional
- ✅ Historial de eventos
- ✅ Búsqueda de órdenes

### Vista Cliente:
- ✅ Buscar orden por código
- ✅ Timeline visual de progreso
- ✅ Ver estado actual
- ✅ Ver presupuesto
- ✅ Aceptar/rechazar presupuesto desde la app
- ✅ Solicitar diagnóstico acelerado
- ✅ Solicitar prioridad exclusiva
- ✅ Ver descuento 50% si ya pagó aceleración
- ✅ Banners de confirmación pendiente
- ✅ Contadores regresivos (30 y 90 días) cuando está listo
- ✅ Aviso legal automático
- ✅ Consultar por WhatsApp

---

## 🔄 CÓMO ACTUALIZAR LA APP

### Si conectaste con GitHub:
1. Modificás el código localmente
2. Hacés commit y push a GitHub
3. Vercel redeploya automáticamente

### Si subiste manual:
1. Modificás el código
2. Volvés a arrastrar la carpeta a Vercel
3. Se actualiza automáticamente

---

## 📞 SOPORTE

Si tenés problemas:
1. Verificá que Firebase Firestore esté habilitado
2. Revisá las reglas de Firestore:
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /orders/{orderId} {
      allow read, write: if true;
    }
  }
}
```
3. Probá en modo incógnito
4. Revisá la consola del navegador (F12)

---

## 📱 FUNCIONA EN:
- ✅ PC (Chrome, Firefox, Edge, Safari)
- ✅ Celular (Android, iOS)
- ✅ Tablet

---

**Desarrollado para RepPC - Martino Bernardi**  
**DNI: 43.234.717**  
**Alias: MARTINOBERNARDIPC**  
**WhatsApp: +54 9 3406 426202**
