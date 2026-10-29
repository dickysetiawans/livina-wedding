"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import ComponentCard from "@/components/common/ComponentCard";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import Button from "@/components/ui/button/Button";
import { Link, useRouter } from "@/i18n/navigation";
import { PlusIcon } from "@/icons";
import { useModal } from "@/hooks/useModal";
import {
  configured,
  CrewApiError,
  deleteCrew,
  listCrew,
  logout,
} from "@/lib/crew/client";
import type {
  CrewMember,
  CrewQuery,
  ListResult,
  SessionContext,
} from "@/lib/crew/types";
import CrewDialog from "./CrewDialog";
import CrewEditor from "./CrewEditor";
import CrewDetail from "./CrewDetail";
import CrewSignIn from "./CrewSignIn";
import CrewTable from "./CrewTable";
import CrewToolbar from "./CrewToolbar";
import CrewSetupPreview from "./CrewSetupPreview";

export default function CrewManager({
  initialContext,
}: {
  initialContext: SessionContext;
}) {
  const router = useRouter();
  const t = useTranslations("crew");
  const [auth, setAuth] = useState<SessionContext | null>(initialContext);
  const checking = false;
  const [query, setQuery] = useState<CrewQuery>({
    page: 1,
    perPage: 10,
    search: "",
    status: "",
    sort: "sort_order",
    direction: "asc",
  });
  const [result, setResult] = useState<ListResult<CrewMember> | null>(null);
  const [busy, setBusy] = useState(false);
  const [revision, setRevision] = useState(0);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [selected, setSelected] = useState<CrewMember | null>(null);
  const [detail, setDetail] = useState<CrewMember | null>(null);
  const [removing, setRemoving] = useState<CrewMember | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const deleteLock = useRef(false);
  const editor = useModal();
  const canRead = Boolean(auth?.permissions.includes("team_members.read"));
  useEffect(() => {
    if (!auth) {
      router.replace("/admin");
      router.refresh();
    }
  }, [auth, router]);
  useEffect(() => {
    if (!canRead) return;
    let active = true;
    setBusy(true);
    setError("");
    const timer = setTimeout(async () => {
      try {
        const next = await listCrew(query);
        if (!active) return;
        if (next.meta.total_pages > 0 && query.page > next.meta.total_pages) {
          setQuery((current) => ({ ...current, page: next.meta.total_pages }));
          return;
        }
        if (!next.meta.total_pages && query.page > 1) {
          setQuery((current) => ({ ...current, page: 1 }));
          return;
        }
        setResult(next);
      } catch (error) {
        if (!active) return;
        setError(error instanceof CrewApiError ? error.code : "network");
        setResult(null);
        if (error instanceof CrewApiError && error.status === 401)
          setAuth(null);
      } finally {
        if (active) setBusy(false);
      }
    }, 250);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [query, canRead, revision, auth]);
  async function signOut() {
    setBusy(true);
    try {
      await logout();
    } catch {
      /* Sesi lokal tetap dihapus saat jaringan gagal. */
    } finally {
      setAuth(null);
      setResult(null);
      setError("");
      setNotice("");
      setBusy(false);
    }
  }
  async function remove() {
    if (!removing || deleteLock.current) return;
    deleteLock.current = true;
    setDeleting(true);
    setDeleteError("");
    try {
      await deleteCrew(removing.id);
      setRemoving(null);
      setNotice("deleted");
      setRevision((value) => value + 1);
    } catch (error) {
      setDeleteError(error instanceof CrewApiError ? error.code : "network");
    } finally {
      deleteLock.current = false;
      setDeleting(false);
    }
  }
  return (
    <div className="min-w-0 space-y-6">
      <PageBreadcrumb pageTitle={t("adminTitle")} />
      <div className="flex flex-wrap items-start justify-between gap-4">
        <p className="max-w-2xl text-sm leading-relaxed text-gray-500 dark:text-gray-400">
          {t("description")}
        </p>
        <Link
          href="/the-crew"
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm font-medium text-brand-600 dark:text-brand-400"
        >
          {t("publicLink")}
        </Link>
      </div>
      {!configured ? (
        <>
          <ComponentCard title={t("setupTitle")} desc={t("setupHint")}>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              supabase/README.md
            </p>
          </ComponentCard>
          <CrewSetupPreview />
        </>
      ) : checking ? (
        <p role="status" className="text-gray-500 dark:text-gray-400">
          {t("loading")}
        </p>
      ) : !auth ? (
        <>
          <CrewSignIn
            onSignedIn={(value) => {
              setAuth(value);
              setError("");
            }}
          />
          {error && (
            <p
              role="alert"
              className="text-sm text-error-600 dark:text-error-400"
            >
              {t(`errors.${error}`)}
            </p>
          )}
        </>
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-gray-600 dark:text-gray-300">
              {t("signedInAs", { name: auth.user.name })}
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={signOut}
              disabled={busy}
            >
              {t("signOut")}
            </Button>
          </div>
          {!canRead ? (
            <p
              role="alert"
              className="text-sm text-error-600 dark:text-error-400"
            >
              {t("noAccess")}
            </p>
          ) : (
            <ComponentCard title={t("listTitle")}>
              <div className="flex flex-wrap justify-end gap-3">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={busy}
                  onClick={() => setRevision((value) => value + 1)}
                >
                  {t("refresh")}
                </Button>
                {auth.permissions.includes("team_members.create") && (
                  <Button
                    type="button"
                    size="sm"
                    startIcon={<PlusIcon className="h-5 w-5" />}
                    onClick={() => {
                      setSelected(null);
                      editor.openModal();
                    }}
                  >
                    {t("add")}
                  </Button>
                )}
              </div>
              <CrewToolbar query={query} onChange={setQuery} />
              {notice && (
                <p
                  role="status"
                  className="text-sm text-success-700 dark:text-success-400"
                >
                  {t(notice)}
                </p>
              )}
              {error && (
                <p
                  role="alert"
                  className="text-sm text-error-600 dark:text-error-400"
                >
                  {t(`errors.${error}`)}
                </p>
              )}
              <CrewTable
                members={result?.data || []}
                meta={result?.meta || null}
                query={query}
                busy={busy}
                permissions={auth.permissions}
                onQuery={setQuery}
                onDetail={setDetail}
                onEdit={(member) => {
                  setSelected(member);
                  editor.openModal();
                }}
                onDelete={(member) => {
                  setRemoving(member);
                  setDeleteError("");
                }}
              />
            </ComponentCard>
          )}
          {editor.isOpen && (
            <CrewEditor
              member={selected}
              permissions={auth.permissions}
              onClose={editor.closeModal}
              onSaved={() => {
                editor.closeModal();
                setNotice("saved");
                setRevision((value) => value + 1);
              }}
            />
          )}
          {detail && (
            <CrewDetail
              member={detail}
              canReadMedia={auth.permissions.includes("media.read")}
              onClose={() => setDetail(null)}
            />
          )}
          {removing && (
            <CrewDialog
              title={t("deleteTitle")}
              onClose={() => setRemoving(null)}
              busy={deleting}
            >
              <div className="space-y-5">
                <p className="text-sm leading-relaxed text-gray-600 dark:text-gray-300">
                  {t("deleteDescription", { name: removing.name })}
                </p>
                {deleteError && (
                  <p
                    role="alert"
                    className="text-sm text-error-600 dark:text-error-400"
                  >
                    {t(`errors.${deleteError}`)}
                  </p>
                )}
                <div className="flex flex-wrap justify-end gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={deleting}
                    onClick={() => setRemoving(null)}
                  >
                    {t("cancel")}
                  </Button>
                  <Button type="button" disabled={deleting} onClick={remove}>
                    {t("deleteConfirm")}
                  </Button>
                </div>
              </div>
            </CrewDialog>
          )}
        </>
      )}
    </div>
  );
}
