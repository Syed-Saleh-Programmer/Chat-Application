import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  authId: { type: String, required: true, unique: true }, // Auth0 user ID
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  picture: { type: String },
  nickname: { type: String },
  isOnline: { type: Boolean, default: false },
  lastSeen: { type: Date, default: Date.now },
  contacts: [{ 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User' 
  }]
}, {
  timestamps: true
});

export default mongoose.model('User', userSchema);