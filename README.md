# GateKeeper
## _REST-API Node.js Application_
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

- [Node.js] (JavaScript Runtime Environment)
- [Express.js] (Node Framework)
- [Sequelize] (ORM, Object-Relational Mapping)


## Installation

Build command:
```sh
docker build -t gatekeeper_image .
```

Start command:
```sh
docker run -d -it --name gatekeeper -p 80:8080 -v "/host/dir/to/config.ini":"/app/config.ini" gatekeeper_image
```

Access console:
```sh
docker attach gatekeeper
```

Detach key sequence:
`CTRL+P + CTLR+Q `


## Fail2Ban Example

Filter:
```sh
# /etc/fail2ban/filter.d/gatekeeper.conf

[Definition]
failregex = \[\S+ \S+\] \[IP\] "<HOST>" \[TYPE\] "\S+" \[AUTH\] "\S+" \[USER-AGENT\] "\S+" \[CONTENT-TYPE\] "\S+" \[STATUS\] "((?!200)\d{3})"
ignoreregex =
```

Jail:
```sh
# /etc/fail2ban/jail.d/gatekeeper.conf

[gatekeeper]
enabled = true
filter = gatekeeper
logpath = /path/to/gatekeeper/logfile
maxretry = 3
bantime = 3600
findtime = 600
```


## License

MIT

[//]: #
   [node.js]: <http://nodejs.org>
   [express.js]: <http://expressjs.com>
   [sequelize]: <http://sequelize.org>