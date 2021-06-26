import asyncio, websockets, threading, json, hashlib, random, string, time, math
from pyboy import PyBoy
import numpy as np
from io import BytesIO
import zlib

passphrase = "rickandmortyseason5"
validkeys = []

pyboys = []

async def invalidRequest(websocket):
    await websocket.send("Invalid Request")

async def generateKey(websocket, requestPassphrase):
    if requestPassphrase == passphrase:
        characterPool = string.ascii_letters + string.digits + string.punctuation
        salt = ''.join(random.choice(characterPool) for i in range(30))
        num = str(math.floor(time.time()))
        key = hashlib.sha1(bytes(requestPassphrase + salt + num, 'utf-8')).hexdigest()
        validkeys.append(key)

        await websocket.send(key)
    else:
        await invalidRequest(websocket)

def deAuthKey(key):
    for i in validkeys:
        if i == key:
            validkeys.remove(key)

async def runCommand(websocket, cmd):
    if cmd["command"] == "deauthenticate":
        deAuthKey(cmd["authentication"])
        await websocket.send("Key Invalidated")
    elif cmd["command"] == "start":
        #np_bytes = BytesIO()
        #np.save(np_bytes, testimage, allow_pickle=True)
        #np_bytes = np_bytes.getvalue()
        #await websocket.send(np_bytes)
        filename = "testroms/gambatte/enable_display/frame0_m1stat_1_dmg08_cgb04c_out80.gbc"
        pyboy = PyBoy(filename, window_type="headless", disable_renderer=True)
        pyboy.set_emulation_speed(1)
        screen = pyboy.botsupport_manager().screen()

        for i in range(200):
            image = screen.screen_ndarray()
            screenBuffer = zlib.compress(json.dumps(image.tolist()).encode('utf-8'), level=-1)
            await websocket.send(screenBuffer)
            pyboy.tick()
        pyboy.stop()
        await websocket.send("done")


async def server(websocket, path):
    while True:
        requestRaw = await websocket.recv()
        try:
            request = json.loads(requestRaw)
            valid = False
            #if client requests to close the connection, break the loop
            if request["command"] == "close":
                valid = True
                if len(request["authentication"]) > 0:
                    deAuthKey(request["authentication"])
                break
            #authenticate commands do not require a valid key
            elif request["command"] == "authenticate":
                valid = True
                await generateKey(websocket, request["authentication"])
            #any other command requires authentication with a valid key
            elif request["authentication"] in validkeys:
                valid = True
                await runCommand(websocket, request)
            if not valid:
                await invalidRequest(websocket)
        except Exception as e:
            print(e)
            await invalidRequest(websocket)
    


start_server = websockets.serve(server, "192.168.1.114", 8765)

asyncio.get_event_loop().run_until_complete(start_server)
asyncio.get_event_loop().run_forever()