#!/bin/bash

echo "🚀 Chat Platform - Docker + MongoDB Setup"
echo "========================================="
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
    echo "⚠️  Después de instalar Docker, reinicia tu terminal y ejecuta este script nuevamente"
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

# Check if MongoDB container exists
if docker ps -a | grep -q chat-mongodb; then
    echo "✅ Contenedor MongoDB encontrado"
    
    # Check if it's running
    if docker ps | grep -q chat-mongodb; then
        echo "✅ MongoDB ya está ejecutándose"
    else
        echo "🔄 Iniciando MongoDB..."
        docker start chat-mongodb
        echo "✅ MongoDB iniciado"
    fi
else
    echo "🔄 Creando contenedor MongoDB..."
    docker run -d \
      --name chat-mongodb \
      -p 27017:27017 \
      -e MONGO_INITDB_ROOT_USERNAME=admin \
      -e MONGO_INITDB_ROOT_PASSWORD=password123 \
      -e MONGO_INITDB_DATABASE=chat_platform \
      mongo:7.0
    echo "✅ MongoDB creado e iniciado"
fi

echo ""
echo "📊 Estado de MongoDB:"
docker ps | grep mongodb

echo ""
echo "📋 Para completar la configuración:"
echo ""
echo "1. Verifica que MongoDB esté funcionando:"
echo "   docker ps | grep mongodb"
echo ""
echo "2. Inicia el frontend:"
echo "   cd frontend && npm run dev"
echo ""
echo "3. Inicia el backend:"
echo "   cd backend && npm run dev"
echo ""
echo "4. Abre tu navegador en: http://localhost:5173"
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
