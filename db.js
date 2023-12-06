// db.js

// Access parameters in the config.ini file
require('dotenv').config({ path: 'config.ini' });
const dbHost = process.env.DB_HOST;
const dbPort = process.env.DB_PORT;
const dbUsername = process.env.DB_USERNAME;
const dbPassword = process.env.DB_PASSWORD;
const dbDatabase = process.env.DB_DATABASE;

// Use the timestamp methods inside the utility.js file
const console = require('./utility');

// Import Sequelize and the Sequelize model for the "users" table
const { Sequelize, DataTypes } = require('sequelize');

// Create sequelize instance using the config.ini parameters
const sequelize = new Sequelize({
    host: dbHost,
    port: dbPort,
    username: dbUsername,
    password: dbPassword,
    database: dbDatabase,
    dialect: 'mysql',
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

// Define the "users" model
const User = sequelize.define('User', {
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
  },
});

// Sync the model with the database (create or update table)
sequelize.sync();

// Function to fetch usernames from the user table
async function getUserList() {
  try {
    const users = await User.findAll();
    return users.map((user) => user.username);
  } catch (error) {
    throw new Error(`Error fetching user list: ${error.message}`);
  }
}

// Function to get user data by username
async function getData(username) {
  try {
    const user = await User.findOne({
      where: {
        username: username,
      },
    });
    return user;
  } catch (error) {
    throw new Error(`Error getting data for username ${username}: ${error.message}`);
  }
}

// Function to update or create user data
async function updateData(username, password) {
  try {
    const [user, created] = await User.findOrCreate({
      where: {
        username: username,
      },
      defaults: {
        password: password,
      },
    });

    // If not created, update the existing user's password
    if (!created) {
      user.password = password;
      await user.save();
    }

    return user;
  } catch (error) {
    throw new Error(`Error updating or creating data for username ${username}: ${error.message}`);
  }
}

// Function to remove user data by username (soft delete)
async function removeData(username) {
  try {
    const user = await User.findOne({
      where: {
        username: username,
      },
    });

    // Soft delete by setting the "deletedAt" timestamp
    if (user) {
      user.deletedAt = new Date();
      await user.save();
    }

    return user;
  } catch (error) {
    throw new Error(`Error removing data for username ${username}: ${error.message}`);
  }
}

// Export the functions for use in other modules
module.exports = {
  getUserList,
  getData,
  updateData,
  removeData,
};