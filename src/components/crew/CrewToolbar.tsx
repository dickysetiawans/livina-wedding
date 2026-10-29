"use client";

import { useTranslations } from "next-intl";
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import type { CrewQuery } from "@/lib/crew/types";

interface CrewToolbarProps {
  query: CrewQuery;
  onChange: (query: CrewQuery) => void;
}
export default function CrewToolbar({ query, onChange }: CrewToolbarProps) {
  const t = useTranslations("crew");
  const selectClass =
    "h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-800 focus-visible:outline-brand-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100";
  const change = (next: Partial<CrewQuery>) =>
    onChange({ ...query, ...next, page: 1 });
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <div>
        <Label htmlFor="crew-search">{t("search")}</Label>
        <Input
          id="crew-search"
          type="search"
          placeholder={t("searchHint")}
          maxLength={100}
          value={query.search}
          onChange={(event) => change({ search: event.target.value })}
        />
      </div>
      <div>
        <Label htmlFor="crew-filter">{t("filter")}</Label>
        <select
          id="crew-filter"
          value={query.status}
          onChange={(event) =>
            change({ status: event.target.value as CrewQuery["status"] })
          }
          className={selectClass}
        >
          <option value="">{t("allStatuses")}</option>
          <option value="draft">{t("draft")}</option>
          <option value="published">{t("published")}</option>
        </select>
      </div>
      <div>
        <Label htmlFor="crew-sort">{t("sort")}</Label>
        <select
          id="crew-sort"
          value={query.sort}
          onChange={(event) =>
            change({ sort: event.target.value as CrewQuery["sort"] })
          }
          className={selectClass}
        >
          <option value="sort_order">{t("order")}</option>
          <option value="name">{t("name")}</option>
          <option value="created_at">{t("created")}</option>
        </select>
      </div>
      <div>
        <Label htmlFor="crew-direction">{t("direction")}</Label>
        <select
          id="crew-direction"
          value={query.direction}
          onChange={(event) =>
            change({ direction: event.target.value as CrewQuery["direction"] })
          }
          className={selectClass}
        >
          <option value="asc">{t("ascending")}</option>
          <option value="desc">{t("descending")}</option>
        </select>
      </div>
    </div>
  );
}
