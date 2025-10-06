# 🚀 Multi-Functional Multi-Threaded Online Chat Platform

Una plataforma de chat moderna y completa construida con tecnologías de vanguardia, diseñada para soportar múltiples usuarios concurrentes con funcionalidades avanzadas de colaboración en tiempo real.

## ✨ Características Principales

### 💬 Mensajería Instantánea
- **Chat Privado**: Mensajería uno a uno entre usuarios
- **Chat Grupal**: Mensajería en tiempo real dentro de grupos
- **Historial de Mensajes**: Almacenamiento persistente de conversaciones
- **Reacciones**: Sistema de emojis para mensajes
- **Indicadores de Escritura**: Notificación cuando alguien está escribiendo

### 📁 Transferencia de Archivos
- **Subida de Archivos**: Carga de archivos con barra de progreso
- **Descarga de Archivos**: Descarga segura desde el servidor
- **Compartir en Chat**: Archivos compartidos directamente en grupos
- **Tipos de Archivo**: Soporte para imágenes, PDFs, documentos Word, etc.

### ✏️ Edición Colaborativa
- **Edición Simultánea**: Múltiples usuarios editando el mismo documento
- **Control de Versiones**: Gestión automática de versiones y resolución de conflictos
- **Historial de Cambios**: Seguimiento completo de modificaciones
- **Comparación de Versiones**: Diferencias entre versiones
- **Restauración**: Rollback a versiones anteriores

### 👥 Gestión de Usuarios y Permisos
- **Registro y Login**: Autenticación segura con JWT
- **Roles Basados en Permisos**: Usuario Regular, Administrador, Propietario de Grupo
- **Gestión de Grupos**: Crear, eliminar, unirse y salir de grupos
- **Moderación**: Silenciar usuarios, expulsar miembros, banear usuarios
- **Configuración de Grupos**: Límites de miembros, permisos de archivos, etc.

## 🛠️ Stack Tecnológico

### Backend
- **Node.js 18+** - Runtime de JavaScript
- **TypeScript** - Tipado estático para mayor robustez
- **Express.js** - Framework web minimalista
- **Socket.io** - Comunicación en tiempo real
- **Prisma** - ORM moderno y type-safe
- **PostgreSQL** - Base de datos relacional robusta
- **JWT** - Autenticación basada en tokens
- **bcryptjs** - Encriptación de contraseñas
- **Multer** - Manejo de carga de archivos

### Frontend
- **React 18** - Biblioteca de UI moderna
- **TypeScript** - Tipado estático
- **Vite** - Build tool ultra rápido
- **Tailwind CSS** - Framework CSS utility-first
- **TanStack Query** - Gestión de estado del servidor
- **Socket.io Client** - Cliente para tiempo real
- **React Router** - Enrutamiento del lado del cliente

### Base de Datos
- **PostgreSQL** - Base de datos principal
- **Prisma Schema** - Modelado de datos type-safe

## 🚀 Instalación y Configuración

### Prerrequisitos
- Node.js 18+ 
- PostgreSQL 13+
- npm o yarn

### 1. Clonar el Repositorio
```bash
git clone <repository-url>
cd Chatv2
```

### 2. Configurar Backend

```bash
cd backend

# Instalar dependencias
npm install

# Configurar variables de entorno
cp env.example .env
# Editar .env con tus configuraciones

# Configurar base de datos
npx prisma generate
npx prisma db push

# Iniciar servidor de desarrollo
npm run dev
```

### 3. Configurar Frontend

```bash
cd frontend

# Instalar dependencias
npm install

# Iniciar servidor de desarrollo
npm run dev
```

### 4. Variables de Entorno

#### Backend (.env)
```env
NODE_ENV=development
PORT=3001
HOST=localhost

# Database
DATABASE_URL="postgresql://username:password@localhost:5432/chat_platform?schema=public"

# JWT
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRES_IN=7d
JWT_REFRESH_SECRET=your-super-secret-refresh-key
JWT_REFRESH_EXPIRES_IN=30d

# Redis (opcional)
REDIS_URL=redis://localhost:6379

# File Upload
MAX_FILE_SIZE=10485760
UPLOAD_PATH=./uploads
ALLOWED_FILE_TYPES=image/jpeg,image/png,image/gif,application/pdf,text/plain

# CORS
CORS_ORIGIN=http://localhost:3000
```

## 📊 Estructura del Proyecto

```
Chatv2/
├── backend/
│   ├── src/
│   │   ├── controllers/     # Controladores de rutas
│   │   ├── services/        # Lógica de negocio
│   │   ├── middleware/      # Middleware personalizado
│   │   ├── routes/          # Definición de rutas
│   │   ├── socket/          # Manejo de Socket.io
│   │   ├── utils/           # Utilidades
│   │   ├── types/           # Tipos TypeScript
│   │   └── config/          # Configuración
│   ├── prisma/
│   │   └── schema.prisma    # Esquema de base de datos
│   └── uploads/             # Archivos subidos
├── frontend/
│   ├── src/
│   │   ├── components/      # Componentes React
│   │   ├── pages/           # Páginas principales
│   │   ├── contexts/        # Contextos React
│   │   ├── services/        # Servicios API
│   │   ├── types/           # Tipos TypeScript
│   │   └── utils/           # Utilidades
│   └── public/              # Archivos estáticos
└── README.md
```

