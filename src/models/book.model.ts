/*
    An example model with custom controller methods override
    and router extensions
*/

import { BaseModel } from './base.model';
import { BaseController } from '../controllers/base.controller';
import { BaseRouter } from '../routes/base.router';
import { Request, Response, NextFunction } from 'express';

export class Book extends BaseModel {

    model: any;

    constructor(public options: any, public name: string) {
        // call the super class and create the model
        super(options, name, {
            id: { type: Number, key: 'primary' },
            title: { type: String, maxlength: 250 },
            author: { type: String, maxlength: 250 },
            genre: { type: String, maxlength: 250 },
            read: { type: Boolean, default: true },
            image_url: { type: String, maxlength: 300 },
            book_type_id: {
                type: Number,
                key: 'foreign',
                references: { table: 'BookType', foreignKey: 'id' },
                onDelete: 'cascade',
                onUpdate: 'cascade'
            },
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

    // init all custom endpoints
    addCustomEndpoints() {
        console.log('create custom endpoints here!');
    }

}