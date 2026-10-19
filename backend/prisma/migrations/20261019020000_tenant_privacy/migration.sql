BEGIN;

-- AlterTable
ALTER TABLE "Client" ADD COLUMN     "createdById" TEXT,
ADD COLUMN     "termsAccepted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "termsAcceptedAt" TIMESTAMP(3),
ADD COLUMN     "termsVersion" TEXT;

-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "createdById" TEXT;

-- CreateTable
CREATE TABLE "ProjectMember" (
    "projectId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProjectMember_pkey" PRIMARY KEY ("projectId","userId")
);

-- CreateTable
CREATE TABLE "TermsAcceptance" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "projectId" TEXT,
    "termsVersion" TEXT NOT NULL,
    "termsHash" TEXT NOT NULL,
    "acceptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "method" TEXT NOT NULL DEFAULT 'PROJECT_ACCESS_LINK',

    CONSTRAINT "TermsAcceptance_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProjectMember_userId_idx" ON "ProjectMember"("userId");

-- CreateIndex
CREATE INDEX "TermsAcceptance_clientId_acceptedAt_idx" ON "TermsAcceptance"("clientId", "acceptedAt");

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectMember" ADD CONSTRAINT "ProjectMember_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectMember" ADD CONSTRAINT "ProjectMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TermsAcceptance" ADD CONSTRAINT "TermsAcceptance_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TermsAcceptance" ADD CONSTRAINT "TermsAcceptance_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

UPDATE "Project" SET "createdById" = (SELECT id FROM "User" WHERE role = 'ADMIN' ORDER BY "createdAt", id LIMIT 1);
UPDATE "Client" SET "createdById" = (SELECT id FROM "User" WHERE role = 'ADMIN' ORDER BY "createdAt", id LIMIT 1);
INSERT INTO "ProjectMember" ("projectId", "userId")
SELECT p.id, u.id FROM "Project" p CROSS JOIN "User" u WHERE u.role = 'ADMIN'
UNION SELECT "projectId", "assignedUserId" FROM "Ticket" WHERE "assignedUserId" IS NOT NULL
UNION SELECT "projectId", "authorId" FROM "Document"
UNION SELECT "projectId", "userId" FROM "Activity"
ON CONFLICT DO NOTHING;

DO $$ BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'alis_tenant') THEN
    CREATE ROLE alis_tenant NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS;
  END IF;
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'alis_app') THEN
    CREATE ROLE alis_app LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS;
  END IF;
END $$;
ALTER ROLE alis_tenant NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS;
ALTER ROLE alis_app LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS;
GRANT alis_tenant TO alis_app;
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
GRANT USAGE ON SCHEMA public TO alis_app, alis_tenant;
GRANT SELECT, INSERT, UPDATE, DELETE ON "User", "Session" TO alis_app;
GRANT SELECT ON "User" TO alis_tenant;
GRANT SELECT, INSERT, UPDATE, DELETE ON "Project", "ProjectMember", "Ticket", "Document", "Comment", "Activity" TO alis_tenant;
GRANT SELECT, INSERT ON "Client" TO alis_tenant;
GRANT UPDATE ("termsAccepted", "termsAcceptedAt", "termsVersion") ON "Client" TO alis_tenant;
GRANT SELECT, INSERT ON "TermsAcceptance" TO alis_tenant;

CREATE FUNCTION public.alis_user_id() RETURNS text LANGUAGE sql STABLE
SET search_path = pg_catalog AS $$ SELECT NULLIF(current_setting('alis.user_id', true), '') $$;
CREATE FUNCTION public.alis_is_admin() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = pg_catalog AS $$
  SELECT EXISTS (SELECT 1 FROM public."User" WHERE id = public.alis_user_id() AND role = 'ADMIN')
$$;
CREATE FUNCTION public.alis_member(project_id text) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = pg_catalog AS $$
  SELECT EXISTS (SELECT 1 FROM public."ProjectMember" WHERE "projectId" = project_id AND "userId" = public.alis_user_id())
    OR EXISTS (SELECT 1 FROM public."Project" WHERE id = project_id AND "createdById" = public.alis_user_id())
