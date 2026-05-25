-- Cultural Stress Map — persist per-market severity + triggers on simulation runs
alter table simulation_runs
  add column if not exists cultural_stress_map jsonb;
