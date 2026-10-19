ALTER POLICY project_read ON "Project" USING (
  "createdById" = public.alis_user_id() OR public.alis_member(id) OR public.alis_client_project(id, false)
);
