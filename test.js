var express = require('express')
var app = express()
var mongoose  = require('mongoose')

app.get('/', function(req, res) {
	console.log('request received')
	res.send('This works!')
})

app.listen(4900)

console.log("Test server is running!")