## 🔧 Scripts Disponibles

### Backend
```bash
npm run dev          # Servidor de desarrollo
npm run build        # Compilar TypeScript
npm run start        # Servidor de producción
npm run db:generate   # Generar cliente Prisma
npm run db:push       # Sincronizar esquema con DB
npm run db:migrate    # Ejecutar migraciones
npm run db:studio     # Abrir Prisma Studio
```

### Frontend
```bash
npm run dev          # Servidor de desarrollo
npm run build        # Build de producción
npm run preview      # Preview del build
npm run lint         # Linter
```

## 🌐 API Endpoints

### Autenticación
- `POST /api/auth/register` - Registro de usuario
- `POST /api/auth/login` - Inicio de sesión
- `POST /api/auth/logout` - Cerrar sesión
- `POST /api/auth/refresh` - Renovar token
- `GET /api/auth/me` - Usuario actual

### Usuarios
- `GET /api/users` - Listar usuarios (admin)
- `GET /api/users/:id` - Obtener usuario
- `PUT /api/users/:id` - Actualizar usuario
- `GET /api/users/online/list` - Usuarios en línea
- `GET /api/users/search/:query` - Buscar usuarios

### Grupos
- `POST /api/groups` - Crear grupo
- `GET /api/groups` - Listar grupos
- `GET /api/groups/:id` - Obtener grupo
- `PUT /api/groups/:id` - Actualizar grupo
- `DELETE /api/groups/:id` - Eliminar grupo
- `POST /api/groups/:id/join` - Unirse a grupo
- `POST /api/groups/:id/leave` - Salir de grupo

### Mensajes
- `POST /api/messages/group/:groupId` - Enviar mensaje grupal
- `POST /api/messages/private` - Enviar mensaje privado
- `GET /api/messages/group/:groupId` - Mensajes del grupo
- `GET /api/messages/private/:userId` - Mensajes privados
- `PUT /api/messages/:id` - Editar mensaje
- `DELETE /api/messages/:id` - Eliminar mensaje

### Archivos
- `POST /api/files/upload` - Subir archivo
- `GET /api/files/:id` - Obtener archivo
- `GET /api/files/:id/download` - Descargar archivo
- `GET /api/files/group/:groupId` - Archivos del grupo
- `DELETE /api/files/:id` - Eliminar archivo

### Documentos
- `POST /api/documents` - Crear documento
- `GET /api/documents/:id` - Obtener documento
- `PUT /api/documents/:id` - Actualizar documento
- `GET /api/documents/:id/history` - Historial del documento
- `POST /api/documents/:id/restore/:version` - Restaurar versión

## 🔌 Eventos Socket.io

### Conexión
- `connect` - Usuario conectado
- `disconnect` - Usuario desconectado

### Grupos
- `join-group` - Unirse a grupo
- `leave-group` - Salir de grupo
- `user-joined-group` - Usuario se unió
- `user-left-group` - Usuario salió

### Mensajes
- `send-group-message` - Enviar mensaje grupal
- `send-private-message` - Enviar mensaje privado
- `group-message` - Mensaje grupal recibido
- `private-message-received` - Mensaje privado recibido

### Escritura
- `typing-start` - Usuario empezó a escribir
- `typing-stop` - Usuario dejó de escribir
- `user-typing` - Notificación de escritura

### Documentos
- `join-document` - Unirse a documento
- `document-edit` - Editar documento
- `document-updated` - Documento actualizado

## 🔒 Seguridad

- **Autenticación JWT**: Tokens seguros con expiración
- **Encriptación de Contraseñas**: bcrypt con salt rounds
- **Validación de Entrada**: Express-validator
- **Rate Limiting**: Protección contra ataques
- **CORS**: Configuración segura de orígenes
- **Helmet**: Headers de seguridad
- **Sanitización**: Limpieza de datos de entrada

## 🚀 Despliegue

### Docker (Recomendado)
```bash
# Construir imágenes
docker-compose build

# Ejecutar servicios
docker-compose up -d
```

### Manual
```bash
# Backend
cd backend
npm run build
npm start

# Frontend
cd frontend
npm run build
# Servir archivos estáticos con nginx/apache
```

## 🤝 Contribución

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📝 Licencia

Este proyecto está bajo la Licencia MIT. Ver `LICENSE` para más detalles.

## 🆘 Soporte

Si tienes preguntas o necesitas ayuda:

1. Revisa la documentación
2. Busca en los issues existentes
3. Crea un nuevo issue con detalles del problema

## 🎯 Roadmap

- [ ] Notificaciones push
- [ ] Videollamadas integradas
- [ ] Bots y comandos personalizados
- [ ] Temas y personalización de UI
- [ ] Integración con servicios externos
- [ ] Aplicación móvil
- [ ] Análisis y métricas avanzadas

---

**¡Disfruta construyendo tu plataforma de chat! 🚀**
