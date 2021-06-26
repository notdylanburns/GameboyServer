const express = require('express')
const path = require('path')
const app = express()
const port = 8766

app.use(express.static(path.join(__dirname, 'public/')))

app.get('/', (req, res) => {
    res.setHeader('Content-type', 'text/html');
    res.sendFile(path.join(__dirname, 'public/index.html'))
})

app.listen(port, () => {
    console.log(`Server listening on port ${port}`)
})

//Catch 404
app.use(function(req, res, next) {
    res.status(404).send("404");
});