let fpsInterval, now, then, elapsed;
let fps = 30;
let stopConnection = false;
let keyBuffer = [];
const keyDict = {
    "ArrowUp": "UP", 
    "ArrowLeft": "LEFT", 
    "ArrowRight": "RIGHT", 
    "ArrowDown": "DOWN", 
    "a": "A", 
    "b": "B", 
    " ": "SELECT", 
    "Enter": "START"
}
const charList = ["ArrowUp", "ArrowLeft", "ArrowRight", "ArrowDown", "a", "b", " ", "Enter"];

let lastKeyTime = Date.now();
//let frametimes = [];

// function avgFrametime() {
//      let total = 0;
//      for (var frametime=1; frametime<frametimes.length; frametime+=2) {
//          total += frametimes[frametime]-frametimes[frametime-1];
//      }
//      return total/frametimes.length;
// }

function killConnection() {
    stopConnection = true;
}

function pressStart() {
    startButton = true;
}

//Kill connection with server before user leaves
window.onbeforeunload = function() {
    killConnection();
}

window.addEventListener('beforeunload', function (e) {
    e.preventDefault();
    killConnection();
    return e.returnValue = "Are you sure you want to exit?"
})

document.addEventListener('keydown', e => {
    if (charList.includes(e.key)) {
        const currentTime = Date.now();
        let key = keyDict[e.key] + "_PRESS";
        let removekey = keyDict[e.key] + "_RELEASE"

        if (keyBuffer.includes(removekey)) {
            keyBuffer.splice(keyBuffer.indexOf(removekey), 1);
        }
    
        if (!(currentTime - lastKeyTime > 500) && !keyBuffer.includes(key)){
            keyBuffer.push(key);
        }
        lastKeyTime = currentTime;
    }
})

document.addEventListener('keyup', e => {
    if (charList.includes(e.key)){
        let removekey = keyDict[e.key] + "_PRESS";
        let key = keyDict[e.key] + "_RELEASE";
        if (keyBuffer.includes(removekey)) {
            keyBuffer.splice(keyBuffer.indexOf(removekey), 1);

            if (!keyBuffer.includes(key)){
                keyBuffer.push(key);
            }
        }
    }
})

function updateCanvas(screenImg){
    //console.log("Drawing Image...")
    let canvas = document.getElementById("gameboyScreen")
    let ctx = canvas.getContext("2d")

    let tempCanvas = document.createElement("canvas");
    tempCanvas.width = 160;
    tempCanvas.height = 144;
    let ctxTemp = tempCanvas.getContext("2d");

    let width = screenImg[0].length;
    let height = screenImg.length;
    let imageData = ctxTemp.createImageData(width,height);
    
    for (let i=0; i<imageData.data.length; i+=4) {
        let x = (i/4)%160;
        let y = Math.floor(i/640);
        imageData.data[i] = screenImg[y][x][0];
        imageData.data[i+1] = screenImg[y][x][1];
        imageData.data[i+2] = screenImg[y][x][2];
        imageData.data[i+3] = 255;
    }

    ctxTemp.putImageData(imageData, 0, 0);

    canvas.width = 160 * 4;
    canvas.height = 144 * 4;

    ctx.mozImageSmoothingEnabled = false;
    ctx.webkitImageSmoothingEnabled = false;
    ctx.msImageSmoothingEnabled = false;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(tempCanvas, 0, 0, canvas.width, canvas.height);
}

function getScreen() {
    const socket = new WebSocket('ws://192.168.1.114:8765')
    let packet = {
        "authentication": "rickandmortyseason5",
        "command":  "authenticate"
    }

    let stage = 1
    let screenImg;
    let firstframe = true;

    socket.addEventListener('open', function (event) {
        socket.send(JSON.stringify(packet));
    })

    socket.addEventListener('message', function (event) {
        switch (stage) {
            case 1:
                packet["authentication"] = event.data
                packet["command"] = "start"
                socket.send(JSON.stringify(packet))
                stage += 1
                break
            case 2:
                packet["command"] = "getFrame"
                console.log("Connection Created")
                socket.send(JSON.stringify(packet))
                stage += 1
                break
            case 3:
                if (stopConnection) {
                    packet["command"] = "stop"
                    socket.send(JSON.stringify(packet))
                    stage += 1
                    break
                }
                if (keyBuffer.length > 0) {
                    console.log(keyBuffer);
                    packet["command"] = "sendInput";
                    packet["buttons"] = keyBuffer;
                    socket.send(JSON.stringify(packet))
                    packet["command"] = "getFrame";
                    delete packet["buttons"];
                }
                if (firstframe) {
                    fpsInterval = 1000 / fps;
                    then = Date.now();
                    firstframe = false;
                }
                while (true) {
                    now = Date.now();
                    elapsed = now - then;
                    if (elapsed > fpsInterval) {

                        then = now - (elapsed % fpsInterval);

                        screenImg = event.data
                        const reader = new FileReader()
                        reader.readAsArrayBuffer(screenImg)
                        reader.onloadend = (event) => {
                            screenImg = JSON.parse(new TextDecoder().decode(pako.inflate(reader.result)))
                            //console.log("Frame Received")
                            updateCanvas(screenImg)
                            frames++
                            //frametimes.push(Date.now());
                            //console.log(screenImg)
                            //console.log(screenImg.length)
                            //console.log(screenImg[0].length)
                        }
                        break
                    }
                }
                socket.send(JSON.stringify(packet))
                //frametimes.push(Date.now())
                break
            case 4:
                packet["authentication"] = ""
                packet["command"] = "close"
                socket.send(JSON.stringify(packet))
                socket.close()
                stage += 1
                break
        }
    })
}