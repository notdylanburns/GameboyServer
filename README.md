# GameboyServer

GameboyServer is a simple and probably very buggy project that allows emulation of gameboy roms to be performed by a server and the video frames to be streamed to a
client remotely.
The project consists of 2 parts: the python web socket server and the node web server found in the "webservercode/" folder. the web socket server does all emulation
and the webserver code simply connects to the web socket server.

## Usage
The python side of the project has 2 dependencies: websockets and pyboy. The node server uses express but that should be installed automatically with `npm install`.
To use the server simply place a gameboy rom in a folder titled roms in the same folder as the server code then run the server and the node server (you will need to know
the server password to authenticate but that can be set in server.py".
Ignore client.py and pyboyTest.py these are just for testing and debug purposes.
