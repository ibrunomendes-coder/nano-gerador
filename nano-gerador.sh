#!/bin/bash

# Nano Gerador - Script de inicialização
# Abre o app como uma aplicação standalone

APP_DIR="/home/ibrunomendes/Dropbox/1.projects/nano-gerador"
PORT=3001
URL="http://localhost:$PORT"

cd "$APP_DIR" || exit 1

# Verifica se já está rodando
if lsof -i:$PORT > /dev/null 2>&1; then
    echo "Nano Gerador já está rodando na porta $PORT"
else
    echo "Iniciando Nano Gerador..."
    # Inicia o servidor em background
    npm run dev -- -p $PORT &

    # Aguarda o servidor iniciar
    echo "Aguardando servidor..."
    sleep 3

    # Tenta conectar até 30 segundos
    for i in {1..30}; do
        if curl -s "$URL" > /dev/null 2>&1; then
            echo "Servidor pronto!"
            break
        fi
        sleep 1
    done
fi

# Abre no navegador como app (sem barra de navegação)
# Tenta usar diferentes navegadores
if command -v google-chrome &> /dev/null; then
    google-chrome --app="$URL" --new-window 2>/dev/null &
elif command -v chromium &> /dev/null; then
    chromium --app="$URL" --new-window 2>/dev/null &
elif command -v brave &> /dev/null; then
    brave --app="$URL" --new-window 2>/dev/null &
elif command -v firefox &> /dev/null; then
    firefox --new-window "$URL" 2>/dev/null &
else
    xdg-open "$URL" 2>/dev/null &
fi

echo "Nano Gerador aberto em $URL"
