'use strict';
require('dotenv').config();
const express = require('express');
const myDB = require('./connection');
const fccTesting = require('./freeCodeCamp/fcctesting.js');
const session = require("express-session");
const passport = require("passport");
const { ObjectID } = require('mongodb');
const bcrypt = require('bcrypt');
const sessionStore = new session.MemoryStore();
let passportSocketIo=require('passport.socketio')


const MongoStore = require('connect-mongo')(session);
const URI = process.env.MONGO_URI;
const store = new MongoStore({ url: URI });

const cookieParser = require("cookie-parser");

const app = express();

const http = require('http').createServer(app);
const io = require('socket.io')(http);
app.set('view engine', 'pug');

app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: true,
  saveUninitialized: true,
  cookie: { secure: false }
}));

app.use(passport.initialize());
app.use(passport.session());

const routes = require('./routes.js');
const auth = require('./auth.js');

myDB(async client => {
  const myDataBase = await client.db('database').collection('users');
  // Be sure to change the title
  routes(app, myDataBase);
  auth(app, myDataBase);

  const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
  console.log('Listening on port ' + PORT);
});

  // Serialization and deserialization here...
  // Be sure to add this...
}).catch(e => {
  app.route('/').get((req, res) => {
    res.render('index', { title: e, message: 'Unable to connect to database' });
  });
});
// app.listen out here...
app.set('views', './views/pug');

fccTesting(app); //For FCC testing purposes
app.use('/public', express.static(process.cwd() + '/public'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/*    app.route('/').get((req, res) => {
//res.render('index')
res.render('index', { title: 'Hello', message: 'Please log in' });
});   */

//start socket.io code

io.use(passportSocketIo.authorize({
  cookieParser: cookieParser,
  key:          'express.sid',
  secret:       process.env.SESSION_SECRET,
  store:        sessionStore,
  success: (data, accept) => {
    console.log('successful connection to socket.io');
    accept(null, true);
    accept();
  },
  fail: (data, message, error, accept) => {
    if(error) { throw new Error(message) };
    console.log('failed connection to socket.io:', message);
    accept(null, false);
    if(error) { accept(new Error(message)) };
  }
}));

var currentUsers = 0;
io.on("connection", socket => {
  ++currentUsers;
  io.emit("user", {name: socket.request.user.name,currentUsers: currentUsers,connected: true});
  console.log("A user has connected");
  socket.on('chat message', (message) => {
    io.emit('chat message', {name: socket.request.user.name, message:message})
  })
  socket.on("disconnect", () => {
    --currentUsers;
    io.emit("user", {name: socket.request.user.name,currentUsers: currentUsers,connected: false});
    console.log("A user has disconnected");
  });
});

//end socket.io code