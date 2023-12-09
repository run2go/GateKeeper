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

        if (!user) { throw new Error(`User with username ${username} not found.`); }

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
    }
    catch (error) { throw new Error(`Authenticating: ${error.message}`); }
}

async function authCheckAdmin(providedUser) { // Function to check if the provided provided usernames is an admin
    try {
        const user = await maintable.findOne({
            where: {
                username: providedUser,
            },
        });

        if (!user) { throw new Error(`User with username ${username} not found.`); }

        return user.admin; // If the user is found and is an admin, return true; otherwise, return false
    }
    catch (error) { throw new Error(`Admin Check: ${error.message}`); }
}


async function getUserList() { // Function to fetch usernames from the user table
    try {
        const users = await maintable.findAll({
			where: {
				deletedAt: null, // Check if user has not been soft-deleted
			}
		});
        return users.map((user) => user.username);
    }
    catch (error) { throw new Error(`Error fetching user list: ${error.message}`); }
}

async function dataCreate(username, password, isAdmin = false) { // Function to CREATE user entry
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

        if (!created) { // If not created, update the existing user's password and admin status
            user.password = password;
            user.admin = isAdmin;
            await user.save();
        }

        return user;
    }
    catch (error) { throw new Error(`Error creating user ${username}: ${error.message}`); }
}

async function dataRead(username) { // Function to READ user data by username
    try {
        const user = await maintable.findOne({
            where: {
                username: username,
                deletedAt: null,
            },
        });
        return user;
    }
    catch (error) { throw new Error(`Error reading data for username ${username}: ${error.message}`); }
}

async function dataUpdate(username, password, isAdmin = false) { // Function to UPDATE or create user data
    try {
        const user = await maintable.findOne({
            where: {
                username: username,
                deletedAt: null,
            },
            defaults: {
                password: password,
                admin: isAdmin,
            },
        });

        if (user) { // User found, update the password and admin status
            user.password = password;
            user.admin = isAdmin;
            await user.save(); // Save the changes to the database
        }

        return user;
    }
    catch (error) { throw new Error(`Error updating data for username ${username}: ${error.message}`); }
}

async function dataDelete(username) { // Function to DELETE user data by username (soft delete)
    try {
        const user = await maintable.findOne({
            where: {
                username: username,
                deletedAt: null,
            },
        });
		
        if (user) { // Soft delete by setting the current date to the deletedAt data field
            user.deletedAt = new Date();
            await user.save();
        }

        return user;
    }
    catch (error) { throw new Error(`Error removing data for username ${username}: ${error.message}`); }
}

async function dataRestore(username) { // Function to RESTORE user data by username that has been (soft) deleted
    try {
        const user = await maintable.findOne({
            where: {
                username: username,
            },
        });
		
        if (user) { // Reset the deletedAt data field
            user.deletedAt = null;
            await user.save();
        }

        return user;
    }
    catch (error) { throw new Error(`Error restoring data for username ${username}: ${error.message}`); }
}

async function dataDrop(username) { // Function to DROP user data by username (hard delete)
    try {
        const user = await maintable.findOne({
            where: {
                username: username,
            },
        });

        if (!user) { throw new Error(`User with username ${username} not found.`); }

        const result = await maintable.destroy({ // Hard delete the user
            where: {
                username: username,
            },
        });

        if (result === 1) { return user; } // Successfully deleted one user
        else { throw new Error(`Failed to delete user with username ${username}.`); }
    }
    catch (error) { throw new Error(`Error removing data for username ${username}: ${error.message}`); }
}


async function getTableList() { // Function to list all existing table names
    try {
        let query;

        if (dbDialect === 'sqlite') { query = "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'deleted_%'"; } // SQLite-specific table list query
        else { query = "SHOW TABLES LIKE 'deleted_%'"; } // Default SQL query

        const result = await sequelize.query(query, { type: Sequelize.QueryTypes.SELECT }); // Execute the query
        const tables = result.map((row) => (dbDialect === 'sqlite' ? row.name : row[`Tables_in_${dbDatabase}`])); // Extract table names from the result

        return { success: true, data: tables };
    }
    catch (error) { throw new Error(`Error fetching table list: ${error.message}`); }
}

async function tableCreate(tablename, columns) { // Function to CREATE a new table
    try {
        if (tablename === dbMaintable) { throw new Error(`${dbMaintable} is protected`); }
        if (tablename.startsWith("deleted_")) { throw new Error(`Invalid table name: ${tablename}`); }
        else if (!Array.isArray(columns) || columns.length === 0) { throw new Error('Invalid column information');  }

        const columnDefinitions = columns.map(column => { // Construct the column definitions for the SQL query
            const { name, type, options } = column;
            let definition = `${name} ${type}`;
            if (options && options.length > 0) { definition += ` ${options.join(' ')}`; }
            return definition;
        }).join(', ');

        let query; // Construct the CREATE TABLE query
        if (dbDialect === 'sqlite') { query = `CREATE TABLE IF NOT EXISTS ${tablename} (${columnDefinitions})`; }
        else { query = `CREATE TABLE IF NOT EXISTS ${tablename} (${columnDefinitions})`; }

        await sequelize.query(query);
        return { success: true, message: `Table ${tablename} created successfully` };
    }
    catch (error) { throw new Error(`Error creating table: ${error.message}`); }
}

