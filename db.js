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

        if (dbDialect === 'sqlite') { query = "SELECT name FROM sqlite_master WHERE type='table'"; } // SQLite-specific table list query
        else { query = "SHOW TABLES"; } // Default SQL query

        const result = await sequelize.query(query, { type: Sequelize.QueryTypes.SELECT }); // Execute the query
        const tables = result.map((row) => (dbDialect === 'sqlite' ? row.name : row[`Tables_in_${dbDatabase}`])); // Extract table names from the result
        return tables;
    }
    catch (error) { throw new Error(`Error fetching table list: ${error.message}`); }
}

async function rawQuery(query) { // Execute raw SQL queries
    try {
        const result = await sequelize.query(query, { type: Sequelize.QueryTypes.SELECT });
        return [200, true, result];
    }
    catch (error) { throw new Error(`Error processing raw SQL: ${error.message}`); }
}

async function handleUser(action, user, pass, isAdmin = false, userHeader) { // User Management
    try {
        const bcrypt = require('bcrypt');
        const util = require('./util.js');
        const datetime = new Date();

        const transactionResult = await sequelize.transaction(async (t) => {
            switch (action) {
                case 'create':
                    if (util.getUserList().includes(user)) { throw new Error(`User '${user}' already exists`); }
                    const hash = await bcrypt.hash(pass, 10);
                    const createUser = await maintable.create(
                        { username: user, password: hash, admin: isAdmin, createdAt: datetime, updatedAt: datetime },
                        { transaction: t });
                    return [200, true, `User '${user}' created at '${console.getTimestamp()}'`];

                case 'read':
                    if (!util.getUserList().includes(user)) { throw new Error(`User '${user}' not found`); }
                    const readUser = await maintable.findOne(
                        { where: { username: user }, transaction: t });
                    return [200, true, readUser.toJSON()];

                case 'update':
                    if (!util.getUserList().includes(user)) { throw new Error(`User '${user}' not found`); }
                    else if (util.getUserListDeleted().includes(user)) { throw new Error(`User '${user}' is a deleted user`); }
                    let values = { admin: isAdmin, updatedAt: datetime };
                    if (pass) { values.password = await bcrypt.hash(pass, 10); }
                    const updateUser = await maintable.update(
                        values,
                        { where: { username: user }, transaction: t });
                    return [200, true, `User '${user}' updated at '${console.getTimestamp()}'`];

                case 'delete':
					if (user === userHeader) { throw new Error(`Can't delete active user '${user}'`); }
                    else if (!util.getUserList().includes(user)) { throw new Error(`User '${user}' not found`); }
                    else if (util.getUserListDeleted().includes(user)) { throw new Error(`User '${user}' already deleted`); }
                    const deleteUser = await maintable.update(
                        { deletedAt: datetime },
                        { where: { username: user }, transaction: t });
                    return [200, true, `User '${user}' deleted at '${console.getTimestamp()}'`];

                case 'restore':
					if (!util.getUserListDeleted().includes(user)) { throw new Error(`User '${user}' not found in deleted users`); }
                    const restoreUser = await maintable.update(
                        { updatedAt: datetime, deletedAt: null },
                        { where: { username: user }, transaction: t });
                    return [200, true, `User '${user}' restored at '${console.getTimestamp()}'`];

                case 'drop':
					if (user === userHeader) { throw new Error(`Can't drop active user '${user}'`); }
                    else if (!util.getUserList().includes(user)) { throw new Error(`User '${user}' doesn't exist`); }
                    await maintable.destroy(
                        { where: { username: user }, transaction: t });
                    return [200, true, `User '${user}' dropped at '${console.getTimestamp()}'`];

                default: throw new Error('Invalid action');
            }
        });

		await util.updateUserList();
        return transactionResult;

    } catch (error) { throw new Error(error.message); }
}

