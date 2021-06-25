import asyncio
import websockets
import json

async def hello():
    uri = "ws://localhost:8765"
    async with websockets.connect(uri) as websocket:
        command = input("cmd >> ")

        await websocket.send(command)

        res = await websocket.recv()
        print(res)

asyncio.get_event_loop().run_until_complete(hello())