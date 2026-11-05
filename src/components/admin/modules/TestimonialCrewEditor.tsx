"use client";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import {
  adminRequest,
  masterOptions,
  type MasterOption,
} from "@/lib/admin/client";
import type { CrewAssignment } from "@/lib/admin/modules";
import Button from "@/components/ui/button/Button";
import CrewPhotoPicker from "@/components/crew/CrewPhotoPicker";
import VideoPicker from "./VideoPicker";
interface CrewOption {
  id: string;
  name: string;
  position_id: string;
}
export default function TestimonialCrewEditor({
  value,
  disabled,
  permissions,
  onChange,
  onBusyChange,
}: {
  value: CrewAssignment[];
  disabled: boolean;
  permissions: string[];
  onChange: (rows: CrewAssignment[]) => void;
  onBusyChange?: (busy: boolean) => void;
}) {
  const t = useTranslations("management");
  const [data, setData] = useState<{
    crew: CrewOption[];
    positions: MasterOption[];
    loading: boolean;
    error: boolean;
  }>({ crew: [], positions: [], loading: true, error: false });
  const [revision, setRevision] = useState(0),
    [pending, setPending] = useState<Record<string, boolean>>({});
  useEffect(() => {
    let live = true;
    const crew = async () => {
      const result: CrewOption[] = [];
      for (let offset = 0; offset < 10000; offset += 1000) {
        const rows = await adminRequest<CrewOption[]>(
          `rest/v1/team_members?select=id,name,position_id&order=name.asc,id.asc&limit=1000&offset=${offset}`,
        );
        result.push(...rows);
        if (rows.length < 1000) return result;
      }
      throw new Error("limit");
    };
    Promise.all([crew(), masterOptions("positions")])
      .then(([crew, positions]) => {
        if (live) setData({ crew, positions, loading: false, error: false });
      })
      .catch(() => {
        if (live)
          setData({ crew: [], positions: [], loading: false, error: true });
      });
    return () => {
      live = false;
    };
  }, [revision]);
  function update(id: string, patch: Partial<CrewAssignment>) {
    onChange(value.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  }
  function busy(key: string, state: boolean) {
    setPending((current) => {
      if (current[key] === state) return current;
      const next = { ...current, [key]: state };
      return next;
    });
  }
  useEffect(() => {
    onBusyChange?.(Object.values(pending).some(Boolean));
  }, [pending, onBusyChange]);
  const select =
    "h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-800 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100";
  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500 dark:text-gray-400">
        {t("assignmentHint")}
      </p>
      {data.error && (
        <div role="alert">
          <p className="text-sm text-error-600 dark:text-error-400">
            {t("assignmentLoadError")}
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled}
            onClick={() => setRevision((n) => n + 1)}
          >
            {t("refresh")}
          </Button>
        </div>
      )}
      {value.map((row, index) => (
        <div
          key={row.id}
          className="space-y-4 rounded-xl border border-gray-200 p-4 dark:border-gray-700"
        >
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-700 dark:text-gray-200">
              {t("assignmentNumber", { number: index + 1 })}
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={disabled || Object.values(pending).some(Boolean)}
              onClick={() =>
                onChange(value.filter((item) => item.id !== row.id))
              }
            >
              {t("delete")}
            </Button>
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <label className="space-y-2 text-sm text-gray-700 dark:text-gray-200">
              <span>{t("chooseCrew")}</span>
              <select
                value={row.crew_id}
                disabled={disabled || data.loading || data.error}
                className={select}
                onChange={(event) => {
                  const member = data.crew.find(
                    (item) => item.id === event.target.value,
                  );
                  update(row.id, {
                    crew_id: event.target.value,
                    position_id: member?.position_id || "",
                  });
                }}
              >
                <option value="">{t("chooseCrew")}</option>
                {row.crew_id &&
                  !data.crew.some((member) => member.id === row.crew_id) && (
                    <option value={row.crew_id}>
                      {t("masterUnavailable")}
                    </option>
                  )}
                {data.crew.map((member) => (
                  <option
                    key={member.id}
                    value={member.id}
                    disabled={value.some(
                      (other) =>
                        other.id !== row.id && other.crew_id === member.id,
                    )}
                  >
                    {member.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-2 text-sm text-gray-700 dark:text-gray-200">
              <span>{t("eventPosition")}</span>
              <select
                value={row.position_id}
                disabled={disabled || data.loading || data.error}
                className={select}
                onChange={(event) =>
                  update(row.id, { position_id: event.target.value })
                }
              >
                <option value="">{t("choosePosition")}</option>
                {data.positions.map((position) => (
                  <option key={position.id} value={position.id}>
                    {position.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
          {permissions.includes("media.read") && (
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="space-y-2">
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  {t("assignmentPhoto")}
                </p>
                <CrewPhotoPicker
                  value={row.photo_media_id}
                  name={
                    data.crew.find((member) => member.id === row.crew_id)
                      ?.name || "Crew"
                  }
                  disabled={disabled}
                  canUpload={permissions.includes("media.create")}
                  onChange={(id) => update(row.id, { photo_media_id: id })}
                  onBusyChange={(state) => busy(row.id + ":photo", state)}
                  cropAspect={4 / 5}
                />
              </div>
              <div className="space-y-2">
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  {t("assignmentVideo")}
                </p>
                <VideoPicker
                  value={row.video_media_id}
                  disabled={disabled}
                  canUpload={permissions.includes("media.create")}
                  onChange={(id) => update(row.id, { video_media_id: id })}
                  onBusyChange={(state) => busy(row.id + ":video", state)}
                />
              </div>
            </div>
          )}
        </div>
      ))}
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={disabled || data.loading || data.error || value.length >= 50}
        onClick={() =>
          onChange([
            ...value,
            {
              id: crypto.randomUUID(),
              crew_id: "",
              position_id: "",
              photo_media_id: null,
              video_media_id: null,
            },
          ])
        }
      >
        {t("addAssignment")}
      </Button>
    </div>
  );
}
