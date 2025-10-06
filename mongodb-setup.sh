#!/bin/bash

echo "🚀 Chat Platform - MongoDB Setup"
echo "================================="
echo ""

# Check if MongoDB is installed
if command -v mongod &> /dev/null; then
    echo "✅ MongoDB está instalado"
else
    echo "❌ MongoDB no está instalado"
    echo "📋 Para instalar MongoDB ejecuta:"
    echo "   sudo apt update"
    echo "   sudo apt install -y mongodb"
    echo "   sudo systemctl start mongodb"
    echo "   sudo systemctl enable mongodb"
    echo ""
fi

# Start MongoDB if available
if systemctl is-active --quiet mongodb; then
    echo "✅ MongoDB está ejecutándose"
else
    echo "⚠️  MongoDB no está ejecutándose"
    echo "📋 Para iniciar MongoDB ejecuta:"
    echo "   sudo systemctl start mongodb"
    echo ""
fi

echo "📋 Para completar la configuración:"
echo ""
echo "1. Instala MongoDB si no está instalado:"
echo "   sudo apt update && sudo apt install -y mongodb"
echo ""
echo "2. Inicia MongoDB:"
echo "   sudo systemctl start mongodb"
echo ""
echo "3. Abre tu navegador en: http://localhost:5173"
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
echo "• 🗄️ Base de datos MongoDB"
echo ""
