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

if (typeof(Number.prototype.toRad) === "undefined") {
  Number.prototype.toRad = function() {
    return this * Math.PI / 180
  }
}

cloudinary.config({ 
  	cloud_name: 'aayushshah', 
  	api_key: '736295731869694', 
  	api_secret: 'TpBrLwl_nATkBZQSzws94mtS9fA' 
})

var euclideanDistance = function(lat1, lon1, lat2, lon2) {
	var R = 6371; // Radius of the earth in km
	var dLat = (lat2-lat1).toRad();  // Javascript functions in radians
	var dLon = (lon2-lon1).toRad(); 
	var a = Math.sin(dLat/2) * Math.sin(dLat/2) +
	        Math.cos(lat1.toRad()) * Math.cos(lat2.toRad()) * 
	        Math.sin(dLon/2) * Math.sin(dLon/2); 
	var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
	var d = R * c; // Distance in km
	return d
}

var imageURL = ""

app.post('/upload', function(req, res) {
	var img = req.body.image
	var buf = new Buffer(img, 'base64')
	fs.writeFile('uploads/image.png', buf)
	res.send("File received!")
	cloudinary.uploader.upload('uploads/image.png', function(result) {
		imageURL = result.url
		console.log(imageURL)
	})
})

app.post('/submitprofile', function(req, res) {
	var data = req.body
	var address = data.gymAddress
	address.split(' ').join('+')
	var latitude = 0
	var longitude = 0
	var APIcall = googleMapsAPI+address+googleMapsAPIKey
	request(APIcall, function(err, res, body) {
		var response = JSON.parse(body)
		latitude = parseFloat(response["results"][0]["geometry"]["location"]["lat"])
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
	User.create(newUser, function(err, user) {
		if (err) {
			console.log(err)
			res.send(err)
		} else {
			console.log(user._id)
			res.send(user._id)
		}
	})
})

app.post('/checkin', function(req, res) {
	var lat = parseFloat(req.body.latitude)
	var lon = parseFloat(req.body.longitude)
	var lat2 = 0
	var lon2 = 0
	var distance = 99999
	var checkinValid = false
	userid = req.body.userid
	User.findById(userid).exec(function(err, user) {
		if (err) {
			res.send("Error: User not found!")
		}
		else {
			lat2 = user.latitude
			lon2 = user.longitude
		}
		distance = euclideanDistance(lat, lon, lat2, lon2)
		if (distance < 1.1) {
			checkinValid = true
		}
		if (!checkinValid) {
			res.send(false)
		}
		else {
			// Now we compare the dates 
			today = new Date()
			if (today > user.checkinDate) {
				user.checkinDate = today
				user.dailyPoints += 10
				user.save()
			}
			res.send(true)
		}
	})
})

// Stripe Client ID: ca_9QLjFhvhlqE96OcOzl0E7G0DqPhosLOo
// Redirect URI Stripe: http://35.161.109.99:4900/stripeURI

// Link for the 'Connect' button: https://connect.stripe.com/oauth/authorize?response_type=code&client_id=ca_9QLjFhvhlqE96OcOzl0E7G0DqPhosLOo&scope=read_write
// Test secret key: sk_test_w3e7ceV8H7W58BRqHnyv8rxz
var STRIPE_TOKEN_URI = "https://connect.stripe.com/oauth/token"
var STRIPE_CLIENT_ID = "ca_9QLjFhvhlqE96OcOzl0E7G0DqPhosLOo"
var STRIPE_CLIENT_SECRET = "sk_test_w3e7ceV8H7W58BRqHnyv8rxz"

app.get('/stripeURI', function(req, res) {
	var auth_code = req.query.code

	if (req.query.eror) {
		res.send("Error: The client denied access to the app")
	}

	// If the flow reaches this stage, we know that we have the auth_code

	request.post({
		url: STRIPE_TOKEN_URI,
		form: {
			grant_type: "authorization_code",
			client_id: STRIPE_CLIENT_ID,
			code: auth_code,
			client_secret: "sk_test_w3e7ceV8H7W58BRqHnyv8rxz"
		}
	}, function(err, res, body) {
		var accessToken = JSON.parse(body).access_token

		console.log(accessToken)
		console.log(JSON.parse(body))
		res.send(accessToken)
	})
})


// TODO
app.post('/populate', function(req, res) {
	var lat1 = parseFloat(req.body.latitude)
	var lon1 = parseFloat(req.body.longitude)
	var lat2 = 0 
	var lon2 = 0

	var distance = 9999
	userid = req.body.userid
	Users.findById(userid).exec(function(err, user) {
		if (err) res.send("Error: User not found!")	
	})
})

app.listen(4900)
console.log("Backend server is running!")