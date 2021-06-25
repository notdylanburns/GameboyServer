import asyncio
import websockets
import threading
import json

async def fuckoff(websocket):
    await websocket.send("please fuck off")

async def server(websocket, path):
    commandRaw = await websocket.recv()
    try:
        command = json.loads(commandRaw)
        await websocket.send("hello")
    except:
        await fuckoff(websocket)


start_server = websockets.serve(server, "localhost", 8765)

asyncio.get_event_loop().run_until_complete(start_server)
asyncio.get_event_loop().run_forever()