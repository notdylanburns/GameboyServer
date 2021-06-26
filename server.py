import asyncio, websockets, threading, json, hashlib, random, string, time, math
import pyboy
from pyboy import PyBoy, WindowEvent
import numpy as np
from io import BytesIO
import zlib

passphrase = "rickandmortyseason5"
validkeys = []

pyboys = {}
screens = {}
buttons = {
    "START_PRESS": WindowEvent.PRESS_BUTTON_START,
    "SELECT_PRESS": WindowEvent.PRESS_BUTTON_SELECT,
    "A_PRESS": WindowEvent.PRESS_BUTTON_A,
    "B_PRESS": WindowEvent.PRESS_BUTTON_B,
    "UP_PRESS": WindowEvent.PRESS_ARROW_UP,
    "DOWN_PRESS": WindowEvent.PRESS_ARROW_DOWN,
    "LEFT_PRESS": WindowEvent.PRESS_ARROW_LEFT,
    "RIGHT_PRESS": WindowEvent.PRESS_ARROW_RIGHT,
    "START_RELEASE": WindowEvent.RELEASE_BUTTON_START,
    "SELECT_RELEASE": WindowEvent.RELEASE_BUTTON_SELECT,
    "A_RELEASE": WindowEvent.RELEASE_BUTTON_A,
    "B_RELEASE": WindowEvent.RELEASE_BUTTON_B,
    "UP_RELEASE": WindowEvent.RELEASE_ARROW_UP,
    "DOWN_RELEASE": WindowEvent.RELEASE_ARROW_DOWN,
    "LEFT_RELEASE": WindowEvent.RELEASE_ARROW_LEFT,
    "RIGHT_RELEASE": WindowEvent.RELEASE_ARROW_RIGHT
}

filename = "testroms/pokemongold.gbc"

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
    if cmd["command"] == "stop":
        pyboys[cmd["authentication"]].stop()
        pyboys.pop(cmd["authentication"])
        screens.pop(cmd["authentication"])
        deAuthKey(cmd["authentication"])
        await websocket.send("Key Invalidated")
    elif cmd["command"] == "start":
        pyboys[cmd["authentication"]] = PyBoy(filename, window_type="headless", disable_renderer=True)
        pyboys[cmd["authentication"]].set_emulation_speed(1)
        screens[cmd["authentication"]] = pyboys[cmd["authentication"]].botsupport_manager().screen()
        await websocket.send("PyBoy Instance Created")
    elif cmd["command"] == "getFrame":
        pyboys[cmd["authentication"]].tick()
        image = screens[cmd["authentication"]].screen_ndarray()
        screenBuffer = zlib.compress(json.dumps(image.tolist()).encode('utf-8'), level=-1)
        await websocket.send(screenBuffer)
    elif cmd["command"] == "sendInput":
        for button in cmd["buttons"]:
            pyboys[cmd["authentication"]].send_input(buttons[button])
        #await websocket.send("Buttons Pressed")



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
                    pyboys[request["authentication"]].stop()
                    pyboys.pop(request["authentication"])
                    screens.pop(request["authentication"])
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