:: Sets up the environment for docker
@ECHO OFF
@FOR /f "tokens=*" %%i IN ('docker-machine env default') DO @%%i