/*
    An example model with custom controller methods override
    and router extensions
*/

import { BaseModel } from './base.model';
import { BaseController } from '../controllers/base.controller';
import { BaseRouter } from '../routes/base.router';
import { Request, Response, NextFunction } from 'express';

export class Beverage extends BaseModel {

  model: any;

  constructor(public options: any, public name: string) {
    super(options, name, {
      id: { type: Number, key: 'primary' },
      beverage_name: { type: String, maxlength: 150 },
      alcohol_level: { type: String, maxlength: 150 },
      volume: { type: String, maxlength: 150 },
      image_url: { type: String, maxlength: 500 },
      price: { type: Number },
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