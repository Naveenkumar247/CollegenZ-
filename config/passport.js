const passport = require("passport");
const LocalStrategy = require("passport-local").Strategy;
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const bcryptjs = require("bcryptjs");

const genz = require("../models/primary/User");

/* ======================
   LOCAL STRATEGY
====================== */
passport.use(
  new LocalStrategy(
    { usernameField: "login", passwordField: "password" },
    async (login, password, done) => {
      try {
        let user;

        if (login.includes("@")) {
          user = await genz.findOne({ email: login.toLowerCase() });
        } else {
          user = await genz.findOne({ username: login });
        }

        if (!user) return done(null, false, { message: "User not found" });
        if (!user.password)
          return done(null, false, { message: "Use Google Sign-In" });

        const isMatch = await bcryptjs.compare(password, user.password);
        if (!isMatch)
          return done(null, false, { message: "Incorrect password" });

        return done(null, user);
      } catch (err) {
        return done(err);
      }
    }
  )
);

/* ======================
   GOOGLE STRATEGY
====================== */
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL:
        process.env.NODE_ENV === "production"
          ? "https://collegenz.in/auth/google/callback"
          : "http://localhost:3000/auth/google/callback",
    },
    async (_, __, profile, done) => {
      try {
        const email = profile.emails[0].value.toLowerCase();
        let user = await genz.findOne({ email });

        if (!user) {
          user = await genz.create({
            name: profile.displayName,
            email,
            username:
              profile.displayName.replace(/\s+/g, "").toLowerCase() +
              Math.floor(Math.random() * 10000),
            password: null,
            googleUser: true,
            picture: profile.photos?.[0]?.value || null,
            accountType: "public",
          });
        }

        return done(null, user);
      } catch (err) {
        return done(err);
      }
    }
  )
);

/* ======================
   SERIALIZE
====================== */
passport.serializeUser((user, done) => done(null, user.id));

passport.deserializeUser(async (id, done) => {
  try {
    const user = await genz.findById(id);
    done(null, user);
  } catch (err) {
    done(err);
  }
});

module.exports = passport;
