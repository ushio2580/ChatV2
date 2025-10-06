#!/bin/bash

echo "🚀 Chat Platform - MongoDB con Docker"
echo "====================================="
echo ""

# Check if Docker is installed
if command -v docker &> /dev/null; then
    echo "✅ Docker está instalado"
else
    echo "❌ Docker no está instalado"
    echo "📋 Para instalar Docker ejecuta:"
    echo "   sudo apt update"
    echo "   sudo apt install -y docker.io docker-compose"
    echo "   sudo systemctl start docker"
    echo "   sudo systemctl enable docker"
    echo "   sudo usermod -aG docker \$USER"
    echo ""
    exit 1
fi

# Check if Docker is running
if systemctl is-active --quiet docker; then
    echo "✅ Docker está ejecutándose"
else
    echo "⚠️  Docker no está ejecutándose"
    echo "📋 Para iniciar Docker ejecuta:"
    echo "   sudo systemctl start docker"
    echo ""
    exit 1
fi

# Start MongoDB with Docker
echo "Iniciando MongoDB con Docker..."
docker run -d \
  --name chat-mongodb \
  -p 27017:27017 \
  -e MONGO_INITDB_ROOT_USERNAME=admin \
  -e MONGO_INITDB_ROOT_PASSWORD=password123 \
  -e MONGO_INITDB_DATABASE=chat_platform \
  -v $(pwd)/mongo-init.js:/docker-entrypoint-initdb.d/mongo-init.js:ro \
  mongo:7.0

echo "✅ MongoDB funcionando en: mongodb://localhost:27017"
echo ""

# Start frontend
echo "Iniciando frontend..."
cd frontend && npm run dev &> /dev/null &
FRONTEND_PID=$!
echo "✅ Frontend funcionando en: http://localhost:5173"
echo ""

# Start backend
echo "Iniciando backend..."
cd ../backend && npm run dev &> /dev/null &
BACKEND_PID=$!
echo "✅ Backend funcionando en: http://localhost:3001"
echo ""

echo "📋 Para completar la configuración:"
echo ""
echo "1. Verifica que MongoDB esté funcionando:"
echo "   docker ps | grep mongodb"
echo ""
echo "2. Abre tu navegador en: http://localhost:5173"
echo ""
echo "🎉 ¡Tu plataforma de chat con MongoDB estará lista!"
echo ""
echo "Funcionalidades disponibles:"
echo "• 💬 Chat en tiempo real con MongoDB"
echo "• 👥 Gestión de grupos"
echo "• 📁 Transferencia de archivos"
echo "• ✏️ Edición colaborativa de documentos"
echo "• 🔐 Autenticación segura"
echo "• 👤 Gestión de usuarios y permisos"
echo "• 🗄️ Base de datos MongoDB en Docker"
echo ""

# Keep the script running to allow the services to stay alive
wait $FRONTEND_PID
