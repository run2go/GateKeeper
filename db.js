// db.js

require('dotenv').config({ path: 'config.ini' }); // Access parameters in the config.ini file
const dbHost = process.env.DB_HOST;
const dbPort = process.env.DB_PORT;
const dbUsername = process.env.DB_USERNAME;
const dbPassword = process.env.DB_PASSWORD;
const dbDatabase = process.env.DB_DATABASE;
const dbDialect = process.env.DB_DIALECT;
const dbStorage = process.env.DB_STORAGE;
const dbMaintable = process.env.DB_MAINTABLE;

const console = require('./utility'); // Use the timestamp methods inside the utility.js file

const bcrypt = require('bcrypt'); // Make us of BCRYPT for password hashing & checking

const { Sequelize, DataTypes } = require('sequelize'); // Import Sequelize and the Sequelize model for the "users" table
const sequelize = new Sequelize({ // Create sequelize instance using the config.ini parameters
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
sequelize.sync().catch((error) => { console.error(`Sequelize synchronization error: ${error.message}`); }); // Global error handler for Sequelize

const maintable = sequelize.define(dbMaintable, { // Define the "maintable" model containing the users
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

sequelize.sync(); // Sync the model with the database (create or update table)

async function authCheck(providedUser, providedPass) { // Function to authenticate provided usernames using bcrypt to compare password hashes
    try {
        const user = await maintable.findOne({
            where: {
                username: providedUser,
            },
        });

        let storedPass;
		if (user) { storedPass = user.password }
		else { throw new Error(`Missing user: ${error.message}`); }

		return (providedPass === storedPass);
    }
    catch (error) { throw new Error(`Authenticating: ${error.message}`); }
}

async function getUserData() { // Function to fetch userdata from the maintable
  try {
    const users = await maintable.findAll();

    return users.map((user) => ({ // Map users to include "username," "password," and "admin" information
      username: user.username,
      password: user.password,
      admin: user.admin,
	  deleted: user.deletedAt
    }));
  }
  catch (error) { throw new Error(`Error fetching userlist: ${error.message}`); }
}

async function getTableData() { // Function to list all existing table names
    try {
        let query;

        if (dbDialect === 'sqlite') { query = "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'deleted_%'"; } // SQLite-specific table list query
        else { query = "SHOW TABLES LIKE 'deleted_%'"; } // Default SQL query

        const result = await sequelize.query(query, { type: Sequelize.QueryTypes.SELECT }); // Execute the query
        const tables = result.map((row) => (dbDialect === 'sqlite' ? row.name : row[`Tables_in_${dbDatabase}`])); // Extract table names from the result

        return tables;
    }
    catch (error) { throw new Error(`Error fetching table list: ${error.message}`); }
}

/* Maintable Operations */
async function dataCreate(username, password, isAdmin = false) { // Function to CREATE user entry
    try {
        const result = await sequelize.transaction(async (t) => {
            const [user, created] = await maintable.findOrCreate({
                where: {
                    username: username,
                    deletedAt: null,
                },
                defaults: {
                    password: password,
                    admin: isAdmin,
                },
                transaction: t,
            });

            if (!created) { // If not created, update the existing user's password and admin status
                user.password = password;
                user.admin = isAdmin;
                await user.save({ transaction: t });
            }

            return user;
        });
        return result;
    } catch (error) { throw new Error(`Error creating user '${username}': ${error.message}`); }
}

async function dataRead(username) { // Function to READ user data by username
    try {
        const result = await sequelize.transaction(async (t) => {
            const user = await maintable.findOne({
                where: {
                    username: username,
                    deletedAt: null,
                },
                transaction: t,
            });

            if (!user) { throw new Error(`User with username '${username}' not found.`); }

            return user;
        });
        return result;
    } catch (error) { throw new Error(`Error reading data for username '${username}': ${error.message}`); }
}

async function dataUpdate(username, password, isAdmin = false) { // Function to UPDATE or create user data
    try {
        const result = await sequelize.transaction(async (t) => {
            const user = await maintable.findOne({
                where: {
                    username: username,
                    deletedAt: null,
                },
                transaction: t,
                defaults: {
                    password: password,
                    admin: isAdmin,
                },
            });

            if (user) {
                // User found, update the password and admin status
                user.password = password;
                user.admin = isAdmin;
                await user.save({ transaction: t }); // Save the changes to the database
            }

            return user;
        });
        return result;
    } catch (error) { throw new Error(`Error updating data for username '${username}': ${error.message}`); }
}

async function dataDelete(username) { // Function to DELETE user data by username (soft delete)
    try {
        const result = await sequelize.transaction(async (t) => {
            const user = await maintable.findOne({
                where: {
                    username: username,
                    deletedAt: null,
                },
                transaction: t,
            });

            if (user) {
                // Soft delete by setting the current date to the deletedAt data field
                user.deletedAt = new Date();
                await user.save({ transaction: t });
            }

            return user;
        });
        return result;
    } catch (error) { throw new Error(`Error removing data for username '${username}': ${error.message}`); }
}

async function dataRestore(username) { // Function to RESTORE user data by username that has been (soft) deleted
    try {
        const result = await sequelize.transaction(async (t) => {
            const user = await maintable.findOne({
                where: {
                    username: username,
                },
                transaction: t,
            });

            if (user) { // Reset the deletedAt data field
                user.deletedAt = null;
                await user.save({ transaction: t });
            }

            return user;
        });
        return result;
    } catch (error) { throw new Error(`Error restoring data for username '${username}': ${error.message}`); }
}

async function dataDrop(username) { // Function to DROP user data by username (hard delete)
    try {
        const result = await sequelize.transaction(async (t) => {
            const user = await maintable.findOne({
                where: {
                    username: username,
                },
                transaction: t,
            });

            if (!user) { throw new Error(`User with username '${username}' not found.`); }

            await maintable.destroy({
                where: {
                    username: username,
                },
                transaction: t,
            });

            return user;
        });
        return result;
    } catch (error) { throw new Error(`Error removing data for username '${username}': ${error.message}`); }
}

/* Table Operations */
async function tableCreate(tablename, jsonData) { // Function to CREATE a new table
    try {
        const result = await sequelize.transaction(async (t) => {
            if (tablename === dbMaintable) { throw new Error(`${dbMaintable} is protected`); }
            else if (tablename.startsWith("deleted_")) { throw new Error(`Invalid table name: ${tablename}`); }
            else if (!jsonData) { throw new Error(`No table data provided`); }

            const { data } = jsonData.create;
            data.deletedAt = { // Add the deletedAt column to support soft deleting
                type: DataTypes.DATE,
                allowNull: true,
            };

            const dynamicModel = sequelize.define(tablename, data); // Define the model dynamically
            await dynamicModel.sync({ alter: true, transaction: t }); // Synchronize the model with the database to create the table
            return { success: true, message: `Table '${tablename}' created and data inserted successfully` };
        });
        return result;
    } catch (error) { throw new Error(`Error creating table: ${error.message}`); }
}

async function tableRead(tablename, id = false) { // Function to READ a specific row or a whole table
    try {
        const result = await sequelize.transaction(async (t) => {
            if (tablename === dbMaintable) { throw new Error(`'${dbMaintable}' is protected`); }
            if (tablename.startsWith("deleted_")) { throw new Error(`Invalid table name: ${tablename}`); }

            let query = `SELECT * FROM ${tablename}${id ? ' WHERE id = ' + id : ''}`; // Create query to print either a single row or a whole table

            const result = await sequelize.query(query, { type: Sequelize.QueryTypes.SELECT, transaction: t });
            return { success: true, data: result };
        });
        return result;
    } catch (error) { throw new Error(`Error reading table: ${error.message}`); }
}

async function tableUpdate(tablename, id, newData) { // Function to UPDATE an existing table or add new columns
    try {
        const result = await sequelize.transaction(async (t) => {
            if (tablename === dbMaintable) { throw new Error(`'${dbMaintable}' is protected`); }
            if (tablename.startsWith("deleted_")) { throw new Error(`Invalid table name: ${tablename}`); }

            const updateQuery = `UPDATE ${tablename} SET name = :name WHERE id = :id`; // Construct the UPDATE query based on the provided data
            const [updatedRows] = await sequelize.query(updateQuery, { // Execute the UPDATE query with the provided parameters
                replacements: { id: id, name: newData.name },
                type: Sequelize.QueryTypes.UPDATE,
                transaction: t,
            });

            if (updatedRows > 0) { return { success: true, message: `ID ${id} in table ${tablename} updated successfully` }; }
			else { return { success: false, message: `No rows updated. Row with ID ${id} not found in table ${tablename}` }; }
        });
        return result;
    } catch (error) { throw new Error(`Error updating table: ${error.message}`); }
}

async function tableDelete(tablename, id = false) { // Function to DELETE a row from a table or soft deleting a whole table
    try {
        const result = await sequelize.transaction(async (t) => {
            if (tablename === dbMaintable) { throw new Error(`'${dbMaintable}' is protected`); }

            if (id) {
                const deleteQuery = `DELETE FROM ${tablename} WHERE id = ${id}`; // If row is provided, delete the specific row
                const [deletedRows] = await sequelize.query(deleteQuery, {
                    replacements: { id: id },
                    type: Sequelize.QueryTypes.DELETE,
                    transaction: t,
                });

                if (deletedRows > 0) { return { success: true, message: `Row ${id} deleted successfully from table ${tablename}` };
                } else { return { success: false, message: `No rows deleted. Row with id ${row} not found in table ${tablename}` }; }
            } else {
                const newTablename = `deleted_${tablename}`; // If row is not provided, rename the table with a prefix "deleted_"
                const renameQuery = `ALTER TABLE ${tablename} RENAME TO ${newTablename}`; // Construct the RENAME TABLE query
                await sequelize.query(renameQuery, { type: Sequelize.QueryTypes.RAW, transaction: t });

                return { success: true, message: `Table '${tablename}' soft deleted` };
            }
        });
        return result;
    } catch (error) { throw new Error(`Error deleting or renaming table: ${error.message}`); }
}

async function tableRestore(tablename) { // Function to RESTORE a soft-deleted table by removing the "deleted_" prefix
    try {
        const result = await sequelize.transaction(async (t) => {
            const originalTablename = tablename.replace(/^deleted_/i, ''); // Remove the "deleted_" prefix to get the original table name
            const originalTableExists = await sequelize.getQueryInterface().showAllTables().then(tables => tables.includes(originalTablename)); // Check if the original table exists

            if (originalTableExists) { throw new Error(`Table '${originalTablename}' already exists. Cannot restore the soft-deleted table.`); } // Handle the case when a to-be-restored table already exists

            const renameQuery = `ALTER TABLE ${tablename} RENAME TO ${originalTablename}`; // Rename the soft-deleted table to the original table name
            await sequelize.query(renameQuery, { type: Sequelize.QueryTypes.RAW, transaction: t });

            return { success: true, message: `Table '${tablename}' restored as ${originalTablename}` };
        });
        return result;
    } catch (error) { throw new Error(`Error restoring table: ${error.message}`); }
}

async function tableDrop(tablename) { // Function to DROP a table
    try {
        const result = await sequelize.transaction(async (t) => {
            let dropQuery = `DROP TABLE IF EXISTS ${tablename}`;
            await sequelize.query(dropQuery, { type: Sequelize.QueryTypes.RAW, transaction: t });

            return { success: true, message: `Table '${tablename}' dropped successfully` };
        });
        return result;
    } catch (error) { throw new Error(`Error dropping table: ${error.message}`); }
}

module.exports = { // Export the functions for use in other modules
	authCheck,
    getUserData,
    getTableData,
	
	dataCreate,
    dataRead,
    dataUpdate,
    dataDelete,
    dataRestore,
	dataDrop,

    tableCreate,
    tableRead,
    tableUpdate,
    tableDelete,
    tableRestore,
    tableDrop,
};