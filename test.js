var express = require('express')
var app = express()
var mongoose  = require('mongoose')
var multer = require('multer')
var upload = multer({ dest : 'uploads/'})
var cloudinary = require('cloudinary')

app.get('/', function(req, res) {
	console.log('request received')
	res.send('This works!')
})

app.post('/upload', upload.array('file', 12), function(req, res) {
	console.log(req.files)
	res.send("done")
})

app.listen(4900)

console.log("Test server is running!")