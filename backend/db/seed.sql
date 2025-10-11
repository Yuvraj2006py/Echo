-- Sample data for local testing
insert into entries (user_id, text, source, tags, emotion_json)
values
  (
    :'user_id',
    'Quick win: wrapped the sprint demo and the team felt proud.',
    'web',
    '{Proud,Focused}',
    '[{"label":"joy","score":0.78},{"label":"neutral","score":0.12},{"label":"sadness","score":0.1}]'
  ),
  (
    :'user_id',
    'Back-to-back meetings left me drained and tense.',
    'mobile',
    '{Drained,Frustrated}',
    '[{"label":"anxiety","score":0.61},{"label":"sadness","score":0.26},{"label":"neutral","score":0.13}]'
  );

insert into coping_kits (user_id, actions)
values (:'user_id', '{2-min breathe,Quick walk,Text a friend}')
on conflict (user_id) do update set actions = excluded.actions;

insert into digest_prefs (user_id, weekly_email_enabled)
values (:'user_id', true)
on conflict (user_id) do update set weekly_email_enabled = excluded.weekly_email_enabled;
