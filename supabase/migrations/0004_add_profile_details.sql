-- Add new agricultural context fields to the profiles table
alter table profiles add column if not exists soil_type text;
alter table profiles add column if not exists planting_season text;
alter table profiles add column if not exists machinery_access text;
