/*
    The default user model is required by the application
*/

import { BaseModel } from './base.model';
import { BaseController } from '../controllers/base.controller';
import { BaseRouter } from '../routes/base.router';
import { Request, Response, NextFunction } from 'express';

const bcrypt = require('bcrypt-nodejs');
const jwt = require('jsonwebtoken');
const saltRounds = 10;

import { API } from '../api';

export class User extends BaseModel {
    model: any;
    constructor(public options: any, public name: string) {
        // call the super class and create the model
        super(options, name, { // must use mongoose.Schema syntax
            id: { type: Number, key: 'primary' },
            email: { type: String, unique: true },
            username: { type: String },
            password: { type: String, maxlength: 200 },
            role: { type: Array },
            image_url:{ type: String, maxlength: 500 },
            super_admin: { type: Boolean, default: false },
            is_activated: { type: Boolean, default: false },
            active: { type: Boolean, default: true },
            created_at: { type: Date, default: Date.now() },
            updated_at: { type: Date, default: Date.now() },
            deleted_at: { type: Date, default: Date.now() }
        });
        // create a controller
        this.model.controller = new BaseController(this.options, this.name, this.model);
        // create a router
        this.model.router = new BaseRouter(this.model.controller);
        // initialize custom endpoints
        this.addCustomEndpoints();
    }

    // override controller methods here
    isSuperAdmin = (req: Request, res: Response, next: NextFunction) => {
        if (this.options.dbType == 'mongo') {
            this.model.findById(req.params.id, (err: any, resp: any) => {
                if (!err) {
                    res.json(this.model.controller.send(200, { is_super_admin: resp.super_admin }));
                } else {
                    res.json(this.model.controller.sendError(500, err));
                }
            });
        } else if (this.options.dbType == 'postgres') {
            API.db.query(`select "super_admin" from "${this.name}" where id='${req.params.id}'`, null, (err: any, user: any) => {
                if (!err) {
                    res.json(this.model.controller.send(200, { isSuperAdmin: user.rows[0] }));
                } else {
                    console.log('error', err);
                    res.json(this.model.controller.sendError(500, err));
                }
            });
        }
    }

    findUser(req: Request, res: Response, next: NextFunction) {
        return new Promise((resolve) => {
            if (this.options.dbType == 'mongo') {
                this.model.findOne({ email: req.body.email }, (err: any, user: any) => {
                    if (err) {
                        console.log('findUser mongo err', err);
                        resolve(err);
                    } else if (user) {
                        resolve(user);
                    } else {
                        console.log('findUser mongo else err', err);
                        resolve({ errorCode: 500, errorMessage: 'find by email error! User may not exist!' });
                    }
                });
            } else if (this.options.dbType == 'postgres') {
                API.db.query(`select * from "${this.name}" where email='${req.body.email}'`, null, (err: any, user: any) => {
                    if (user.rows.length == 0) {
                        resolve({ errorCode: 500, errorMessage: 'find by email error! User may not exist!' });
                    } else {
                        //res.json(user.rows[0]);
                        resolve(user.rows[0]);
                    }
                });
            }
        });
    }

    findByEmail = (req: Request, res: Response, next: NextFunction) => {
        this.findUser(req, res, next).then((resp) => {
            res.json(this.model.controller.send(200, resp));
        });
    }

    createSecureUser = (req: Request, res: Response, next: NextFunction) => {
        this.findUser(req, res, next).then((user) => {
            if (user['errorCode'] == 500) { // user not exist
                let dirtyPassword = req.body['password'];
                bcrypt.hash(dirtyPassword, saltRounds).then((hash: any) => {
                    // Store hash in your password DB.
                    req.body['password'] = hash;
                    this.model.controller.insert(req, res, next);
                });
            } else { // user exist
                res.json(this.model.controller.sendError(401, 'user already exist!'));
            }
        });
    }

    login = (req: Request, res: Response, next: NextFunction) => {
        if (this.options.dbType == 'mongo') {
            this.model.findOne({ email: req.body.email }, (err: any, user: any) => {
                if (err) {
                    res.json(this.model.controller.sendError(500, err));
                } else if (user) {
                    bcrypt.compare(req.body.password, user.password, (err: any, resp: any) => {
                        if (!resp) {
                            res.json(this.model.controller.sendError(500, 'Incorrext password!'));
                        } else {
                            res.json({
                                token: jwt.sign(user, process.env.JWT_SECRET),
                                user: user
                            });
                        }
                    })
                } else {
                    res.json(this.model.controller.sendError(500, err));
                }
            });
        } else if (this.options.dbType == 'postgres') {
            API.db.query(`select * from "${this.name}" where email='${req.body.email}'`, null, (err: any, user: any) => {
                if (err) {
                    res.json(this.model.controller.sendError(500, err));
                } else {
                    if (user && user.rows.length > 0) {
                        bcrypt.compare(req.body.password, user.rows[0].password, (err: any, resp: any) => {
                            if (!resp) {
                                res.json(this.model.controller.sendError(500, 'Incorrect password!'));
                            } else {
                                res.json({
                                    token: jwt.sign(user, process.env.JWT_SECRET),
                                    user: user.rows[0]
                                });
                            }
                        })
                    } else {
                        res.json(this.model.controller.sendError(500, 'User not found!'));
                    }
                }
            });
        }
    }

    // init all custom endpoints
    addCustomEndpoints() {
        this.model.router.extend('/id/:id/super', 'GET', this.isSuperAdmin);
        this.model.router.extend('/login', 'POST', this.login);
        this.model.router.extend('/find-by-email', 'POST', this.findByEmail);
        this.model.router.extend('/create-secure', 'POST', this.createSecureUser);
    }

}