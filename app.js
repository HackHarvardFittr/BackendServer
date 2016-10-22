var express = require('express')
var app = express()
var mongoose  = require('mongoose')
var multer = require('multer')
var upload = multer({ dest : 'uploads/'})
var cloudinary = require('cloudinary')
var fs = require('fs')
var User = require('./models/user')
var bodyParser = require('body-parser')
var request = require('request')
var googleMapsAPI = "https://maps.googleapis.com/maps/api/geocode/json?address="
var googleMapsAPIKey = "&key=AIzaSyDJ7vGimagndloKzQHMoCMSype8wbMau0Y" 

app.use(bodyParser.json({limit: '200mb'}))
app.use(bodyParser.urlencoded({limit: '200mb', extended: true}))
app.get('/', function(req, res) {
	console.log('request received')
	res.send('GET request received')
})

mongoose.connect("mongodb://localhost:27017/fittr")

cloudinary.config({ 
  	cloud_name: 'aayushshah', 
  	api_key: '736295731869694', 
  	api_secret: 'TpBrLwl_nATkBZQSzws94mtS9fA' 
})

var imageURL = ""

app.post('/upload', function(req, res) {
	var img = req.body.image
	var buf = new Buffer(img, 'base64')
	fs.writeFile('uploads/image.png', buf)
	res.send("File received!")
	cloudinary.uploader.upload('uploads/image.png', function(result) {
		imageURL = result.url
		console.log(imageUrl)
	})
})

app.post('/submitprofile', function(req, res) {
	res.send("Received request")
	var data = req.body
	var address = data.gymAddress
	address.split(' ').join('+')
	var latitude = 0
	var longitude = 0
	var APIcall = googleMapsAPI+address+googleMapsAPIKey
	request(APIcall, function(err, res, body) {
		console.log(typeof body)
		var response = JSON.parse(body)
		console.log("Latitude: " + response["results"][0]["geometry"]["location"]["lat"])
		latitude = parseFloat(response["results"][0]["geometry"]["location"]["lat"])
		console.log("Longitude: " + response["results"][0]["geometry"]["location"]["lng"])
		longitude = parseFloat(response["results"][0]["geometry"]["location"]["lng"])
	})	
	var gymAddress = data.gymAddress
	var name = data.name
	var favouriteWorkout = data.favouriteWorkout
	var weight = data.weight

	var newUser = {
		name: name,
		favouriteWorkout: favouriteWorkout,
		weight: weight,
		imageURL: imageURL,
		latitude: latitude,
		longitude: longitude
	}
	User.create(newUser, function(err, new) {
		if (err) {
			console.log(err)
			res.send(err)
		} else {
			console.log(new._id)
			res.send(new._id)
		}
	})
})

app.listen(4900)
console.log("Backend server is running!")