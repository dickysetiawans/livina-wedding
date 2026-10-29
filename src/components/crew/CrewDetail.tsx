"use client";

import { useTranslations } from "next-intl";
import type { CrewMember } from "@/lib/crew/types";
import CrewDialog from "./CrewDialog";
import CrewPortrait from "./CrewPortrait";

interface CrewDetailProps {
  member: CrewMember;
  canReadMedia: boolean;
  onClose: () => void;
}
export default function CrewDetail({
  member,
  canReadMedia,
  onClose,
}: CrewDetailProps) {
  const t = useTranslations("crew");
  return (
    <CrewDialog title={t("detail")} onClose={onClose}>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center gap-5">
          <CrewPortrait
            id={canReadMedia ? member.photo_media_id : null}
            name={member.name}
            className="h-28 w-28"
          />
          <div>
            <h3 className="text-xl font-medium break-words text-gray-900 dark:text-gray-100">
              {member.name}
              {member.is_founder && (
                <small className="ms-2 text-sm text-brand-600 dark:text-brand-400">
                  {t("isFounder")}
                </small>
              )}
            </h3>
            <p className="mt-1 break-words text-gray-500 dark:text-gray-400">
              {member.role_title}
            </p>
          </div>
        </div>
        <dl className="space-y-4 text-sm">
          <div>
            <dt className="mb-1 font-medium text-gray-500 dark:text-gray-400">
              {t("biography")}
            </dt>
            <dd className="break-words whitespace-pre-line text-gray-800 dark:text-gray-200">
              {member.biography}
            </dd>
          </div>
          <div>
            <dt className="mb-1 font-medium text-gray-500 dark:text-gray-400">
              {t("status")}
            </dt>
            <dd className="text-gray-800 dark:text-gray-200">
              {t(member.status)}
            </dd>
          </div>
          <div>
            <dt className="mb-1 font-medium text-gray-500 dark:text-gray-400">
              {t("order")}
            </dt>
            <dd className="text-gray-800 dark:text-gray-200">
              {member.sort_order}
            </dd>
          </div>
        </dl>
      </div>
    </CrewDialog>
  );
}
