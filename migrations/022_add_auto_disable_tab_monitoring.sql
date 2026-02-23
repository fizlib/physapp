-- Add auto_disable_tab_monitoring_after_test column to collections
ALTER TABLE collections ADD COLUMN auto_disable_tab_monitoring_after_test BOOLEAN DEFAULT true;
