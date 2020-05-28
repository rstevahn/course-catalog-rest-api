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
//const { Op } = require('sequelize');

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
    const user = await User.findOne({ where: {emailAddress:  credentials.name},
                                      attributes: ['id', 'firstName', 'lastName', 'emailAddress', 'password']});
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
router.get('/users', authenticateUser, (req, res) => {
  const user = req.currentUser;

  res.json({
    firstName: user.firstName,
    lastName: user.lastName,
    emailAddress: user.emailAddress
  });

});

/* POST a new user */
router.post('/users', [
  check('firstName')
    .exists({ checkNull: true, checkFalsy: true })
    .withMessage('Please provide a value for "firstName"'),
    check('lastName')
    .exists({ checkNull: true, checkFalsy: true })
    .withMessage('Please provide a value for "lastName"'),
  check('emailAddress')
    .exists({ checkNull: true, checkFalsy: true })
    .withMessage('Please provide a value for "emailAddress"')
    .isEmail()
    .withMessage('Please provide a valid email address for "emailAddress"'),
  check('password')
    .exists({ checkNull: true, checkFalsy: true })
    .withMessage('Please provide a value for "password"')
    .isLength({ min: 8, max: 20 })
    .withMessage('Please provide a value for "password" that is between 8 and 20 characters in length')
], asyncHandler(async (req, res) => {

  // Attempt to get the validation result from the Request object.
  const errors = validationResult(req);

  // If there are validation errors...
  if (!errors.isEmpty()) {
    // Use the Array `map()` method to get a list of error messages.
    const errorMessages = errors.array().map(error => error.msg);

    // Return the validation errors to the client.
    res.status(400).json({ errors: errorMessages });
  } else {
    // Check for unique email address
    const existingUser = await User.findOne({where: {emailAddress:  req.body.emailAddress}});

    if (existingUser) { // error!
      res.status(400).json({ error: '"emailAddress" is already in use'});
    }
    // Get the user from the request body.
    const user = req.body;

    // Hash the new user's password.
    user.password = bcryptjs.hashSync(user.password);

    // Create the user
    try {
      newUser = await User.create(user);
    } catch (error) {
      if(error.name === "SequelizeValidationError") { // checking the error
        res.status(400).json({ error: error.msg });
      } else {
        res.status(500).json({ error: error.msg }); // error caught in the asyncHandler's catch block
      }    
    }

    // Success! Set the status to 201 Created and end the response.
    return res.status(201).end();
  }
}));

/* GET the list of courses */
router.get('/courses', asyncHandler(async (req, res) => {
  const query = {
    order: [['title', 'ASC']],
    include: [{model: User, as: 'user'}],
    attributes: ['id', 'title', 'description', 'estimatedTime', 'materialsNeeded']
  };
  const courses = await Course.findAll(query);
  if (courses) {
    res.json(courses);
  } else { // empty database
    res.json({message: "No records returned."});
  }
}));

/* POST a new course */
router.post('/courses', authenticateUser, [
  check('title')
    .exists({ checkNull: true, checkFalsy: true })
    .withMessage('Please provide a value for "title"'),
  check('description')
    .exists({ checkNull: true, checkFalsy: true })
    .withMessage('Please provide a value for "description"')
  ], asyncHandler(async (req, res) => {

  // Attempt to get the validation result from the Request object.
  const errors = validationResult(req);

  // If there are validation errors...
  if (!errors.isEmpty()) {
    // Use the Array `map()` method to get a list of error messages.
    const errorMessages = errors.array().map(error => error.msg);

    // Return the validation errors to the client.
    res.status(400).json({ errors: errorMessages });
  } else {
    // try to create the user
    try {
      // get the request body
      course = req.body;

      // set the user to the current user
      course.user = req.currentUser.id;
      console.log(course);
      // create the course
      newCourse = await Course.create(course);
      console.log(newCourse);
    } catch (error) {
      if(error.name === "SequelizeValidationError") { // checking the error
        res.status(400).json({ error: error.msg });
      } else {
        res.status(500).json({ error: error.msg }); // error caught in the asyncHandler's catch block
      }    
    }

    // Success! Set the status to 201 Created and end the response.
    return res.status(201).end();
  }
  
  }));
  
/* GET a specific course */
router.get('/courses/:id', asyncHandler(async (req, res) => {
  const course = await Course.findByPk(parseInt(req.params.id));
  if (course) {
    res.json({ title: course.title,
                description: course.description,
                estimatedTime: course.estimatedTime,
                materialsNeeded: course.materialsNeeded});
  } else { // empty database
    res.status(404).json({ error: "no course matches the provided ID" });
  }
}));

/* PUT (edit) an existing course */
router.put('/courses/:id', asyncHandler(async (req, res) => {
}));

/* DELETE a course */
router.delete('/courses/:id', asyncHandler(async (req, res) => {
}));

module.exports = router;