async function tableRead(tablename, row = false) { // Function to READ a specific row or a whole table
    try {
        if (tablename === dbMaintable) { throw new Error(`${dbMaintable} is protected`); }
        if (tablename.startsWith("deleted_")) { throw new Error(`Invalid table name: ${tablename}`); }

        let query = `SELECT * FROM ${tablename}${row ? ' WHERE id = ' + row : ''}`; // Create query to print either a single row or a whole table

        const result = await sequelize.query(query, { type: Sequelize.QueryTypes.SELECT });
        return { success: true, data: result };
    }
    catch (error) { throw new Error(`Error reading table: ${error.message}`); }
}

async function tableUpdate(tablename, row, newData) { // Function to UPDATE an existing table or add new columns
    try {
        if (tablename === dbMaintable) { throw new Error(`${dbMaintable} is protected`); }
        if (tablename.startsWith("deleted_")) { throw new Error(`Invalid table name: ${tablename}`); }
        
        const updateQuery = `UPDATE ${tablename} SET name = :name WHERE id = :id`; // Construct the UPDATE query based on the provided data
        const [updatedRows] = await sequelize.query(updateQuery, { // Execute the UPDATE query with the provided parameters
            replacements: { id: row, name: newData.name },
            type: Sequelize.QueryTypes.UPDATE,
        });

        if (updatedRows > 0) { return { success: true, message: `Row ${row} in table ${tablename} updated successfully` }; } // Check if any rows were updated
        else { return { success: false, message: `No rows updated. Row with id ${row} not found in table ${tablename}` }; }
    }
    catch (error) { throw new Error(`Error updating table: ${error.message}`); }
}

async function tableDelete(tablename, row = false) { // Function to DELETE a row from a table or soft deleting a whole table
    try {
        if (tablename === dbMaintable) { throw new Error(`${dbMaintable} is protected`); }
        if (row) {
            const deleteQuery = `DELETE FROM ${tablename} WHERE id = :id`; // If row is provided, delete the specific row
            const [deletedRows] = await sequelize.query(deleteQuery, {
                replacements: { id: row },
                type: Sequelize.QueryTypes.DELETE,
            });

            if (deletedRows > 0) { return { success: true, message: `Row ${row} deleted successfully from table ${tablename}` }; }
            else { return { success: false, message: `No rows deleted. Row with id ${row} not found in table ${tablename}` }; }
        }
        else {
            const newTablename = `deleted_${tablename}`; // If row is not provided, rename the table with a prefix "deleted_"
            const renameQuery = `ALTER TABLE ${tablename} RENAME TO ${newTablename}`; // Construct the RENAME TABLE query
            await sequelize.query(renameQuery, { type: Sequelize.QueryTypes.RAW });

            return { success: true, message: `Table ${tablename} soft deleted` };
        }
    }
    catch (error) { throw new Error(`Error deleting or renaming table: ${error.message}`); }
}

async function tableRestore(tablename) { // Function to RESTORE a soft-deleted table by removing the "deleted_" prefix
    try {
        if (!tablename.startsWith("deleted_")) { throw new Error(`Invalid table name: ${tablename}`); }

        const originalTablename = tablename.replace(/^deleted_/i, ''); // Remove the "deleted_" prefix to get the original table name
        const originalTableExists = await sequelize.getQueryInterface().showAllTables().then(tables => tables.includes(originalTablename)); // Check if the original table exists

        if (originalTableExists) { throw new Error(`Table ${originalTablename} already exists. Cannot restore the soft-deleted table.`); } // Handle the case when a to be restored table already exists

        const renameQuery = `ALTER TABLE ${tablename} RENAME TO ${originalTablename}`; // Rename the soft-deleted table to the original table name
        await sequelize.query(renameQuery);

        return { success: true, message: `Table ${tablename} restored as ${originalTablename}` };
    }
    catch (error) { throw new Error(`Error restoring table: ${error.message}`); }
}

async function tableDrop(tablename) { // Function to DROP a table
    try {
        if (tablename.startsWith("deleted_")) { throw new Error(`Invalid table name: ${tablename}`); }

        let dropQuery;

        if (dbDialect === 'sqlite') { dropQuery = `DROP TABLE IF EXISTS ${tablename}`; } // SQLite-specific table drop query
        else { dropQuery = `DROP TABLE IF EXISTS ${tablename}`; } // Default SQL table drop query

        await sequelize.query(dropQuery, { type: Sequelize.QueryTypes.RAW }); // Execute the DROP TABLE query

        return { success: true, message: `Table ${tablename} dropped successfully` };
    }
    catch (error) { throw new Error(`Error dropping table: ${error.message}`); }
}


module.exports = { // Export the functions for use in other modules
	authCheck,
    authCheckAdmin,

    getUserList,
	dataCreate,
    dataRead,
    dataUpdate,
    dataDelete,
    dataRestore,
	dataDrop,

    getTableList,
    tableCreate,
    tableRead,
    tableUpdate,
    tableDelete,
    tableRestore,
    tableDrop,
};