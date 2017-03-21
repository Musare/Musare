start "Redis" "startRedis.cmd"
start "Mongo" "startmongo.cmd"
cd frontend
start "Frotend" npm run development-watch
cd ..
SLEEP 60
cd backend
start "Backend" "nodemon"
cd ..
