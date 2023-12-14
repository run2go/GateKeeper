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
const printQueriesEnabled = (process.env.PRINT_QUERIES_ENABLED === "true");

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
	catch (error) { throw new Error(`Error fetching user data: ${error.message}`); }
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

async function handleUser(action, user, pass, isAdmin = false) { // User Management
    try {
        const bcrypt = require('bcrypt');
		const util = require('./util.js');
        const datetime = new Date();

        switch (action) {
            case 'create':
                if (util.getUserList().includes(user)) { throw new Error(`User '${user}' already exists`); }
                const hash = await bcrypt.hash(pass, 10);
                const createResult = await sequelize.transaction(async (t) => {
                    const createUser = await maintable.create(
                        { username: user, password: hash, admin: isAdmin, createdAt: datetime, updatedAt: datetime },
                        { transaction: t });
                    return `User '${user}' created at '${console.getTimestamp()}'`;
                });
				await util.updateUserList();
                return createResult;

            case 'read':
                const readResult = await sequelize.transaction(async (t) => {
                    const readUser = await maintable.findOne(
                        { where: { username: user }, transaction: t });
                    return readUser.toJSON();
				});
				return readResult;

            case 'update':
				if (!util.getUserList().includes(user)) { throw new Error(`User '${user}' not found`); }
                const hashUpdate = pass ? await bcrypt.hash(pass, 10) : null;
                const updateResult = await sequelize.transaction(async (t) => {
                    let values = { admin: isAdmin, updatedAt: datetime };
                    if (pass) { values.password = hashUpdate; }
                    const updateUser = await maintable.update(
                        values,
                        { where: { username: user }, transaction: t });
                    return `User '${user}' updated at '${console.getTimestamp()}'`;
                });
				await util.updateUserList();
                return updateResult;

            case 'delete':
				if (!util.getUserList().includes(user)) { throw new Error(`User '${user}' not found`); }
				if (util.getUserListDeleted().includes(user)) { throw new Error(`User '${user}' already deleted`); }
                const deleteResult = await sequelize.transaction(async (t) => {
                    const deleteUser = await maintable.update(
                        { deletedAt: datetime },
                        { where: { username: user }, transaction: t });
                    return `User '${user}' deleted at '${console.getTimestamp()}'`;
                });
				await util.updateUserList();
                return deleteResult;

            case 'restore':
				if (!util.getUserListDeleted().includes(user)) { throw new Error(`User '${user}' not found in deleted users`); }
                const restoreResult = await sequelize.transaction(async (t) => {
                    const restoreUser = await maintable.update(
                        { updatedAt: datetime, deletedAt: null },
                        { where: { username: user }, transaction: t });
                    return `User '${user}' restored at '${console.getTimestamp()}'`;
                });
				await util.updateUserList();
                return restoreResult;

            case 'drop':
				if (!util.getUserList().includes(user)) { throw new Error(`User '${user}' doesn't exist`); }
                const dropResult = await sequelize.transaction(async (t) => {
                    await maintable.destroy(
                        { where: { username: user }, transaction: t });
                    return `User '${user}' dropped at '${console.getTimestamp()}'`;
                });
				await util.updateUserList();
                return dropResult;

            default: throw new Error('Invalid action');
        }

    } catch (error) { throw new Error(error.message); }
}

async function handleTable(action, table, data) { // Table Management
    try {
		const util = require('./util.js');
        const datetime = new Date();
		
        switch (action) {
            case 'create':
				if (util.getTableList().includes(table)) { throw new Error(`Table '${table}' already exists`); }
                else if (table.startsWith("deleted_")) { throw new Error(`Table name '${table}' is invalid`); }
                const createResult = await sequelize.transaction(async (t) => {
                    const dynamicModel = sequelize.define(table, data, { tableName: table });
                    await dynamicModel.sync({ alter: true, transaction: t });

                    return `Table '${table}' created at ${console.getTimestamp()}`;
                });
				await util.updateTableList();
                return createResult;

            case 'read':
				if (!util.getTableList().includes(table)) { throw new Error(`Table '${table}' not found`); }
                const readResult = await sequelize.transaction(async (t) => {
                    const dynamicModel = sequelize.define(table, {});
                    await dynamicModel.sync({ transaction: t });

                    const rows = await dynamicModel.findAll({ transaction: t });
                    return rows;
                });
                return readResult;

            case 'update':
				if (!util.getTableList().includes(table)) { throw new Error(`Table '${table}' not found`); }
                const updateResult = await sequelize.transaction(async (t) => {
                    const dynamicModel = sequelize.define(table, data, { tableName: table });
                    await dynamicModel.sync({ alter: true, transaction: t });

                    return `Table '${table}' updated at ${console.getTimestamp()}`;
                });
				await util.updateTableList();
                return updateResult;

            case 'delete':
				if (!util.getTableList().includes(table)) { throw new Error(`Table '${table}' not found`); }
                const deleteResult = await sequelize.transaction(async (t) => {
                    const newTablename = `deleted_${table}`;
                    const renameQuery = `ALTER TABLE ${table} RENAME TO ${newtable}`;
                    await sequelize.query(renameQuery, { type: Sequelize.QueryTypes.RAW, transaction: t });

                    return `Table '${table}' soft deleted at ${console.getTimestamp()}`;
                });
				await util.updateTableList();
                return deleteResult;

            case 'restore':
				if (!util.getTableList().includes(table)) { throw new Error(`Table '${table}' not found`); }
                const restoreResult = await sequelize.transaction(async (t) => {
                    const originalTablename = table.replace(/^deleted_/i, '');
                    const originalTableExists = await sequelize.getQueryInterface().showAllTables().then(tables => tables.includes(originalTablename));
                    if (originalTableExists) { throw new Error(`Table '${originaltable}' already exists. Cannot restore the soft-deleted table.`); }

                    const renameQuery = `ALTER TABLE ${table} RENAME TO ${originaltable}`;
                    await sequelize.query(renameQuery, { type: Sequelize.QueryTypes.RAW, transaction: t });

                    return `Table '${table}' restored as ${originaltable} at ${console.getTimestamp()}`;
                });
				await util.updateTableList();
                return restoreResult;

            case 'drop':
				if (!util.getTableList().includes(table)) { throw new Error(`Table '${table}' not found`); }
                const dropResult = await sequelize.transaction(async (t) => {
                    let dropQuery = `DROP TABLE IF EXISTS ${table}`;
                    await sequelize.query(dropQuery, { type: Sequelize.QueryTypes.RAW, transaction: t });

                    return `Table '${table}' dropped at ${console.getTimestamp()}`;
                });
				await util.updateTableList();
                return dropResult;

            default: throw new Error('Invalid action');
        }
		
    } catch (error) { throw new Error(error.message); }
}

