"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import ComponentCard from "@/components/common/ComponentCard";
import Button from "@/components/ui/button/Button";
import { useModal } from "@/hooks/useModal";
import { PlusIcon } from "@/icons";
import type { CrewQuery } from "@/lib/crew/types";
import CrewEditor from "./CrewEditor";
import CrewToolbar from "./CrewToolbar";
import CrewTable from "./CrewTable";

export default function CrewSetupPreview() {
  const t = useTranslations("crew");
  const editor = useModal();
  const [query, setQuery] = useState<CrewQuery>({
    page: 1,
    perPage: 10,
    search: "",
    status: "",
    sort: "sort_order",
    direction: "asc",
  });
  return (
    <ComponentCard title={t("listTitle")} desc={t("previewHint")}>
      <div className="flex justify-end">
        <Button
          type="button"
          size="sm"
          startIcon={<PlusIcon className="h-5 w-5" />}
          onClick={editor.openModal}
        >
          {t("previewForm")}
        </Button>
      </div>
      <CrewToolbar query={query} onChange={setQuery} />
      <CrewTable
        members={[]}
        meta={null}
        query={query}
        busy={false}
        permissions={[]}
        onQuery={setQuery}
        onDetail={() => {}}
        onEdit={() => {}}
        onDelete={() => {}}
      />
      {editor.isOpen && (
        <CrewEditor
          preview
          member={null}
          permissions={["media.read", "team_members.publish"]}
          onClose={editor.closeModal}
          onSaved={() => {}}
        />
      )}
    </ComponentCard>
  );
}
