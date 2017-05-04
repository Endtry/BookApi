"use strict";
const logger = require('morgan');
const bodyParser = require('body-parser');
const Models = require('./models/index');
// cors
const cors = require('cors');
// mongoose
const mongoose = require('mongoose');
// api authentication
const passport = require('passport');
const Strategy = require('passport-local');
const expressJWT = require('express-jwt');
const bcrypt = require('bcrypt');
// environment variable
const envFile = require('../.env');
const dotEnv = require('dotenv').load(envFile);
class API {
    constructor(app, port, options) {
        this.app = app;
        this.port = port;
        this.options = options;
        this.initialize(app, options);
    }
    configureDatabase(options) {
        switch (options.dbType) {
            case 'mongo':
                mongoose.connect(this.options.connectionString);
                // set this.db = mongoose.connect
                break;
            case 'postgres':
                const pg = require('pg');
                let config = {
                    user: options.user,
                    database: options.dbName,
                    password: options.password,
                    host: options.host,
                    port: options.port,
                    max: 10,
                    idleTimeoutMillis: 30000,
                };
                const pool = new pg.Pool(config);
                pool.on('error', function (err, client) {
                    console.error('idle client error', err.message, err.stack);
                });
                API.db = {
                    query: (text, values, callback) => {
                        console.log('from api.ts query: ', text, values);
                        return pool.query(text, values, callback);
                    },
                    connect: (callback) => {
                        return pool.connect(callback);
                    }
                };
                break;
            case 'mysql':
                break;
            case 'sql-server':
                break;
            default:
                console.log('database default to postgres');
                break;
        }
    }
    configureMiddleware(app) {
        app.use(logger('dev'));
        app.use(bodyParser.json({ limit: '5mb' }));
        app.use(bodyParser.urlencoded({ extended: false }));
    }
    configureRoutes(app) {
        Object.keys(Models).forEach((key, index) => {
            app.use(`/api/v1/${key.toLowerCase()}`, new Models[key](this.options, key).model.router.make());
        });
    }
    configureJWT(app) {
        app.use('/', expressJWT({
            secret: process.env.JWT_SECRET,
            credentialsRequired: true,
            getToken: (req) => {
                if (req.headers.authorization && req.headers.authorization.split(' ')[0] === 'Bearer') {
                    return req.headers.authorization.split(' ')[1];
                }
                else if (req.query && req.query.token) {
                    return req.query.token;
                }
                return null;
            }
        }).unless({
            path: [/\/api\/v1\/user\/login(?!\/renew)/, /\/api\/v1\/user\/reset-password/, /\/api\/v1\/user\/forgot-password/]
        }));
    }
    configureCors(app) {
        app.options('*', cors());
        const corsHostnameWhitelist = [/http:\/\/localhost(?::\d{1,5})?$/];
        app.use(cors({
            origin: corsHostnameWhitelist
        }));
    }
    initialize(app, options) {
        this.configureDatabase(options);
        this.configureMiddleware(app);
        this.configureJWT(app);
        this.configureRoutes(app);
        this.configureCors(app);
    }
    spawn() {
        this.app.listen(this.port);
    }
}
exports.API = API;
