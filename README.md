# GateKeeper
## _REST-API Bun/Node.js Application_
#### Access your database via a Restful API without exposing it to the internet.

This repository is developed to run in a docker container, but feel free to use the JS application right away.
The REST-API is using the following tools & software:


## Features
Security measures along with CRUD database access.

| Function | Description |
| ------ | ------ |
| Authentication | Make use of access tokens |
| CREATE | Insert a new table row or create a new table |
| READ | Retrieve single table rows or full tables |
| UPDATE | Update a table row or a full table |
| DELETE | (Soft) Delete specified table rows or disable a full table |
| RESTORE | Restore specified table rows or a full table |
| DROP | (Hard) Delete specified table rows or drop a full table |


## Tech

GateKeeper makes use of the following tools & software:

- [Bun] / [Node.js] (JavaScript Runtime Environment)
- [Express.js] (Node Framework)
- [Sequelize] (ORM, Object-Relational Mapping)


## Installation

Build command:
```sh
docker build -t GateKeeper .
```

Start command:
```sh
docker run -d -it --name GateKeeper -p 80:8080 GateKeeper
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