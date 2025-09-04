/**
 * Migration: Remove CheckoutStep and CheckoutForm tables
 * 
 * This migration:
 * 1. Adds new columns to checkout_sessions table
 * 2. Migrates existing step data to new format
 * 3. Removes redundant checkout_steps and checkout_forms tables
 * 
 * Migration ID: 20250126000000_remove_checkout_steps
 */

'use strict';

module.exports = {
  async up(knex) {
    console.log('Starting migration: Remove CheckoutStep and CheckoutForm tables');

    // Step 1: Add new columns to checkout_sessions table
    console.log('Adding new columns to checkout_sessions table...');
    
    await knex.schema.alterTable('checkout_sessions', (table) => {
      // Add current_step column (replaces the enum 'step' column)
      table.string('current_step', 50).defaultTo('cart').notNullable();
      
      // Add step_progress column for tracking step completion and form data
      table.jsonb('step_progress').nullable();
      
      // Add index for better query performance
      table.index(['current_step']);
      table.index(['step_progress'], null, 'gin'); // GIN index for JSONB
    });

    // Step 2: Migrate existing step data to new format
    console.log('Migrating existing step data...');
    
    // Get all existing checkout sessions
    const sessions = await knex('checkout_sessions').select('*');
    
    for (const session of sessions) {
      // Initialize step progress with default structure
      const stepProgress = {
        cart: { isCompleted: false },
        shipping: { isCompleted: false },
        billing: { isCompleted: false },
        payment: { isCompleted: false },
        review: { isCompleted: false },
        confirmation: { isCompleted: false }
      };

      // Determine current step and completion status based on existing data
      let currentStep = 'cart';
      
      // Check if session has shipping address (indicates shipping step completed)
      if (session.shipping_address) {
        stepProgress.shipping.isCompleted = true;
        currentStep = 'shipping';
      }
      
      // Check if session has billing address (indicates billing step completed)
      if (session.billing_address) {
        stepProgress.billing.isCompleted = true;
        currentStep = 'billing';
      }
      
      // Check if session has payment method (indicates payment step completed)
      if (session.payment_method) {
        stepProgress.payment.isCompleted = true;
        currentStep = 'payment';
      }
      
      // Check if session has order (indicates review step completed)
      if (session.order_id) {
        stepProgress.review.isCompleted = true;
        currentStep = 'review';
      }
      
      // Check if session is completed (indicates confirmation step completed)
      if (session.status === 'completed') {
        stepProgress.confirmation.isCompleted = true;
        currentStep = 'confirmation';
      }

      // Update the session with new structure
      await knex('checkout_sessions')
        .where('id', session.id)
        .update({
          current_step: currentStep,
          step_progress: JSON.stringify(stepProgress)
        });
    }

    // Step 3: Drop the old 'step' column (enum column)
    console.log('Dropping old step column...');
    await knex.schema.alterTable('checkout_sessions', (table) => {
      table.dropColumn('step');
    });

    // Step 4: Drop checkout_steps table
    console.log('Dropping checkout_steps table...');
    await knex.schema.dropTableIfExists('checkout_steps');

    // Step 5: Drop checkout_forms table
    console.log('Dropping checkout_forms table...');
    await knex.schema.dropTableIfExists('checkout_forms');

    console.log('Migration completed successfully');
  },

  async down(knex) {
    console.log('Rolling back migration: Remove CheckoutStep and CheckoutForm tables');

    // Step 1: Recreate checkout_steps table
    console.log('Recreating checkout_steps table...');
    await knex.schema.createTable('checkout_steps', (table) => {
      table.increments('id').primary();
      table.string('step_name', 50).notNullable();
      table.integer('step_order').notNullable();
      table.boolean('is_completed').defaultTo(false);
      table.boolean('is_required').defaultTo(true);
      table.boolean('is_active').defaultTo(false);
      table.jsonb('validation_rules').defaultTo('{}');
      table.jsonb('error_messages').defaultTo('{}');
      table.timestamp('completed_at').nullable();
      table.timestamp('started_at').nullable();
      table.integer('time_spent').defaultTo(0);
      table.integer('attempts').defaultTo(0);
      table.timestamp('last_attempt_at').nullable();
      table.jsonb('step_data').defaultTo('{}');
      table.jsonb('validation_errors').defaultTo('{}');
      table.jsonb('navigation_history').defaultTo('[]');
      table.jsonb('analytics').defaultTo('{}');
      table.timestamps(true, true);
      
      // Indexes
      table.index(['step_name']);
      table.index(['step_order']);
      table.index(['is_completed']);
    });

    // Step 2: Recreate checkout_forms table
    console.log('Recreating checkout_forms table...');
    await knex.schema.createTable('checkout_forms', (table) => {
      table.increments('id').primary();
      table.string('step', 50).notNullable();
      table.jsonb('form_data').notNullable();
      table.jsonb('validation_errors').defaultTo('{}');
      table.boolean('is_valid').defaultTo(false);
      table.boolean('submitted').defaultTo(false);
      table.timestamp('submitted_at').nullable();
      table.jsonb('validation_rules').defaultTo('{}');
      table.jsonb('error_messages').defaultTo('{}');
      table.jsonb('accessibility_features').defaultTo('{}');
      table.jsonb('usability_features').defaultTo('{}');
      table.timestamps(true, true);
      
      // Indexes
      table.index(['step']);
      table.index(['is_valid']);
      table.index(['submitted']);
    });

    // Step 3: Add back the old 'step' column
    console.log('Adding back old step column...');
    await knex.schema.alterTable('checkout_sessions', (table) => {
      table.enum('step', ['cart', 'shipping', 'billing', 'payment', 'review', 'confirmation'])
        .defaultTo('cart')
        .notNullable();
    });

    // Step 4: Migrate data back to old format
    console.log('Migrating data back to old format...');
    const sessions = await knex('checkout_sessions').select('*');
    
    for (const session of sessions) {
      // Determine step from current_step
      const step = session.current_step || 'cart';
      
      await knex('checkout_sessions')
        .where('id', session.id)
        .update({ step });
    }

    // Step 5: Drop new columns
    console.log('Dropping new columns...');
    await knex.schema.alterTable('checkout_sessions', (table) => {
      table.dropColumn('current_step');
      table.dropColumn('step_progress');
    });

    console.log('Rollback completed successfully');
  }
};
