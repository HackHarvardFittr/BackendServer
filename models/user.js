var mongoose = require('mongoose')
var today = new Date()
today.setDate(today.getDate() - 1)
var UserSchema = new mongoose.Schema({
	name: String,
	latitude: Number,
	longitude: Number,
	imageURL: { type: String, required: true },
	checkinDate: { type: Date, default: today },
	favouriteWorkout: String,
	weight: String,
	hasPartner: { type: Boolean, default: false },
	partner: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
	likers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
	dailyPoints: { type: Number, default: 0 },
	dailySteps: { type: Number, default: 0 },
	stripeUserId: String,
	stripeAccessToken: String,
	goneToday: { type: Boolean, default: false }  
})

var User = mongoose.model('User', UserSchema)
module.exports = User