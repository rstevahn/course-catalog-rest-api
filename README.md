
#  Course Catalog REST API
## Treehouse Full Stack JavaScript Techdegree Unit 9

This project was graded **Exceeds Expectations**.

Extra Credit Features Included:

* The `GET /api/users` route filters out the following attributes: `password`, `createdAt` and `updatedAt`.
* The `GET /api/courses` and `api/courses/:id` routes filter out the following attributes: `createdAt` and `updatedAt`.
* The `PUT /api/courses/:id` and `DELETE /api/courses/:id` routes return a 403 status code if the current user doesn't own the requested course.
* The `POST /api/users` route validates that the provided email address is a valid email address and isn't already associated with an existing user.

## Getting Started

To get up and running with this project, run the following commands from the root of the folder that contains this README file.

First, install the project's dependencies using `npm`.

```
npm install

```

Second, seed the SQLite database.

```
npm run seed
```

And lastly, start the application.

```
npm start
```

To test the Express server, browse to the URL [http://localhost:5000/](http://localhost:5000/).
