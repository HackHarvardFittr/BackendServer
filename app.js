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
var stripe = require('stripe')("pk_test_JKdI5RMl6j8G0v5oARcNdKCj")


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

var isSameDay = function(date1, date2) {
	return (date1.getMonth() == date2.getMonth() && date1.getDate() == date2.getDate() && date1.getYear() == date2.getYear()) 
}

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

var CURRENT_USER_ID = null

app.post('/submitprofile', function(req, res) {
	var data = req.body
	var address = data.gymAddress
	address.split(' ').join('+')
	var latitude = 42
	var longitude = -71
	var APIcall = googleMapsAPI+address+googleMapsAPIKey
	request(APIcall, function(err, resp, body) {
		var response = JSON.parse(body)
		if (response["results"] && response["results"][0] && response["results"][0]["geometry"]) {
			latitude = parseFloat(response["results"][0]["geometry"]["location"]["lat"])
			longitude = parseFloat(response["results"][0]["geometry"]["location"]["lng"])			
		}
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
		console.log(newUser)
		User.create(newUser, function(err, user) {
		if (err) {
		console.log(err)
		res.send(err)
		} else {
			console.log(String(user._id))
			CURRENT_USER_ID = user._id
			res.json({"userid": String(user._id)})
		}
	})
})	

})

app.post('/appstart', function(req, res) {
	console.log("App start endpoint triggered")
	var userid = req.body.userid
	var pedometer = req.body.pedometer

	console.log(pedometer)
	var today = new Date()
	User.findById(userid, function(err, user) {
		if (err) {
			console.log("DB error: User not found")
			return
		}
		if (isSameDay(today, user.checkinDate)) {
			console.log("Same day, no change")
			return
		}
		else {
			console.log("Accounting for change")
			var numSteps = user.dailySteps
			var numPointsDueToSteps = parseInt(((pedometer - numSteps)/1000) * 2)
			user.dailyPoints += numPointsDueToSteps
			user.dailySteps = pedometer
			user.goneToday = false
			user.checkinDate = today
			user.save()
		}
	})

})

app.post('/like', function(req, res) {
	console.log("Req received")
	var userid = req.body.userid
	var likeid = req.body.likeid
	console.log(likeid)
	var alreadyLikes = false
	User.findById(userid, function(err, user) {
		var likers = user.likers
		for (var i = 0; i < likers.length; ++i) {
			// If the liked user already likes the user
			if (likers[i] === likeid) {
				alreadyLikes = true
			}
		}
		if (alreadyLikes) {
			// TODO: Match found!!
			User.findById(likeid, function(err, likedUser) {
				likedUser.partner = String(userid)
				likedUser.likers.push(String(userid))
				likedUser.save()
				user.partner = String(likeid)
				user.save()
				res.json({"value": "true"})
			})
		} else {
			User.findById(likeid, function(err, likedUser) {
				likedUser.likers.push(userid);
				likedUser.save()
				res.json({"value": "false"})
			})
		}
	})
	// User.findById(likeid, function(err, user) {
	// 	user.likers.push(userid)
	// })
})

app.post('/stats', function(req, res) {
	userid = req.body.userid
	console.log("In stats")
	console.log(userid)
	User.findById(userid).exec(function(err, user) {
		if (err) {
			res.json({"error":"true"})
			return
		} else {
			var userJSON = {
				"dailySteps": user.dailySteps,
				"dailyPoints": String(user.dailyPoints),
				"goneToday": user.goneToday,
				"imageURL": user.imageURL,
				"name": user.name
			}
			console.log(user)
			User.findById(user.partner).exec(function(err, part) {
				if (err || !part) {
					res.json({"error":"true", "user": userJSON})
					return
				}
				var oppJSON = {
				"dailyPoints": String(part.dailyPoints),
				"dailySteps": part.dailySteps,
				"goneToday": part.goneToday,
				"imageURL": part.imageURL,
				"name" : part.name
			}
			console.log({"user": userJSON, "opponent": oppJSON})
			res.json({"user": userJSON, "opponent": oppJSON, "error" :"false"})
			})	
		}
	})
})