async function handleTable(action, table, data) {
    try {
		if (table && table === dbMaintable) { throw new Error (`Table '${table}' is protected`); }
        const datetime = new Date();
        const util = require('./util.js');
		
        const transactionResult = await sequelize.transaction(async (t) => {
			let model = sequelize.models[table];
			if (!model && data) {
				model = sequelize.define(table, data, { tableName: table });
				await model.sync({ transaction: t });
			}
			switch (action) {
				case '/create':
                    if (!data) { throw new Error(`Missing 'Data'`); }
					else if (util.getTableList().includes(table)) { throw new Error(`Table '${table}' already exists`); }
					model = sequelize.define(table, { ...data, deletedAt: { type: DataTypes.DATE, allowNull: true } }, { tableName: table, paranoid: true, });
					await model.sync({ alter: true, transaction: t });
                    await model.create(data, { transaction: t });
					return `Table '${table}' created at '${console.getTimestamp()}'`;

				case '/read':
					if (!util.getTableList().includes(table)) { throw new Error(`Table '${table}' doesn't exist`); }
					else if (!data) {
                        const readTable = await model.findAll({ transaction: t });
                        return readTable.map(row => row.toJSON());
					} else {
						const readData = await model.findAll({ where: data, transaction: t });
						return readData.map(row => row.toJSON());
                    }
		  
                case '/add':
                    if (!data) { throw new Error(`Missing 'Data'`); }
					else if (!util.getTableList().includes(table)) { throw new Error(`Table '${table}' doesn't exist`) }
					await model.sync({ alter: true, transaction: t });
                    await model.create(data, { transaction: t });
                    return `Data added to table '${table}' at '${console.getTimestamp()}'`;

                case '/update':
                    if (!data) { throw new Error(`Missing 'Data'`); }
					else if (!util.getTableList().includes(table)) { throw new Error(`Table '${table}' doesn't exist`) }
					await model.sync({ alter: true, transaction: t });
                    await model.update(data, { where: data, transaction: t });
                    return `Data updated in table '${table}' at '${console.getTimestamp()}'`;

                case '/delete':
					if (!util.getTableList().includes(table)) { throw new Error(`Table '${table}' doesn't exist`); }
                    else if (!data) {
                        const deletedTableName = `deleted_${table}`;
                        await sequelize.query(`ALTER TABLE "${table}" RENAME TO "${deletedTableName}"`, { transaction: t });
                        return `Table '${table}' renamed to '${deletedTableName}' at '${console.getTimestamp()}'`;
                    } else {
						await model.update({ deletedAt: datetime }, { where: data, transaction: t });
                        return `Data deleted from table '${table}' at '${console.getTimestamp()}'`;
                    }

                case '/restore':
					if (!util.getTableList().includes(table)) { throw new Error(`Table '${table}' doesn't exist`) }
                    else if (!data) {
                        const originalTableName = table.substring('deleted_'.length);
                        await sequelize.query(`ALTER TABLE "${table}" RENAME TO "${originalTableName}"`, { transaction: t });
                        return `Table '${table}' restored to '${originalTableName}' at '${console.getTimestamp()}'`;
                    } else {
                        await model.update({ deletedAt: null }, { where: data, transaction: t });
                        return `Data restored in table '${table}' at '${console.getTimestamp()}'`;
                    }

                case '/drop':
					if (!util.getTableList().includes(table)) { throw new Error(`Table '${table}' doesn't exist`); }
                    else if (!data) {
                        await model.drop({ transaction: t });
                        return `Table '${table}' dropped at '${console.getTimestamp()}'`;
                    } else {
                        await model.destroy({ where: data, transaction: t });
                        return `Data removed from table '${table}' at '${console.getTimestamp()}'`;
                    }

                default: throw new Error(`Bad Request`);
            }
		});
		
		await util.updateTableList();
        return transactionResult;

    } catch (error) { throw new Error(error.message); }
}

module.exports = {	
	getUserData,
	getTableData,
	rawQuery,
	handleUser,
	handleTable,
};