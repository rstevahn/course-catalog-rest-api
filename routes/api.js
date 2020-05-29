// jshint esversion: 9

// API Routes

// dependencies

const express = require('express');
const router = express.Router();
const { check, validationResult } = require('express-validator/check');
const bcryptjs = require('bcryptjs');
const auth = require('basic-auth');
const Course = require('../models').Course;
const User = require('../models').User;

// globals

const userValidation = [ // user validation array, used by POST /api/users
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
];

const courseValidation = [ // course validation array, used by POST /api/courses and PUT /api/courses/:id
  check('title')
    .exists({ checkNull: true, checkFalsy: true })
    .withMessage('Please provide a value for "title"'),
  check('description')
    .exists({ checkNull: true, checkFalsy: true })
    .withMessage('Please provide a value for "description"')
];

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

// check for and handle validation errors
// returns TRUE if there were errors 

function validationErrors(req, res){

  // get the validation result from the Request object.
  const errors = validationResult(req);

  // If there are validation errors...
  if (!errors.isEmpty()) {

    // Use the Array `map()` method to get a list of error messages.
    const errorMessages = errors.array().map(error => error.msg);

    // Return the validation errors to the client.
    res.status(400).json({ errors: errorMessages });

    return true; // there were errors
  } else {
    return false; // there were no errors
  }
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

      // compare the passwords
      const authenticated = bcryptjs.compareSync(credentials.pass, user.password);

      if (authenticated) { // all good
        console.log(`Authentication successful for username: ${user.emailAddress}`);

        // save the user in the Request object.
        req.currentUser = user;
      } else { // authentication error
        message = `Authentication failure for username: ${user.emailAddress}`;
      }
    } else { // no such user
      message = `User not found for username: ${credentials.name}`;
    }
  } else { // missing authorization header
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

/* GET the current user (with authentication) */

router.get('/users', authenticateUser, (req, res) => {
  const user = req.currentUser; // we won't get here if the user isn't authorized

  // return the user, omitting the password. Time stamps were omitted from the auth query.

  res.status(200).json({
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    emailAddress: user.emailAddress
  });

});

/* POST a new user with validation. No authentication required. */

router.post('/users', userValidation, asyncHandler(async (req, res) => {
  
  // check for validation errors
  if (!validationErrors(req, res)) { // the coast is clear

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

    // Success! 

    // Set the location header to '/'

    res.header('Location', '/');
    
    // Set the status to 201 Created and end the response.
    return res.status(201).end();
  }
}));

/* GET the list of courses. No authentication required. */

router.get('/courses', asyncHandler(async (req, res) => {

  // construct the query
  const query = {
    order: [['title', 'ASC']],
    include: [{ model: User, 
                as: 'user',
                attributes: {exclude: ['createdAt', 'updatedAt', 'password']}
              }],
    attributes: {exclude: ['createdAt', 'updatedAt']}
  };

  // get the courses
  const courses = await Course.findAll(query);

  if (courses) { // return the courses
    res.status(200).json(courses);
  } else { // empty database
    res.status(200).json({message: "The course database is currently empty"});
  }
}));

/* POST a new course with authentication and validation */

router.post('/courses', authenticateUser, courseValidation, asyncHandler(async (req, res) => {

  // check for validation errors
  if (!validationErrors(req, res)) { // the coast is clear

    // try to create the user
    try {

      // get the request body
      const course = req.body;

      // set the user ID to the current user. This is a design choice that prevents the creation of a course
      // by proxy. To allow that, I'd need to validate the incoming userId.

      course.userId = req.currentUser.id;

      // create the course
      newCourse = await Course.create(course);

    } catch (error) {
      if(error.name === "SequelizeValidationError") { 
        res.status(400).json({ error: error.msg }); // SQL validation error
      } else {
        res.status(500).json({ error: error.msg }); // error caught in the asyncHandler's catch block
      }    
    }

    // Success! 

    // set the location header to the new URI

    res.header('Location','api/courses/' + newCourse.id);
    
    // Set the status to 201 Created and end the response.
    return res.status(201).end();
  }
  
}));
  
/* GET a specific course by ID. No authentication required. */

router.get('/courses/:id', asyncHandler(async (req, res) => {

  // construct the query
  const query = {
    where: {id: req.params.id},
    include: [{ model: User, 
                as: 'user',
                attributes: {exclude: ['createdAt', 'updatedAt', 'password']}
              }],
    attributes: {exclude: ['createdAt', 'updatedAt']}
  };
  
  // try to retrieve the course
  const course = await Course.findOne(query);
  if (course) {

    // return the course, less the time stamps
    res.json(course);

  } else { // no match

    res.status(404).json({ error: "no course matches the provided ID" });
  }
}));

/* PUT (edit) an existing course (with authentication and validation */

router.put('/courses/:id', authenticateUser, courseValidation, asyncHandler(async (req, res) => {

  // check for validation errors
  if (!validationErrors(req, res)) { // the coast is clear

    // try to update the course
    try {

      // verify the course
      let course = await Course.findByPk(parseInt(req.params.id));

      if (!course) {
        res.status(404).json({error: "there is no existing course with that ID"});
      }

      // verify the user
      if (course.userId != req.currentUser.id) {
        res.status(403).json({error: "authorized user does not own this course"});
      }

      // get the request body
      course = req.body;

      // force the user to be the current user (it would be possible to provide proper authorization
      // and then change the owner. I have chosen to prevent this. Alternatively I could check for a 
      // valid owner and allow the change if valid.)

      course.userId = req.currentUser.id;

      // update the course (only update what was provided)
      await Course.update(course, {where: {id: parseInt(req.params.id)}});

    } catch (error) {
      if(error.name === "SequelizeValidationError") { 
        res.status(400).json({ error: error.msg }); // SQL validation error
      } else {
        res.status(500).json({ error: error.msg }); // error caught in the asyncHandler's catch block
      }    
    }

    // Success! Set the status to 204 No Content and end the response.
    return res.status(204).end();
  }
  
  }));

/* DELETE a course (with authentication) */

router.delete('/courses/:id', authenticateUser, asyncHandler(async (req, res) => {

    // try to delete the course
    try {

      // verify the course
      let course = await Course.findByPk(parseInt(req.params.id));

      if (!course) {
        res.status(404).json({error: "there is no existing course with that ID"});
      }

      // verify the user
      if (course.userId != req.currentUser.id) {
        res.status(403).json({error: "authorized user does not own this course"});
      }

      // delete the course
      await Course.destroy({where: {id: parseInt(req.params.id)}});

    } catch (error) {
        res.status(500).json({ error: error.msg }); // error caught in the asyncHandler's catch block   
    }

    // Success! Set the status to 204 No Content and end the response.
    return res.status(204).end();
  }
));

module.exports = router;
