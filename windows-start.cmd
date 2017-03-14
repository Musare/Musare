start "Redis" "startRedis.cmd"
start "Mongo" "startmongo.cmd"
cd backend
start "Backend" "nodemon"
cd ..
cd frontend
start "Frotend" npm run development-watch
cd ..
