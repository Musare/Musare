'use strict';

// ! ! ! TEMPORARY ! ! !
// this is a temporary placeholder for holding cached data until we get Redis implemented

const tables = {};

const lib = {
	addTable: (tableName) => tables[tableName] = [],
	addRow: (tableName, data) => tables[tableName].push(data),
	delTable: (tableName) => delete tables[tableName],
	delRow: (tableName, index) => tables[tableName].splice(index),
	getRow: (tableName, index) => tables[tableName][index],
	getAllRows: (tableName) => tables[tableName],
	findRow: (tableName, key, value) => tables[tableName].find((row) => row[key] == value),
	findRowIndex: (tableName, key, value) => tables[tableName].indexOf(lib.findRow(tableName, key, value))
};

module.exports = lib;
