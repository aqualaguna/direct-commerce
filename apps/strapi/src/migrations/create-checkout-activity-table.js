'use strict';

/**
 * Migration to create checkout_activity table with partitioning
 * for high-volume checkout analytics data
 */

module.exports = {
  async up(knex) {
    // Create the main partitioned table
    await knex.schema.createTable('checkout_activities', (table) => {
      // Primary key
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      
      // Core tracking fields
      table.string('checkout_session_id').notNullable();
      table.uuid('user_id').references('id').inTable('up_users').onDelete('SET NULL');
      table.string('activity_type', 50).notNullable();
      table.string('step_name', 50);
      table.string('form_field', 100);
      table.string('form_type', 50);
      table.string('field_type', 50);
      table.string('interaction_type', 50);
      
      // JSON data for flexible activity data
      table.jsonb('activity_data');
      
      // Timestamp for partitioning
      table.timestamp('timestamp').notNullable().defaultTo(knex.fn.now());
      table.integer('step_duration');
      
      // Device and session info
      table.string('device_type', 20);
      table.string('browser', 50);
      table.string('os', 50);
      table.string('screen_resolution', 20);
      table.text('referrer');
      table.string('utm_source', 100);
      table.string('utm_medium', 100);
      table.string('utm_campaign', 100);
      table.string('location', 100);
      table.text('user_agent');
      table.string('ip_address', 45);
      table.string('session_id', 255);
      
      // Strapi metadata
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
      
      // Indexes for performance
      table.index(['checkout_session_id', 'timestamp']);
      table.index(['activity_type', 'timestamp']);
      table.index(['user_id', 'timestamp']);
      table.index(['step_name', 'timestamp']);
      table.index(['timestamp']);
      table.index(['created_at']);
    });

    // Create monthly partitions for the current year
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;
    
    // Create partitions for current and next 3 months
    for (let i = 0; i < 4; i++) {
      const month = currentMonth + i;
      const year = currentYear + Math.floor((month - 1) / 12);
      const actualMonth = ((month - 1) % 12) + 1;
      
      const partitionName = `checkout_activities_${year}_${actualMonth.toString().padStart(2, '0')}`;
      const startDate = `${year}-${actualMonth.toString().padStart(2, '0')}-01`;
      const endDate = new Date(year, actualMonth, 1).toISOString().split('T')[0];
      
      await knex.raw(`
        CREATE TABLE ${partitionName} PARTITION OF checkout_activities
        FOR VALUES FROM ('${startDate}') TO ('${endDate}')
      `);
    }

    // Create function to automatically create new partitions
    await knex.raw(`
      CREATE OR REPLACE FUNCTION create_checkout_activity_partition(year_month TEXT)
      RETURNS VOID AS $$
      DECLARE
        partition_name TEXT;
        start_date TEXT;
        end_date TEXT;
      BEGIN
        partition_name := 'checkout_activities_' || year_month;
        start_date := year_month || '-01';
        end_date := (year_month || '-01')::DATE + INTERVAL '1 month';
        
        EXECUTE format('CREATE TABLE IF NOT EXISTS %I PARTITION OF checkout_activities FOR VALUES FROM (%L) TO (%L)',
                      partition_name, start_date, end_date);
      END;
      $$ LANGUAGE plpgsql;
    `);

    // Create function to clean up old partitions (older than 90 days)
    await knex.raw(`
      CREATE OR REPLACE FUNCTION cleanup_old_checkout_activity_partitions()
      RETURNS VOID AS $$
      DECLARE
        partition_name TEXT;
        partition_date DATE;
      BEGIN
        FOR partition_name IN
          SELECT tablename 
          FROM pg_tables 
          WHERE tablename LIKE 'checkout_activities_%'
        LOOP
          -- Extract date from partition name (format: checkout_activities_YYYY_MM)
          partition_date := (substring(partition_name from 'checkout_activities_(\\d{4})_(\\d{2})') || '-01')::DATE;
          
          -- Drop partitions older than 90 days
          IF partition_date < CURRENT_DATE - INTERVAL '90 days' THEN
            EXECUTE 'DROP TABLE IF EXISTS ' || partition_name;
          END IF;
        END LOOP;
      END;
      $$ LANGUAGE plpgsql;
    `);

    // Create a scheduled job to run cleanup (if using pg_cron extension)
    // Note: This requires pg_cron extension to be installed
    try {
      await knex.raw(`
        SELECT cron.schedule('cleanup-checkout-activity-partitions', '0 2 * * *', 
          'SELECT cleanup_old_checkout_activity_partitions();');
      `);
    } catch (error) {
      // pg_cron might not be available, log but don't fail
      console.log('pg_cron extension not available, manual cleanup required');
    }
  },

  async down(knex) {
    // Drop the main table (this will drop all partitions)
    await knex.schema.dropTableIfExists('checkout_activities');
    
    // Drop functions
    await knex.raw('DROP FUNCTION IF EXISTS create_checkout_activity_partition(TEXT)');
    await knex.raw('DROP FUNCTION IF EXISTS cleanup_old_checkout_activity_partitions()');
    
    // Remove cron job if it exists
    try {
      await knex.raw(`
        SELECT cron.unschedule('cleanup-checkout-activity-partitions');
      `);
    } catch (error) {
      // Ignore if cron job doesn't exist
    }
  }
};
