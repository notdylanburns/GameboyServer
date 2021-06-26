import asyncio
import websockets
import json 
import numpy as np
from io import BytesIO
from matplotlib.pyplot import imshow,show
import zlib

async def hello():
    uri = "ws://localhost:8765"
    async with websockets.connect(uri) as websocket:
        password = input("PWD >> ")
        packet = {
            "authentication": password,
            "command":  "authenticate"
        }

        await websocket.send(json.dumps(packet))

        key = await websocket.recv()
        print(key)

        packet["authentication"] = key
        packet["command"] = "start"

        await websocket.send(json.dumps(packet))
        res = await websocket.recv()

        #load_bytes = BytesIO(res)
        #image = np.load(load_bytes, allow_pickle=True)

        #imshow(image)
        #show()

        image = json.loads(zlib.decompress(res))
        print(image)
        imshow(image)

        show()

        packet["command"] = "deauthenticate"

        await websocket.send(json.dumps(packet))
        res = await websocket.recv()

        print(res)

        #packet["authentication"] = "";
        packet["command"] = "close";

        await websocket.send(json.dumps(packet))

asyncio.get_event_loop().run_until_complete(hello())