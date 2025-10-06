# 🚀 Guía de Despliegue: Render + Netlify

## 📋 Resumen del Despliegue

- **Backend**: Render (Node.js)
- **Frontend**: Netlify (React)
- **Base de Datos**: MongoDB Atlas (ya configurada)

---

## 🔧 Preparación del Backend para Render

### 1. Crear archivo de configuración para Render

Crea el archivo `render.yaml` en la raíz del proyecto:

```yaml
services:
  - type: web
    name: chat-platform-backend
    env: node
    plan: free
    buildCommand: npm install
    startCommand: npm run start:prod
    envVars:
      - key: NODE_ENV
        value: production
      - key: PORT
        value: 10000
      - key: MONGODB_URI
        fromDatabase:
          name: mongodb-atlas
          property: connectionString
      - key: JWT_SECRET
        generateValue: true
      - key: CORS_ORIGIN
        value: https://your-netlify-app.netlify.app
```

### 2. Actualizar package.json del backend

Agrega el script de producción:

```json
{
  "scripts": {
    "start:prod": "node dist/index-simple.js",
    "build": "tsc",
    "dev": "ts-node src/index-simple.ts"
  }
}
```

### 3. Configurar variables de entorno

Crea un archivo `.env.production`:

```env
NODE_ENV=production
PORT=10000
MONGODB_URI=tu_mongodb_uri_aqui
JWT_SECRET=tu_jwt_secret_super_seguro
CORS_ORIGIN=https://tu-app.netlify.app
```

---

## 🌐 Despliegue en Render

### Paso 1: Crear cuenta en Render
1. Ve a [render.com](https://render.com)
2. Regístrate con GitHub
3. Conecta tu repositorio

### Paso 2: Crear servicio web
1. Click en "New +" → "Web Service"
2. Conecta tu repositorio GitHub
3. Configuración:
   - **Name**: `chat-platform-backend`
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm run start:prod`
   - **Plan**: Free

### Paso 3: Variables de entorno
En Render Dashboard → Environment:
```
NODE_ENV=production
PORT=10000
MONGODB_URI=tu_mongodb_uri
JWT_SECRET=tu_jwt_secret
CORS_ORIGIN=https://tu-app.netlify.app
```

### Paso 4: Desplegar
1. Click "Create Web Service"
2. Render construirá y desplegará automáticamente
3. Obtendrás una URL como: `https://chat-platform-backend.onrender.com`

---

## 🎨 Despliegue en Netlify

### Paso 1: Preparar el frontend

Crea un archivo `netlify.toml` en la raíz del proyecto:

```toml
[build]
  base = "frontend"
  publish = "dist"
  command = "npm run build"

[build.environment]
  NODE_VERSION = "18"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200

[[headers]]
  for = "/static/*"
  [headers.values]
    Cache-Control = "public, max-age=31536000"
```

### Paso 2: Actualizar configuración del frontend

En `frontend/src/config/api.ts`:

```typescript
const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? 'https://tu-backend.onrender.com' 
  : 'http://localhost:3003';

export { API_BASE_URL };
```

### Paso 3: Crear cuenta en Netlify
1. Ve a [netlify.com](https://netlify.com)
2. Regístrate con GitHub
3. Conecta tu repositorio

### Paso 4: Configurar build
1. Click "New site from Git"
2. Selecciona tu repositorio
3. Configuración:
   - **Base directory**: `frontend`
   - **Build command**: `npm run build`
   - **Publish directory**: `dist`

### Paso 5: Variables de entorno
En Netlify Dashboard → Site settings → Environment variables:
```
NODE_ENV=production
VITE_API_URL=https://tu-backend.onrender.com
```

### Paso 6: Desplegar
1. Click "Deploy site"
2. Netlify construirá y desplegará automáticamente
3. Obtendrás una URL como: `https://tu-app.netlify.app`

---

## 🔗 Configuración Final

### 1. Actualizar CORS en el backend

En `backend/src/index-simple.ts`:

```typescript
const corsOptions = {
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true
};
```

### 2. Actualizar URLs en el frontend

En `frontend/src/config/api.ts`:

```typescript
export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3003';
export const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3003';
```

### 3. Actualizar variables de entorno en Render

```
CORS_ORIGIN=https://tu-app.netlify.app
```

---

## 🧪 Testing del Despliegue

### 1. Verificar Backend
```bash
curl https://tu-backend.onrender.com/api/users
```

### 2. Verificar Frontend
- Ve a `https://tu-app.netlify.app`
- Intenta registrarte y hacer login
- Prueba enviar mensajes

### 3. Verificar WebSocket
- Abre la consola del navegador
- Deberías ver conexiones WebSocket exitosas

---

## 🚨 Troubleshooting

### Problemas Comunes

#### 1. CORS Error
```
Access to fetch at 'https://backend.onrender.com' from origin 'https://app.netlify.app' has been blocked by CORS policy
```

**Solución**: Verificar que `CORS_ORIGIN` en Render sea la URL correcta de Netlify.

#### 2. WebSocket Connection Failed
```
WebSocket connection to 'wss://backend.onrender.com/socket.io/' failed
```

**Solución**: Render soporta WebSocket, pero puede tardar en establecerse.

#### 3. Build Failed en Netlify
```
Build failed: npm run build
```

**Solución**: Verificar que todas las dependencias estén en `package.json`.

#### 4. Backend No Responde
```
GET https://backend.onrender.com/api/users 500 Internal Server Error
```

**Solución**: Verificar logs en Render Dashboard → Logs.

---

## 📊 Monitoreo

### Render Dashboard
- **Logs**: Ver logs en tiempo real
- **Metrics**: CPU, memoria, requests
- **Deployments**: Historial de despliegues

### Netlify Dashboard
- **Deploy logs**: Ver logs de build
- **Analytics**: Visitas y performance
- **Forms**: Si usas formularios

---

## 🔄 Actualizaciones

### Backend (Render)
1. Push cambios a GitHub
2. Render detecta cambios automáticamente
3. Rebuild y redeploy automático

### Frontend (Netlify)
1. Push cambios a GitHub
2. Netlify detecta cambios automáticamente
3. Rebuild y redeploy automático

---

## 💰 Costos

### Render (Free Plan)
- ✅ **Gratis**: 750 horas/mes
- ✅ **Sleep**: Se duerme después de 15 min de inactividad
- ✅ **Wake up**: 30 segundos para despertar

### Netlify (Free Plan)
- ✅ **Gratis**: 100GB bandwidth/mes
- ✅ **Builds**: 300 minutos/mes
- ✅ **Sites**: Ilimitados

### MongoDB Atlas
- ✅ **Gratis**: 512MB storage
- ✅ **Connections**: 100 conexiones

---

## 🎯 URLs Finales

Después del despliegue tendrás:

- **Frontend**: `https://tu-app.netlify.app`
- **Backend**: `https://tu-backend.onrender.com`
- **Base de Datos**: MongoDB Atlas (ya configurada)

---

## 🚀 ¡Listo para Producción!

Tu chat platform estará disponible 24/7 con:
- ✅ **HTTPS**: Seguridad automática
- ✅ **CDN**: Netlify CDN global
- ✅ **Escalabilidad**: Render + Netlify
- ✅ **Monitoreo**: Logs y métricas
- ✅ **Actualizaciones**: Deploy automático

**🎉 ¡Tu chat platform está listo para el mundo!**
