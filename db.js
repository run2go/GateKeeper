// db.js

// Access parameters in the config.ini file
require('dotenv').config({ path: 'config.ini' });
const dbHost = process.env.DB_HOST;
const dbPort = process.env.DB_PORT;
const dbUsername = process.env.DB_USERNAME;
const dbPassword = process.env.DB_PASSWORD;
const dbDatabase = process.env.DB_DATABASE;
const dbDialect = process.env.DB_DIALECT;
const dbStorage = process.env.DB_STORAGE;
const dbMaintable = process.env.DB_MAINTABLE;

// Use the timestamp methods inside the utility.js file
const console = require('./utility');

// Make us of BCRYPT for password hashing & checking
const bcrypt = require('bcrypt');

// Import Sequelize and the Sequelize model for the "users" table
const { Sequelize, DataTypes } = require('sequelize');

// Create sequelize instance using the config.ini parameters
const sequelize = new Sequelize({
    host: dbHost,
    port: dbPort,
    username: dbUsername,
    password: dbPassword,
    database: dbDatabase,
    dialect: dbDialect,
    storage: dbStorage,
    pool: {
      max: 10,
      min: 0,
      acquire: 30000,
      idle: 10000,
    },
    timestamps: true,
    paranoid: true,
    logging: (msg) => console.log(`[SQL] ${msg}`),
});

// Global error handler for Sequelize
sequelize.sync().catch((error) => {
    console.error(`Sequelize synchronization error: ${error.message}`);
});

// Define the "maintable" model containing the users
const maintable = sequelize.define(dbMaintable, {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    username: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    admin: {
      type: DataTypes.BOOLEAN,
      defaultValue: 0,
      allowNull: true,
    },
    createdAt: {
      type: DataTypes.DATE,
      defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      allowNull: false,
    },
    updatedAt: {
      type: DataTypes.DATE,
      defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      allowNull: false,
    },
    deletedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    }
},{
    tableName: dbMaintable, // Defining main table name
});

// Sync the model with the database (create or update table)
sequelize.sync();

// Function to authenticate provided usernames using bcrypt to compare password hashes
async function auth(providedUser, providedPass) {
    try {
        const user = await maintable.findOne({
            where: {
                username: providedUser,
            },
        });

        if (!user) {
            throw new Error('User not found');
        }

        const storedHash = user.password;

		// Debugging, allow plain passwords to be stored & compared
        /*return new Promise((resolve, reject) => {
            bcrypt.compare(providedPass, storedHash, function(err, result) {
                if (err) {
                    reject(new Error(`Error comparing passwords: ${err.message}`));
                } else {
                    resolve(result);
                }
            });
        });*/
		return result = providedPass === storedHash;
    } catch (error) {
        throw new Error(`Authenticating: ${error.message}`);
    }
}

// Function to fetch usernames from the user table
async function getUserList() {
    try {
        const users = await maintable.findAll({
			where: {
				deletedAt: null, // Check if user has not been soft-deleted
			}
		});
        return users.map((user) => user.username);
    } catch (error) {
        throw new Error(`Error fetching user list: ${error.message}`);
    }
}

// Function to create user entry
async function dataCreate(username, password, isAdmin = false) {
    try {
        const [user, created] = await maintable.findOrCreate({
            where: {
                username: username,
                deletedAt: null,
            },
            defaults: {
                password: password,
                admin: isAdmin,
            },
        });

        // If not created, update the existing user's password and admin status
        if (!created) {
            user.password = password;
            user.admin = isAdmin;
            await user.save();
        }

        return user;
    } catch (error) {
        throw new Error(`Error creating user ${username}: ${error.message}`);
    }
}

// Function to get user data by username
async function dataRead(username) {
    try {
        const user = await maintable.findOne({
            where: {
                username: username,
                deletedAt: null,
            },
        });
        return user;
    } catch (error) {
        throw new Error(`Error reading data for username ${username}: ${error.message}`);
    }
}

// Function to update or create user data
async function dataUpdate(username, password, isAdmin = false) {
    try {
        const [user, created] = await maintable.findOrCreate({
            where: {
                username: username,
                deletedAt: null,
            },
            defaults: {
                password: password,
                admin: isAdmin,
            },
        });

        // If not created, update the existing user's password and admin status
        if (!created) {
            user.password = password;
            user.admin = isAdmin;
            await user.save();
        }

        return user;
    } catch (error) {
        throw new Error(`Error updating data for username ${username}: ${error.message}`);
    }
}

// Function to remove user data by username (soft delete)
async function dataRemove(username) {
    try {
        const user = await maintable.findOne({
            where: {
                username: username,
                deletedAt: null,
            },
        });
		
		// Soft delete by setting the current date to the deletedAt data  field
        if (user) {
            user.deletedAt = new Date();
            await user.save();
        }

        return user;
    } catch (error) {
        throw new Error(`Error removing data for username ${username}: ${error.message}`);
    }
}

// Function to remove user data by username (hard delete)
async function dataDrop(username) {
    try {
        const user = await maintable.findOne({
            where: {
                username: username,
            },
        });

        // Check if the user exists
        if (!user) {
            throw new Error(`User with username ${username} not found.`);
        }

        // Hard delete the user
        const result = await maintable.destroy({
            where: {
                username: username,
            },
        });

        if (result === 1) {
            // Successfully deleted one user
            return user;
        } else {
            throw new Error(`Failed to delete user with username ${username}.`);
        }
    } catch (error) {
        throw new Error(`Error removing data for username ${username}: ${error.message}`);
    }
}

// Export the functions for use in other modules
module.exports = {
	auth,
    getUserList,
	dataCreate,
    dataRead,
    dataUpdate,
    dataRemove,
	dataDrop,
};