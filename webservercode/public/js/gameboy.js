let fpsInterval, now, then, elapsed;
let fps = 30;
let stopConnection = false;
let keyBuffer = [];
let password;
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
    document.getElementById("gameBoyCanvas").setAttribute("hidden", "");
    document.getElementById("romDropdown").removeAttribute("hidden");
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
        let key = keyDict[e.key] + "_PRESS";
    
        if (!keyBuffer.includes(key)){
            keyBuffer.push(key);
        }
    }
})

document.addEventListener('keyup', e => {
    if (charList.includes(e.key)){
        let key = keyDict[e.key] + "_RELEASE";

        if (!keyBuffer.includes(key)){
            keyBuffer.push(key);
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

    let ratioX = window.innerWidth / width;
    let ratioY = window.innerHeight / height;
    let ratio;

    if (ratioX < ratioY) {
        ratio = Math.floor(ratioX);
    } else {
        ratio = Math.floor(ratioY);
    }

    canvas.width = ratio * tempCanvas.width;
    canvas.height = ratio * tempCanvas.height;

    ctx.mozImageSmoothingEnabled = false;
    ctx.webkitImageSmoothingEnabled = false;
    ctx.msImageSmoothingEnabled = false;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(tempCanvas, 0, 0, canvas.width, canvas.height);
}

function getRoms() {
    password = window.prompt("Enter the password for the GameBoy Server", "");
    const romSocket = new WebSocket('ws://192.168.1.114:8765')

    let packet = {
        "authentication": password,
        "command":  "authenticate"
    }

    let stage = 1;
    let roms;
    let restart = false;

    function updateDropDown() {
        let dropdown = document.getElementById("roms");
        let html = "";
        for (let i = 0; i < roms.length; i++) {
            html = html.concat(`<option value="${roms[i]}">${roms[i]}</option>`)
        }
        dropdown.innerHTML = html;
    }

    romSocket.addEventListener('open', function(event) {
        romSocket.send(JSON.stringify(packet))
    })

    romSocket.addEventListener('message', function(event) {
        switch (stage) {
            case 1:
                if (event.data == "Invalid Request") {
                    restart = true;
                    window.alert("Invalid Password");
                    break
                }
                packet["authentication"] = event.data
                packet["command"] = "getRoms"
                romSocket.send(JSON.stringify(packet))
                stage += 1
                break
            case 2:
                roms = JSON.parse(event.data)
                updateDropDown();
                packet["command"] = "close"
                romSocket.send(JSON.stringify(packet))
                romSocket.close()
                break
        }
        if (restart) {
            restart = false;
            getRoms();
        }
    })
}

function startGameBoy() {
    let socket = new WebSocket('ws://192.168.1.114:8765')
    let packet = {
        "authentication": password,
        "command":  "authenticate"
    }

    let stage = 1
    let screenImg;
    let firstframe = true;
    let rom = document.getElementById("roms").value;
    let restart = false;

    document.getElementById("romDropdown").setAttribute("hidden", "");
    document.getElementById("gameBoyCanvas").removeAttribute("hidden");

    socket.addEventListener('open', function (event) {
        socket.send(JSON.stringify(packet));
    })

    socket.addEventListener('message', function (event) {
        switch (stage) {
            case 1:
                if (event.data == "Invalid Request") {
                    restart = true;
                    window.alert("Invalid Password");
                    break;
                }
                packet["authentication"] = event.data
                packet["rom"] = rom;
                packet["command"] = "start"
                socket.send(JSON.stringify(packet))
                delete packet["rom"]
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
                    stopConnection = false;
                    stage += 1
                    break
                }
                if (keyBuffer.length > 0) {
                    packet["command"] = "sendInput";
                    packet["buttons"] = keyBuffer;
                    socket.send(JSON.stringify(packet))
                    keyBuffer = [];
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
        if (restart) {
            restart = false;
            startGameBoy();
        }
    })
}