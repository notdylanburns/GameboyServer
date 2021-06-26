function updateCanvas(screenImg){
    console.log("Drawing Image...")
    let canvas = document.getElementById("gameboyScreen")
    let ctx = canvas.getContext("2d")
    let width = canvas.width;
    let height = canvas.height;
    let imageData = ctx.createImageData(width,height);
    
    for (var x=0; x<screenImg[0].length; x++) {
        for (var y=0; y<screenImg.length; y++) {
            let pixelindex = (y * width + x) * 4;

            // Generate a xor pattern with some random noise
            var red = screenImg[y][x][0];
            var green = screenImg[y][x][1];
            var blue = screenImg[y][x][2];

            // Set the pixel data
            imageData.data[pixelindex] = red;     // Red
            imageData.data[pixelindex+1] = green; // Green
            imageData.data[pixelindex+2] = blue;  // Blue
            imageData.data[pixelindex+3] = 255;   // Alpha

            ctx.putImageData(imageData, 0, 0);
        }
    }

    ctx.putImageData(imageData, 0, 0);
}

function getScreen() {
    const socket = new WebSocket('ws://localhost:8765')
    let packet = {
        "authentication": "rickandmortyseason5",
        "command":  "authenticate"
    }

    let stage = 1
    let screenImg;

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
                screenImg = event.data
                const reader = new FileReader()
                reader.readAsArrayBuffer(screenImg)
                reader.onloadend = (event) => {
                    screenImg = JSON.parse(new TextDecoder().decode(pako.inflate(reader.result)))
                    updateCanvas(screenImg)
                    //console.log(screenImg)
                    //console.log(screenImg.length)
                    //console.log(screenImg[0].length)
                }
                break
            case 3:
                packet["command"] = "deauthenticate"
                socket.send(JSON.stringify(packet))
                stage += 1
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