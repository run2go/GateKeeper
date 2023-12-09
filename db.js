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
async function authCheck(providedUser, providedPass) {
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

// Function to check if the provided provided usernames is an admin
async function authCheckAdmin(providedUser) {
    try {
        const user = await maintable.findOne({
            where: {
                username: providedUser,
            },
        });

        if (!user) { // Throw an error indicating the user has not been found
            throw new Error('User not found');
        }

        // If the user is found and is an admin, return true; otherwise, return false
        return user.admin;
    } catch (error) {
        throw new Error(`Admin Check: ${error.message}`);
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

// Function to CREATE user entry
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

// Function to READ user data by username
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

// Function to UPDATE or create user data
async function dataUpdate(username, password, isAdmin = false) {
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

        if (user) {
            // User found, update the password and admin status
            user.password = password;
            user.admin = isAdmin;
            await user.save(); // Save the changes to the database
        }

        return user;
    } catch (error) {
        throw new Error(`Error updating data for username ${username}: ${error.message}`);
    }
}

// Function to DELETE user data by username (soft delete)
async function dataDelete(username) {
    try {
        const user = await maintable.findOne({
            where: {
                username: username,
                deletedAt: null,
            },
        });
		
		// Soft delete by setting the current date to the deletedAt data field
        if (user) {
            user.deletedAt = new Date();
            await user.save();
        }

        return user;
    } catch (error) {
        throw new Error(`Error removing data for username ${username}: ${error.message}`);
    }
}

// Function to RESTORE user data by username that has been (soft) deleted
async function dataRestore(username) {
    try {
        const user = await maintable.findOne({
            where: {
                username: username,
            },
        });
		
		// Reset the deletedAt data field
        if (user) {
            user.deletedAt = null;
            await user.save();
        }

        return user;
    } catch (error) {
        throw new Error(`Error restoring data for username ${username}: ${error.message}`);
    }
}

// Function to DROP user data by username (hard delete)
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

// Function to list all existing table names
async function getTableList() {
    try {
        let query;

        if (dbDialect === 'sqlite') { // SQLite-specific table list query
            query = "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'deleted_%'";
        } else { // Default SQL query
            query = "SHOW TABLES LIKE 'deleted_%'";
        }

        // Execute the query
        const result = await sequelize.query(query, { type: Sequelize.QueryTypes.SELECT });

        // Extract table names from the result
        const tables = result.map((row) => (dbDialect === 'sqlite' ? row.name : row[`Tables_in_${dbDatabase}`]));

        return { success: true, data: tables };
    } catch (error) {
        throw new Error(`Error fetching table list: ${error.message}`);
    }
}


// Function to CREATE a new table
async function tableCreate(tablename, columns) {
    try {
        if (tablename.startsWith("deleted_")) {
            throw new Error(`Invalid table name: ${tablename}`);
        }

        if (!Array.isArray(columns) || columns.length === 0) {
            throw new Error('Invalid column information');
        }

        // Construct the column definitions for the SQL query
        const columnDefinitions = columns.map(column => {
            const { name, type, options } = column;
            let definition = `${name} ${type}`;
            if (options && options.length > 0) {
                definition += ` ${options.join(' ')}`;
            }
            return definition;
        }).join(', ');

        // Construct the CREATE TABLE query
        let query;
        if (dbDialect === 'sqlite') {
            query = `CREATE TABLE IF NOT EXISTS ${tablename} (${columnDefinitions})`;
        } else {
            query = `CREATE TABLE IF NOT EXISTS ${tablename} (${columnDefinitions})`;
        }

        await sequelize.query(query);
        return { success: true, message: `Table ${tablename} created successfully` };
    } catch (error) {
        throw new Error(`Error creating table: ${error.message}`);
    }
}

// Function to READ a specific row or a whole table
async function tableRead(tablename, row = false) {
    try {
        if (tablename.startsWith("deleted_")) {
            throw new Error(`Invalid table name: ${tablename}`);
        }

        // Create query to print either a single row or a whole table
        let query = `SELECT * FROM ${tablename}${row ? ' WHERE id = ' + row : ''}`;

        const result = await sequelize.query(query, { type: Sequelize.QueryTypes.SELECT });
        return { success: true, data: result };
    } catch (error) {
        throw new Error(`Error reading table: ${error.message}`);
    }
}

// Function to UPDATE an existing table or add new columns
async function tableUpdate(tablename, row, newData) {
    try {
        if (tablename.startsWith("deleted_")) {
            throw new Error(`Invalid table name: ${tablename}`);
        }

        // Construct the UPDATE query based on the provided data
        const updateQuery = `UPDATE ${tablename} SET name = :name WHERE id = :id`;

        // Execute the UPDATE query with the provided parameters
        const [updatedRows] = await sequelize.query(updateQuery, {
            replacements: { id: row, name: newData.name },
            type: Sequelize.QueryTypes.UPDATE,
        });

        // Check if any rows were updated
        if (updatedRows > 0) {
            return { success: true, message: `Row ${row} in table ${tablename} updated successfully` };
        } else {
            return { success: false, message: `No rows updated. Row with id ${row} not found in table ${tablename}` };
        }
    } catch (error) {
        throw new Error(`Error updating table: ${error.message}`);
    }
}

// Function to DELETE a row from a table or soft deleting a whole table
async function tableDelete(tablename, row = false) {
    try {
        if (row) {
            // If row is provided, delete the specific row
            const deleteQuery = `DELETE FROM ${tablename} WHERE id = :id`;
            const [deletedRows] = await sequelize.query(deleteQuery, {
                replacements: { id: row },
                type: Sequelize.QueryTypes.DELETE,
            });

            if (deletedRows > 0) {
                return { success: true, message: `Row ${row} deleted successfully from table ${tablename}` };
            } else {
                return { success: false, message: `No rows deleted. Row with id ${row} not found in table ${tablename}` };
            }
        } else {
            // If row is not provided, rename the table with a prefix "deleted_"
            const newTablename = `deleted_${tablename}`;

            // Construct the RENAME TABLE query
            const renameQuery = `ALTER TABLE ${tablename} RENAME TO ${newTablename}`;
            await sequelize.query(renameQuery, { type: Sequelize.QueryTypes.RAW });

            return { success: true, message: `Table ${tablename} soft deleted` };
        }
    } catch (error) {
        throw new Error(`Error deleting or renaming table: ${error.message}`);
    }
}

// Function to RESTORE a soft-deleted table by removing the "deleted_" prefix
async function tableRestore(tablename) {
    try {
        if (!tablename.startsWith("deleted_")) {
            throw new Error(`Invalid table name: ${tablename}`);
        }

        // Remove the "deleted_" prefix to get the original table name
        const originalTablename = tablename.replace(/^deleted_/i, '');

        // Check if the original table exists
        const originalTableExists = await sequelize.getQueryInterface().showAllTables()
            .then(tables => tables.includes(originalTablename));

        if (originalTableExists) { // Handle the case when a to be restored table already exists
            throw new Error(`Table ${originalTablename} already exists. Cannot restore the soft-deleted table.`);
        }

        // Rename the soft-deleted table to the original table name
        const renameQuery = `ALTER TABLE ${tablename} RENAME TO ${originalTablename}`;
        await sequelize.query(renameQuery);

        return { success: true, message: `Table ${tablename} restored as ${originalTablename}` };
    } catch (error) {
        throw new Error(`Error restoring table: ${error.message}`);
    }
}

// Function to DROP a table
async function tableDrop(tablename) {
    try {
        if (tablename.startsWith("deleted_")) {
            throw new Error(`Invalid table name: ${tablename}`);
        }

        let dropQuery;

        if (dbDialect === 'sqlite') { // SQLite-specific table drop query
            dropQuery = `DROP TABLE IF EXISTS ${tablename}`;
        } else { // Default SQL table drop query
            dropQuery = `DROP TABLE IF EXISTS ${tablename}`;
        }

        // Execute the DROP TABLE query
        await sequelize.query(dropQuery, { type: Sequelize.QueryTypes.RAW });

        return { success: true, message: `Table ${tablename} dropped successfully` };
    } catch (error) {
        throw new Error(`Error dropping table: ${error.message}`);
    }
}


// Export the functions for use in other modules
module.exports = {
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