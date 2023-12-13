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
const printQueriesEnabled = (process.env.PRINT_QUERIES === "true");

const console = require('./log.js'); // Use the logging functions inside the log.js file

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
    logging: ((printQueriesEnabled) ? (msg) => console.log(`[SQL] ${msg}`) : false),
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

async function getUserData() { // Fetch userdata from the maintable
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

async function getTableData() { // List all existing table names
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

async function rawQuery(query) { // Execute raw SQL queries
    try {
        const result = await sequelize.query(query, { type: Sequelize.QueryTypes.SELECT });
        return result;
    }
    catch (error) { throw new Error(`Error processing raw SQL: ${error.message}`); }
}

async function handleUser(action, username, password, isAdmin = false) { // User Management
    try {
        const bcrypt = require('bcrypt');
        const datetime = new Date();
        let result;

        switch (action) {
            case 'create':
                if (userList.includes(username)) { throw new Error(`User '${username}' already exists`); }
                const hash = await bcrypt.hash(password, 10);
                result = await sequelize.transaction(async (t) => {
                    const user = await maintable.create(
                        { username: username, password: hash, admin: isAdmin, createdAt: datetime, updatedAt: datetime },
                        { transaction: t });
                    await userListUpdate();
                    return `User '${username}' created at '${datetime.toISOString()}'`;
                });
                break;

            case 'read':
                result = await sequelize.transaction(async (t) => {
                    const user = await maintable.findOne(
                        { where: { username: username }, transaction: t });
                    return user;
                });
                break;

            case 'update':
				if (!userList.includes(username)) { throw new Error(`User '${username}' not found`); }
                const hashUpdate = password ? await bcrypt.hash(password, 10) : null;
                result = await sequelize.transaction(async (t) => {
                    let values = { admin: isAdmin, updatedAt: datetime };
                    if (password) { values.password = hashUpdate; }
                    const user = await maintable.update(
                        values,
                        { where: { username: username }, transaction: t });
                    await userListUpdate();
                    return `User '${username}' updated at '${datetime.toISOString()}'`;
                });
                break;

            case 'delete':
				if (!userList.includes(username)) { throw new Error(`User '${username}' not found`); }
				if (userListDeleted.includes(username)) { throw new Error(`User '${username}' already deleted`); }
                result = await sequelize.transaction(async (t) => {
                    const user = await maintable.update(
                        { deletedAt: datetime },
                        { where: { username: username }, transaction: t });
                    await userListUpdate();
                    return `User '${username}' deleted at '${datetime.toISOString()}'`;
                });
                break;

            case 'restore':
                    if (!userListDeleted.includes(username)) { throw new Error(`User '${username}' not found in deleted users`); }
                result = await sequelize.transaction(async (t) => {
                    const user = await maintable.update(
                        { updatedAt: datetime, deletedAt: null },
                        { where: { username: username }, transaction: t });
                    await userListUpdate();
                    return `User '${username}' restored at '${datetime.toISOString()}'`;
                });
                break;

            case 'drop':
				if (!userList.includes(username)) { throw new Error(`User '${username}' not found`); }
                result = await sequelize.transaction(async (t) => {
                    await maintable.destroy(
                        { where: { username: username }, transaction: t });
                    await userListUpdate();
                    return `User '${username}' dropped at '${datetime.toISOString()}'`;
                });
                break;

            default: throw new Error('Invalid action');
        }

        return result;
    } catch (error) { throw new Error(`Error handling user data: ${error.message}`); }
}

async function handleTable(action, table, data) { // Table Management
    try {
        const datetime = new Date();
        let result;
		
        switch (action) {
            case 'create':
				if (tableList.includes(table)) { throw new Error(`Table '${table}' already exists`); }
                else if (table.startsWith("deleted_")) { throw new Error(`Table name '${table}' is invalid`); }
                const createResult = await sequelize.transaction(async (t) => {
                    const dynamicModel = sequelize.define(table, data, { tableName: table });
                    await dynamicModel.sync({ alter: true, transaction: t });
                    await tableListUpdate();

                    return { success: true, message: `Table '${table}' created and data inserted at ${datetime}` };
                });
                return createResult;

            case 'read':
                const readResult = await sequelize.transaction(async (t) => {
                    const dynamicModel = sequelize.define(table, {});
                    await dynamicModel.sync({ transaction: t });

                    const rows = await dynamicModel.findAll({ transaction: t });
                    return { success: true, data: rows };
                });
                return readResult;

            case 'update':
				if (!tableList.includes(table)) { throw new Error(`Table '${table}' not found`); }
                const updateResult = await sequelize.transaction(async (t) => {
                    const dynamicModel = sequelize.define(table, data, { tableName: table });
                    await dynamicModel.sync({ alter: true, transaction: t });

                    return { success: true, message: `Table '${table}' updated successfully` };
                });
                return updateResult;

            case 'delete':
				if (!tableList.includes(table)) { throw new Error(`Table '${table}' not found`); }
                const deleteResult = await sequelize.transaction(async (t) => {
                    const newTablename = `deleted_${table}`;
                    const renameQuery = `ALTER TABLE ${table} RENAME TO ${newTablename}`;
                    await sequelize.query(renameQuery, { type: Sequelize.QueryTypes.RAW, transaction: t });
                    await tableListUpdate();

                    return { success: true, message: `Table '${table}' soft deleted` };
                });
                return deleteResult;

            case 'restore':
				if (!tableList.includes(table)) { throw new Error(`Table '${table}' not found`); }
                const restoreResult = await sequelize.transaction(async (t) => {
                    const originalTablename = table.replace(/^deleted_/i, '');
                    const originalTableExists = await sequelize.getQueryInterface().showAllTables().then(tables => tables.includes(originalTablename));

                    if (originalTableExists) { throw new Error(`Table '${originalTablename}' already exists. Cannot restore the soft-deleted table.`); }

                    const renameQuery = `ALTER TABLE ${table} RENAME TO ${originalTablename}`;
                    await sequelize.query(renameQuery, { type: Sequelize.QueryTypes.RAW, transaction: t });
                    await tableListUpdate();

                    return { success: true, message: `Table '${table}' restored as ${originalTablename}` };
                });
                return restoreResult;

            case 'drop':
				if (!tableList.includes(table)) { throw new Error(`Table '${table}' not found`); }
                const dropResult = await sequelize.transaction(async (t) => {
                    let dropQuery = `DROP TABLE IF EXISTS ${table}`;
                    await sequelize.query(dropQuery, { type: Sequelize.QueryTypes.RAW, transaction: t });
                    await tableListUpdate();

                    return { success: true, message: `Table '${table}' dropped successfully` };
                });
                return dropResult;

            default: throw new Error('Invalid action');
        }
		
        return result;
    } catch (error) { throw new Error(`Error handling table: ${error.message}`); }
}

async function handleData(action, tablename, tabledata, id = false) { // Handle Table Data
    try {
        const datetime = new Date();
        let result;
		
        switch (action) {
            case 'create':
                const createResult = await sequelize.transaction(async (t) => {
                    if (tablename === dbMaintable) {
                        throw new Error(`${dbMaintable} is protected`);
                    } else if (tablename.startsWith("deleted_")) {
                        throw new Error(`Invalid table name: ${tablename}`);
                    } else if (!tabledata) {
                        throw new Error(`Invalid table data provided`);
                    }

                    tabledata.deletedAt = {
                        type: DataTypes.DATE,
                        allowNull: true,
                    };
                    const { content } = tabledata;
                    const dynamicModel = sequelize.define(tablename, tabledata, { tableName: tablename, });
                    await dynamicModel.sync({ alter: true, transaction: t });

                    return { success: true, message: `Table '${tablename}' created and data inserted successfully` };
                });
                return createResult;

            case 'read':
                const readResult = await sequelize.transaction(async (t) => {
                    if (tablename === dbMaintable) {
                        throw new Error(`'${dbMaintable}' is protected`);
                    }
                    if (tablename.startsWith("deleted_")) {
                        throw new Error(`Invalid table name: ${tablename}`);
                    }

                    const Model = sequelize.define(tablename, {});
                    await Model.sync({ transaction: t });

                    if (id) {
                        const row = await Model.findByPk(id, { transaction: t });
                        if (!row) {
                            throw new Error(`Row with ID ${id} not found in table '${tablename}'`);
                        }
                        return { success: true, data: row };
                    } else {
                        const rows = await Model.findAll({ transaction: t });
                        return { success: true, data: rows };
                    }
                });
                return readResult;

            case 'update':
                const updateResult = await sequelize.transaction(async (t) => {
                    if (tablename === dbMaintable) {
                        throw new Error(`'${dbMaintable}' is protected`);
                    }
                    if (tablename.startsWith("deleted_")) {
                        throw new Error(`Invalid table name: ${tablename}`);
                    }

                    const { content } = tabledata;
                    const dynamicModel = sequelize.define(tablename, tabledata, { tableName: tablename, });
                    await dynamicModel.sync({ alter: true, transaction: t });

                    if (!dynamicModel) {
                        throw new Error(`Model for table '${tablename}' not found`);
                    }

                    const [updatedRows] = await dynamicModel.update(tabledata, {
                        where: { id },
                        returning: true,
                        transaction: t,
                    });

                    if (updatedRows > 0) {
                        return { success: true, message: `Row with ID '${id}' in table '${tablename}' updated successfully` };
                    } else {
                        return {
                            success: false,
                            message: `No rows updated. Row with ID ${id} not found in table '${tablename}'`,
                        };
                    }
                });
                return updateResult;

            case 'delete':
                const deleteResult = await sequelize.transaction(async (t) => {
                    if (tablename === dbMaintable) {
                        throw new Error(`'${dbMaintable}' is protected`);
                    }

                    if (id) {
                        const deleteQuery = `DELETE FROM ${tablename} WHERE id = ${id}`;
                        const [deletedRows] = await sequelize.query(deleteQuery, {
                            replacements: { id: id },
                            type: Sequelize.QueryTypes.DELETE,
                            transaction: t,
                        });

                        if (deletedRows > 0) {
                            return { success: true, message: `Row ${id} deleted successfully from table ${tablename}` };
                        } else {
                            return { success: false, message: `No rows deleted. Row with id ${row} not found in table ${tablename}` };
                        }
                    } else {
                        const newTablename = `deleted_${tablename}`;
                        const renameQuery = `ALTER TABLE ${tablename} RENAME TO ${newTablename}`;
                        await sequelize.query(renameQuery, { type: Sequelize.QueryTypes.RAW, transaction: t });

                        return { success: true, message: `Table '${tablename}' soft deleted` };
                    }
                });
                return deleteResult;

            case 'restore':
                const restoreResult = await sequelize.transaction(async (t) => {
                    const originalTablename = tablename.replace(/^deleted_/i, '');
                    const originalTableExists = await sequelize.getQueryInterface().showAllTables().then(tables => tables.includes(originalTablename));

                    if (originalTableExists) {
                        throw new Error(`Table '${originalTablename}' already exists. Cannot restore the soft-deleted table.`);
                    }

                    const renameQuery = `ALTER TABLE ${tablename} RENAME TO ${originalTablename}`;
                    await sequelize.query(renameQuery, { type: Sequelize.QueryTypes.RAW, transaction: t });

                    return { success: true, message: `Table '${tablename}' restored as ${originalTablename}` };
                });
                return restoreResult;

            case 'drop':
                const dropResult = await sequelize.transaction(async (t) => {
                    let dropQuery = `DROP TABLE IF EXISTS ${tablename}`;
                    await sequelize.query(dropQuery, { type: Sequelize.QueryTypes.RAW, transaction: t });

                    return { success: true, message: `Table '${tablename}' dropped successfully` };
                });
                return dropResult;

            default: throw new Error('Invalid action');
        }
		
		return result;
    } catch (error) { throw new Error(`Error handling data: ${error.message}`); }
}

module.exports = {
	getUserData,
	getTableData,
	
	rawQuery,
	handleUser,
	handleTable,
	handleData,
};