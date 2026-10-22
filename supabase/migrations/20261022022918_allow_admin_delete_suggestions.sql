-- Allow administrators with suggestion-moderation permission to delete submitted ideas, suggestions and assumptions.
create policy "Admin autorisé peut supprimer les propositions"
  on public.suggestions
  for delete
  to authenticated
  using (current_admin_has('write_suggestions'::text));