async function handleData(action, table, data, id = false) { // Handle Table Data
    try {
        const datetime = new Date();
        let result;
		if (tablename === dbMaintable) { throw new Error(`'${dbMaintable}' is protected`); }
        
		switch (action) {
            case 'create':
                const createResult = await sequelize.transaction(async (t) => {
					if (table.startsWith("deleted_")) { throw new Error(`Invalid table name: ${table}`); }
					else if (!tabledata) { throw new Error(`Invalid table data provided`); }

                    data.deletedAt = {
                        type: DataTypes.DATE,
                        allowNull: true,
                    };
                    const { content } = tabledata;
                    const dynamicModel = sequelize.define(table, data, { tableName: table, });
                    await dynamicModel.sync({ alter: true, transaction: t });

                    return `Table '${table}' created and data inserted successfully`;
                });
                return createResult;

            case 'read':
                const readResult = await sequelize.transaction(async (t) => {
                    if (table.startsWith("deleted_")) { throw new Error(`Invalid table name: ${table}`); }

                    const dynamicModel = sequelize.define(table, {});
                    await dynamicModel.sync({ transaction: t });

                    if (id) {
                        const row = await dynamicModel.findByPk(id, { transaction: t });
                        if (!row) {
                            throw new Error(`Row with ID ${id} not found in table '${table}'`);
                        }
                        return { success: true, data: row };
                    } else {
                        const rows = await dynamicModel.findAll({ transaction: t });
                        return rows;
                    }
                });
                return readResult;

            case 'update':
                const updateResult = await sequelize.transaction(async (t) => {
                    if (table.startsWith("deleted_")) { throw new Error(`Invalid table name: ${table}`); }

                    const { content } = tabledata;
                    const dynamicModel = sequelize.define(table, data, { tableName: table, });
                    await dynamicModel.sync({ alter: true, transaction: t });

                    if (!dynamicModel) { throw new Error(`Model for table '${table}' not found`); }

                    const [updatedRows] = await dynamicModel.update(data, {
                        where: { id },
                        returning: true,
                        transaction: t,
                    });

                    if (updatedRows > 0) { return `Row with ID '${id}' in table '${table}' updated successfully`; }
					throw new Error(`No rows updated. Row with ID ${id} not found in table '${table}'`);
                });
                return updateResult;

            case 'delete':
                const deleteResult = await sequelize.transaction(async (t) => {
                    if (id) {
                        const deleteQuery = `DELETE FROM ${table} WHERE id = ${id}`;
                        const [deletedRows] = await sequelize.query(deleteQuery, {
                            replacements: { id: id },
                            type: Sequelize.QueryTypes.DELETE,
                            transaction: t,
                        });

                        if (deletedRows > 0) { return `Row ${id} deleted successfully from table ${table}`; } 
						throw new Error(`No rows deleted. Row with id ${row} not found in table ${table}`);
                    } else {
                        const newTablename = `deleted_${table}`;
                        const renameQuery = `ALTER TABLE ${table} RENAME TO ${newtable}`;
                        await sequelize.query(renameQuery, { type: Sequelize.QueryTypes.RAW, transaction: t });

                        return `Table '${table}' soft deleted`;
                    }
                });
                return deleteResult;

            case 'restore':
                const restoreResult = await sequelize.transaction(async (t) => {
                    const originalTablename = table.replace(/^deleted_/i, '');
                    const originalTableExists = await sequelize.getQueryInterface().showAllTables().then(tables => tables.includes(originalTablename));

                    if (originalTableExists) {
                        throw new Error(`Table '${originaltable}' already exists. Cannot restore the soft-deleted table.`);
                    }

                    const renameQuery = `ALTER TABLE ${table} RENAME TO ${originaltable}`;
                    await sequelize.query(renameQuery, { type: Sequelize.QueryTypes.RAW, transaction: t });

                    return `Table '${table}' restored as ${originaltable}`;
                });
                return restoreResult;

            case 'drop':
                const dropResult = await sequelize.transaction(async (t) => {
                    let dropQuery = `DROP TABLE IF EXISTS ${table}`;
                    await sequelize.query(dropQuery, { type: Sequelize.QueryTypes.RAW, transaction: t });

                    return `Table '${table}' dropped successfully`;
                });
                return dropResult;

            default: throw new Error('Invalid action');
        }
		
		return result;
    } catch (error) { throw new Error(error.message); }
}

module.exports = {	
	getUserData,
	getTableData,
	rawQuery,
	handleUser,
	handleTable,
	handleData,
};