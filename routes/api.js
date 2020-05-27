// jshint esversion: 9

// API Routes

// globals

const express = require('express');
const router = express.Router();
const { check, validationResult } = require('express-validator/check');
const bcryptjs = require('bcryptjs');
const auth = require('basic-auth');
const Course = require('../models').Course;
const User = require('../models').User;
const { Op } = require('sequelize');

/*******************************/
// helper functions
/*******************************/

// Async handler function to wrap each route

function asyncHandler(cb){
  return async(req, res, next) => {
    try {
      await cb(req, res, next);
    } catch(error){
      res.status(500).send(error);
    }
  };
}
/*******************************/
// Middleware
/*******************************/

// authenticate the user using Basic Authentication

const authenticateUser = asyncHandler(async (req, res, next) => {
  let message = null;

  // Get the user's credentials from the Authorization header.
  const credentials = auth(req);

  if (credentials) {
    // Look for a user whose `emailAddress` matches the credentials `name` property.
    const user = await User.findOne({ where: { emailAddress:  credentials.name}});
    if (user) {
      const authenticated = bcryptjs
        .compareSync(credentials.pass, user.password);
      if (authenticated) {
        console.log(`Authentication successful for username: ${user.emailAddress}`);

        // Store the user on the Request object.
        req.currentUser = user;
      } else {
        message = `Authentication failure for username: ${user.emailAddress}`;
      }
    } else {
      message = `User not found for username: ${credentials.name}`;
    }
  } else {
    message = 'Auth header not found';
  }

  if (message) {
    console.warn(message);
    res.status(401).json({ message: 'Access Denied' });
  } else {
    next();
  }
});

/*******************************/
// The Routes
/*******************************/

/* GET the current user */
router.get('/users', asyncHandler(async (req, res) => {
/*  const query = { // our query
    order: [['title', 'ASC']], // sort by ascending book title
    limit: booksPerPage, // pagination limit
    offset, // start with this item
    where // include search query if applicable (will be empty if not)
  };
  const results = await User.findAndCountAll(query); */
}));

/* POST a new user */
router.post('/users', (req, res) => {
});

/* GET the list of courses */
router.get('/courses', asyncHandler(async (req, res) => {
  const query = {
    order: [['title', 'ASC']],
    include: [{model: User, as: 'user'}],
  };
  const courses = await Course.findAll(query);
  if (courses) {
    res.json(courses);
  } else { // 
    res.json({message: "No records returned."});
  }
}));

/* POST a new course */
router.post('/courses', (req, res) => {
});
  
/* GET a specific course */
router.get('/courses/:id', asyncHandler(async (req, res) => {
}));

/* PUT (edit) an existing course */
router.put('/courses/:id', asyncHandler(async (req, res) => {
}));

/* DELETE a course */
router.delete('/courses/:id', asyncHandler(async (req, res) => {
}));

module.exports = router;