$$;
CREATE FUNCTION public.alis_client_project(project_id text, needs_terms boolean DEFAULT true) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = pg_catalog AS $$
  SELECT EXISTS (SELECT 1 FROM public."Project" p JOIN public."Client" c ON c.id = p."clientId"
    WHERE p.id = project_id AND p."accessToken" = NULLIF(current_setting('alis.client_token', true), '')
    AND (NOT needs_terms OR (c."termsAccepted" AND c."termsVersion" = current_setting('alis.terms_version', true))))
$$;
CREATE FUNCTION public.alis_project_progress(project_id text) RETURNS TABLE(total integer, resolved integer) LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = pg_catalog AS $$
  SELECT count(*)::integer, count(*) FILTER (WHERE status = 'RESOLVED')::integer FROM public."Ticket"
  WHERE "projectId" = project_id AND "isVisibleToClient" AND public.alis_member(project_id)
$$;
REVOKE ALL ON FUNCTION public.alis_user_id(), public.alis_is_admin(), public.alis_member(text), public.alis_client_project(text, boolean), public.alis_project_progress(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.alis_user_id(), public.alis_is_admin(), public.alis_member(text), public.alis_client_project(text, boolean), public.alis_project_progress(text) TO alis_tenant;

ALTER TABLE "Project" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Project" FORCE ROW LEVEL SECURITY;
ALTER TABLE "ProjectMember" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ProjectMember" FORCE ROW LEVEL SECURITY;
ALTER TABLE "Ticket" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Ticket" FORCE ROW LEVEL SECURITY;
ALTER TABLE "Document" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Document" FORCE ROW LEVEL SECURITY;
ALTER TABLE "Comment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Comment" FORCE ROW LEVEL SECURITY;
ALTER TABLE "Activity" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Activity" FORCE ROW LEVEL SECURITY;
ALTER TABLE "Client" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Client" FORCE ROW LEVEL SECURITY;
ALTER TABLE "TermsAcceptance" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "TermsAcceptance" FORCE ROW LEVEL SECURITY;

CREATE POLICY project_read ON "Project" FOR SELECT TO alis_tenant
USING (public.alis_member(id) OR public.alis_client_project(id, false));
CREATE POLICY project_create ON "Project" FOR INSERT TO alis_tenant
WITH CHECK (public.alis_is_admin() AND "createdById" = public.alis_user_id());
CREATE POLICY project_update ON "Project" FOR UPDATE TO alis_tenant
USING (public.alis_is_admin() AND public.alis_member(id)) WITH CHECK (public.alis_is_admin() AND public.alis_member(id));
CREATE POLICY project_delete ON "Project" FOR DELETE TO alis_tenant
USING (public.alis_is_admin() AND public.alis_member(id));

CREATE POLICY member_read ON "ProjectMember" FOR SELECT TO alis_tenant USING (public.alis_member("projectId"));
CREATE POLICY member_write ON "ProjectMember" FOR ALL TO alis_tenant
USING (public.alis_is_admin() AND public.alis_member("projectId"))
WITH CHECK (public.alis_is_admin() AND public.alis_member("projectId"));

CREATE POLICY ticket_read ON "Ticket" FOR SELECT TO alis_tenant
USING ((public.alis_member("projectId") AND (public.alis_is_admin() OR "assignedUserId" = public.alis_user_id())) OR ("isVisibleToClient" AND public.alis_client_project("projectId")));
CREATE POLICY ticket_create ON "Ticket" FOR INSERT TO alis_tenant
WITH CHECK (public.alis_is_admin() AND public.alis_member("projectId") AND ("assignedUserId" IS NULL OR EXISTS (SELECT 1 FROM "ProjectMember" m WHERE m."projectId" = "Ticket"."projectId" AND m."userId" = "assignedUserId")));
CREATE POLICY ticket_update ON "Ticket" FOR UPDATE TO alis_tenant
USING (public.alis_member("projectId") AND (public.alis_is_admin() OR "assignedUserId" = public.alis_user_id()))
WITH CHECK (public.alis_member("projectId") AND (public.alis_is_admin() OR "assignedUserId" = public.alis_user_id()) AND ("assignedUserId" IS NULL OR EXISTS (SELECT 1 FROM "ProjectMember" m WHERE m."projectId" = "Ticket"."projectId" AND m."userId" = "assignedUserId")));
CREATE POLICY ticket_delete ON "Ticket" FOR DELETE TO alis_tenant USING (public.alis_is_admin() AND public.alis_member("projectId"));

CREATE POLICY document_read ON "Document" FOR SELECT TO alis_tenant USING (public.alis_member("projectId"));
CREATE POLICY document_create ON "Document" FOR INSERT TO alis_tenant WITH CHECK (public.alis_member("projectId") AND "authorId" = public.alis_user_id());
CREATE POLICY document_update ON "Document" FOR UPDATE TO alis_tenant USING (public.alis_member("projectId")) WITH CHECK (public.alis_member("projectId") AND "authorId" = public.alis_user_id());
CREATE POLICY document_delete ON "Document" FOR DELETE TO alis_tenant USING (public.alis_is_admin() AND public.alis_member("projectId"));

CREATE POLICY activity_read ON "Activity" FOR SELECT TO alis_tenant USING (public.alis_member("projectId"));
CREATE POLICY activity_create ON "Activity" FOR INSERT TO alis_tenant WITH CHECK (public.alis_member("projectId") AND "userId" = public.alis_user_id());

CREATE POLICY client_read ON "Client" FOR SELECT TO alis_tenant USING (
  (public.alis_is_admin() AND "createdById" = public.alis_user_id()) OR EXISTS (SELECT 1 FROM "Project" p WHERE p."clientId" = "Client".id));
CREATE POLICY client_create ON "Client" FOR INSERT TO alis_tenant WITH CHECK (public.alis_is_admin() AND "createdById" = public.alis_user_id());
CREATE POLICY client_accept ON "Client" FOR UPDATE TO alis_tenant
USING (EXISTS (SELECT 1 FROM "Project" p WHERE p."clientId" = "Client".id AND public.alis_client_project(p.id, false)))
WITH CHECK ("termsAccepted" AND "termsAcceptedAt" IS NOT NULL AND "termsVersion" = current_setting('alis.terms_version', true));

CREATE POLICY comment_read ON "Comment" FOR SELECT TO alis_tenant USING (EXISTS (SELECT 1 FROM "Ticket" t
  WHERE t.id = "ticketId" AND (public.alis_member(t."projectId") OR ("isMilestoneFeedback" AND "clientId" IS NOT NULL AND public.alis_client_project(t."projectId")))));
CREATE POLICY comment_create ON "Comment" FOR INSERT TO alis_tenant WITH CHECK (EXISTS (SELECT 1 FROM "Ticket" t JOIN "Project" p ON p.id = t."projectId"
  WHERE t.id = "Comment"."ticketId" AND ((public.alis_member(p.id) AND "Comment"."userId" = public.alis_user_id() AND "Comment"."clientId" IS NULL)
  OR (public.alis_client_project(p.id) AND t."isVisibleToClient" AND "Comment"."userId" IS NULL AND "Comment"."clientId" = p."clientId" AND "Comment"."isMilestoneFeedback"))));

CREATE POLICY acceptance_read ON "TermsAcceptance" FOR SELECT TO alis_tenant
USING (EXISTS (SELECT 1 FROM "Project" p WHERE p."clientId" = "TermsAcceptance"."clientId"));
CREATE POLICY acceptance_create ON "TermsAcceptance" FOR INSERT TO alis_tenant
WITH CHECK (EXISTS (SELECT 1 FROM "Project" p WHERE p.id = "TermsAcceptance"."projectId" AND p."clientId" = "TermsAcceptance"."clientId" AND public.alis_client_project(p.id, false))
AND "termsVersion" = current_setting('alis.terms_version', true));

COMMIT;