app.post('/checkin', function(req, res) {
	var lat = parseFloat(req.body.latitude)
	var lon = parseFloat(req.body.longitude)
	console.log(lat)
	console.log(lon)
	var lat2 = 0
	var lon2 = 0
	var distance = 99999
	var checkinValid = false
	userid = req.body.userid
	console.log(userid)
	User.findById(userid).exec(function(err, user) {
		if (err) {
			res.send("Error: User not found!")
			return
		}
		else {
			lat2 = user.latitude
			lon2 = user.longitude
		}
		console.log(lat2)
		console.log(lon2)
		distance = euclideanDistance(lat, lon, lat2, lon2)
		console.log(distance)
		if (distance < 2) {
			checkinValid = true
		}
		if (!checkinValid) {
			res.json({"value" : "false"})
		}
		else {
			// Now we compare the dates 
			today = new Date()
			if (today > user.checkinDate) {
				user.checkinDate = today
				user.goneToday = true
				user.dailyPoints += 10
				user.save()
			}
			res.json({"value" : "true"})
		}
	})
})

// Stripe Client ID: ca_9QLjFhvhlqE96OcOzl0E7G0DqPhosLOo
// Redirect URI Stripe: http://35.161.109.99:4900/stripeURI

// Link for the 'Connect' button: https://connect.stripe.com/oauth/authorize?response_type=code&client_id=ca_9QLjFhvhlqE96OcOzl0E7G0DqPhosLOo&scope=read_write
// Test secret key: sk_test_w3e7ceV8H7W58BRqHnyv8rxz
var STRIPE_TOKEN_URI = "https://connect.stripe.com/oauth/token"
var STRIPE_CLIENT_ID = "ca_9QLjFhvhlqE96OcOzl0E7G0DqPhosLOo"
var STRIPE_CLIENT_SECRET = "pk_test_JKdI5RMl6j8G0v5oARcNdKCj"
var STRIPE_TEST_DESTINATION = "cus_9QNfmWnoHlLo4Y"

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
			client_secret: STRIPE_CLIENT_SECRET
		}
	}, function(err, response, body) {
		var accessToken = JSON.parse(body).access_token
		var stripeUserId = JSON.parse(body).stripe_user_id
		console.log(accessToken)
		console.log(stripeUserId)

		stripe.charges.create({
			amount: 1,
			currency: 'cad',
			source: accessToken
		}, { stripe_account: STRIPE_TEST_DESTINATION })
		res.send(accessToken)
	})
})


// TODO
app.post('/populate', function(req, res) {
	var lat1 = parseFloat(req.body.latitude)
	var lon1 = parseFloat(req.body.longitude)
	userid = req.body.userid

	User.find({}, function(err, allUsers) {
		var UsersToBeSent = allUsers.filter(function(usr) {
			console.log(euclideanDistance(usr.latitude, usr.longitude, lat1, lon1))
			return (String(userid) !== String(usr._id) && euclideanDistance(usr.latitude, usr.longitude, lat1, lon1) <= 10000)
		})
		.map(function(usr) {
			return {
				"weight": usr.weight,
				"favouriteWorkout": usr.favouriteWorkout,
				"imageURL": usr.imageURL,
				"name": usr.name,
				"userid": String(usr._id)
			}
		})
		res.json(UsersToBeSent)
	})

	// User.findById(userid).exec(function(err, user) {
	// 	if (err) res.send("Error: User not found!")	
	// 	else {
	// 		var lat2 = user.latitude
	// 		var lon2 = user.longitude
	// 		distance = euclideanDistance(lat1, lon1, lat2, lon2) 
	// 	}
	// 	User.find({}, function(err, allUsers) {
	// 		var UsersToBeSent = allUsers.filter(function(usr) {
	// 			return (String(userid) !== String(usr._id) || )
	// 		})
	// 		.map(function(usr) {
	// 			return {
	// 				weight: usr.weight,
	// 				favouriteWorkout: usr.favouriteWorkout,
	// 				imageURL: usr.imageURL,
	// 				name: usr.name
	// 			}
	// 		})
	// 		res.json(UsersToBeSent)
	// 	})
	// })
})

app.listen(4900)
console.log("Backend server is running!")