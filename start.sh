#!/usr/bin/env bash
set -e

# Cargar NVM y seleccionar Node.js v24.16.0 (requerido por Angular CLI)
export NVM_DIR="$HOME/.nvm"
if [ -s "$NVM_DIR/nvm.sh" ]; then
  source "$NVM_DIR/nvm.sh"
  nvm use v24.16.0 >/dev/null
else
  # Fallback: agregar al PATH la versión de node v24 si existe
  if [ -d "$HOME/.nvm/versions/node/v24.16.0/bin" ]; then
    export PATH="$HOME/.nvm/versions/node/v24.16.0/bin:$PATH"
  fi
fi

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
RED='\033[0;31m'
NC='\033[0m'

cleanup() {
  echo -e "\n${YELLOW}Deteniendo servicios...${NC}"
  kill $BACKEND_PID $FRONTEND_PID 2>/dev/null
  wait $BACKEND_PID $FRONTEND_PID 2>/dev/null
  # Detener el servidor de Excalidraw
  EXPRESS_SERVER_URL=http://127.0.0.1:3015 bunx mcp-excalidraw-server stop 2>/dev/null || true
  echo -e "${GREEN}Servicios detenidos.${NC}"
  exit 0
}
trap cleanup SIGINT SIGTERM

kill_port() {
  local port=$1
  local pid
  pid=$(lsof -ti :"$port" 2>/dev/null) || true
  if [ -n "$pid" ]; then
    echo -e "${YELLOW}  → Puerto $port ocupado por PID $pid. Cerrando...${NC}"
    kill "$pid" 2>/dev/null || true
    sleep 1
  fi
}

echo -e "${CYAN}══════════════════════════════════════════════${NC}"
echo -e "${CYAN}   Parking System - Inicio de Servicios       ${NC}"
echo -e "${CYAN}══════════════════════════════════════════════${NC}"

# ─── Liberar puertos ────────────────────────────────────
echo -e "\n${YELLOW}Verificando puertos...${NC}"
kill_port 3000
kill_port 3001
kill_port 3015
kill_port 4200
kill_port 4201

# ─── Backend ────────────────────────────────────────────
echo -e "\n${YELLOW}[1/3] Iniciando backend (NestJS)...${NC}"
cd "$ROOT_DIR/backend"
npx prisma generate --no-hints
npm run start:dev &
BACKEND_PID=$!
echo -e "${GREEN}  → Backend PID: $BACKEND_PID${NC}"

# ─── Frontend ───────────────────────────────────────────
echo -e "\n${YELLOW}[2/3] Iniciando frontend (Angular)...${NC}"
cd "$ROOT_DIR/frontend"
npm run start &
FRONTEND_PID=$!
echo -e "${GREEN}  → Frontend PID: $FRONTEND_PID${NC}"

# ─── Excalidraw ─────────────────────────────────────────
echo -e "\n${YELLOW}[3/3] Iniciando Excalidraw...${NC}"
PORT=3015 EXPRESS_SERVER_URL=http://127.0.0.1:3015 bunx mcp-excalidraw-server start

# ─── Info ───────────────────────────────────────────────
echo -e "\n${CYAN}══════════════════════════════════════════════${NC}"
echo -e "${GREEN}  Backend:    http://localhost:3000/api${NC}"
echo -e "${GREEN}  Frontend:   http://localhost:4200${NC}"
echo -e "${GREEN}  Excalidraw: http://localhost:3015${NC}"
echo -e "${CYAN}══════════════════════════════════════════════${NC}"
echo -e "${YELLOW}Presiona Ctrl+C para detener todos los servicios.${NC}"

wait


