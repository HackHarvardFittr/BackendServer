var mongoose = require('mongoose')

var UserSchema = new mongoose.Schema({
	name: String,
	latitude: Number,
	longitude: Number,
	imageURL: { type: String, required: true },
	date: { type: Date, default: Date.now },
	favouriteWorkout: String,
	weight: String,
	hasPartner: { type: Boolean, default: false },
	partner: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
	likers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
})

var User = mongoose.model('User', UserSchema)
module.exports = User