:: Opens the web app in the browser for you
@ECHO OFF
FOR /F "delims=" %%i IN ('docker-machine ip') DO explorer http://%%i:8080