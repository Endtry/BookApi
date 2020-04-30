import * as path from 'path';
import * as express from 'express';
import * as logger from 'morgan';
import * as bodyParser from 'body-parser';
import * as Models from './models/index';

// cors
const cors = require('cors');
// mongoose
const mongoose = require('mongoose');
// api authentication
const passport = require('passport');
const Strategy = require('passport-local');
const expressJWT = require('express-jwt');
const bcrypt = require('bcrypt-nodejs');

export interface IOption {
    dbType: string,
    dbName: string,
    dbUser: string,
    dbPassword: string,
    dbHost: string,
    dbPort: number,
    connectionString: string
}

export class API {
    static db: any;
    constructor(private app: express.Express, private port: number,
        private options: IOption) {
        this.configureDatabase(app, options);
    }

    private configureDatabase(app: express.Express, options: IOption) {
        switch (options.dbType) {
            case 'mongo':
                mongoose.connect(this.options.connectionString);
                console.log('conn string', this.options.connectionString);
                console.log(`database set to ${this.options.dbType}, and is connected to ${this.options.dbName}`);
                this.initialize(app, options);
                // set this.db = mongoose.connect
                break;
            case 'postgres':
                const pg = require('pg');
                let config = {
                    user: options.dbUser,
                    database: options.dbName,
                    password: options.dbPassword,
                    host: options.dbHost,
                    port: options.dbPort,
                    max: 10, // max number of clients in the pool
                    idleTimeoutMillis: 30000,
                };

                const pool = new pg.Pool(config);

                pool.on('error', function (err: any, client: any) {
                    console.error('idle client error', err.message, err.stack);
                });

                // check if database exists, if not create it 
                let checkConn = `postgres://${this.options.dbUser}:${this.options.dbPassword}@${this.options.dbHost}:${this.options.dbPort}/postgres`; // the default database
                let query = `select count(*) from pg_catalog.pg_database where lower(datname) = lower('${options.dbName}')`;

                pg.connect(checkConn, (err: any, client: any, done: any) => { // connect to postgres db
                    if (err) {
                        console.log('Error while connecting: ' + err);
                    }
                    // check if database exist
                    client.query(query, (err: any, resp: any) => {
                        done(err);
                        if (err) {
                            client.end(); // close the connection
                        } else {
                            if (resp.rows[0].count == 0) {
                                //database does not exist, create one 
                                let create = `CREATE DATABASE "${this.options.dbName}" OWNER ${this.options.dbUser}`;
                                client.query(create, (err: any, resp: any) => {
                                    done(err);
                                    if (err) {
                                        console.log('ignoring the error', err); // ignore if the db is there
                                    } else {
                                        this.initialize(app, options);
                                    }
                                    client.end(); // close the connection
                                });
                            } else {
                                // the database already exist, initialize
                                client.end();
                                this.initialize(app, options);
                            }
                        }
                    });
                });

                API.db = {
                    query: (text: any, values: any, callback: any) => {
                        console.log('from api.ts query: ', text, ' with values: ', values);
                        return pool.query(text, values, callback);
                    },
                    connect: (callback: any) => {
                        return pool.connect(callback);
                    }
                }
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

    private configureMiddleware(app: express.Express): void {
        app.use(logger('dev'));
        app.use(bodyParser.json({ limit: '5mb' }));
        app.use(bodyParser.urlencoded({ extended: false }));
    }

    private configureRoutes(app: express.Express): void {
        Object.keys(Models).forEach((key: any, index: number) => {
            console.log(Models);
            app.use(`/api/v1/${key.toLowerCase()}`, new Models[key](this.options, key).model.router.make());
        });
    }

    private configureJWT(app: express.Express) {
        app.use('/', expressJWT({
            secret: process.env.JWT_SECRET,
            credentialsRequired: true,
            getToken: (req: any) => {
                if (req.headers.authorization && req.headers.authorization.split(' ')[0] === 'Bearer') {
                    return req.headers.authorization.split(' ')[1];
                } else if (req.query && req.query.token) {
                    return req.query.token;
                }
                return null;
            }
        }).unless({
            path: [
                /\/api\/v1\/user\/login(?!\/renew)/,
                /\/api\/v1\/user\/reset-password/,
                /\/api\/v1\/user\/forgot-password/,
                /\/api\/v1\/user\/create-secure/
            ]
        }));
    }

    private configureCors(app: express.Express) {
        app.options('*', cors());
        const corsHostnameWhitelist = [/http:\/\/localhost(?::\d{1,5})?$/];
        app.use(cors({
            origin: corsHostnameWhitelist
        }));
    }

    private initialize(app: express.Express, options: IOption) {
        // this.configureDatabase(options);
        this.configureMiddleware(app);
        //this.configureJWT(app);
        this.configureCors(app);
        this.configureRoutes(app);
    }

    public spawn() {
        this.app.listen(this.port);
    }

}