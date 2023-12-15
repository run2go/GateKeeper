# GateKeeper
## _REST-API Bun/Node.js Application_
#### Access your database via a Restful API without exposing it to the internet.

This repository is developed to run in a docker container, but feel free to use the JS application right away.
The REST-API is using the following tools & software:


## Features
Security measures along with CRUD database access.


User Management (Admins only)

| Function | Description |
| ------ | ------ |
| CREATE | Create new user/admin accounts |
| READ | Print currently stored user data |
| UPDATE | Update passwords/admin flag |
| DELETE | (Soft) Delete accounts |
| RESTORE | Restore (soft) deleted accounts |
| DROP | (Hard) Delete accounts |


Data Management

| Function | Description |
| ------ | ------ |
| CREATE | Create a new table using provided data |
| READ | Print a full table or filter by arguments |
| ADD | Add a new row to an existing table |
| UPDATE | Edit an entry inside a table row |
| DELETE | (Soft) Delete table rows or disable a full table |
| RESTORE | Restore specified table rows or a full table |
| DROP | (Hard) Delete table rows or drop a full table |


## Tech

GateKeeper makes use of the following tools & software:

- [Bun] / [Node.js] (JavaScript Runtime Environment)
- [Express.js] (Node Framework)
- [Sequelize] (ORM, Object-Relational Mapping)


## Installation

Build command:
```sh
docker build -t gatekeeper_image .
```

Start command:
```sh
docker run -d -it --name GateKeeper -p 80:8080 gatekeeper_image start
```

Container commands:
```sh
docker exec -it GateKeeper start
docker exec -it GateKeeper stop
docker exec -it GateKeeper restart
```


## License

MIT


[//]: #
   [bun]: <https://bun.sh>
   [node.js]: <http://nodejs.org>
   [express.js]: <http://expressjs.com>
   [sequelize]: <http://sequelize.org>