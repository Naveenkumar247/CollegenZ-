const mongoose = require('mongoose');

mongoose.connect('mongodb+srv://Naveenkumar:<mushroom%23nk24>@collegenz.yjjzybn.mongodb.net/?retryWrites=true&w=majority&appName=Collegenz');

const UserSchema = new mongoose.Schema({
  name: String,
  email: String
});

const User = mongoose.model('User', UserSchema);

await User.create({ name: 'Naveen', email: 'naveen@example.com' });
