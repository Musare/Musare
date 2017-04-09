start "Redis" "startRedis.cmd"
start "Mongo" "startmongo.cmd"
cd frontend
start "Frontend" npm run development-watch
cd ..
SLEEP 20
cd backend
start "Backend" "nodemon"
cd ..
