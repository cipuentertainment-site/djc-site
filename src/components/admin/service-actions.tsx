"use client";

import {
  deleteServiceIfUnusedAction,
  setServiceActiveAction,
} from "@/app/admin/actions";
import { ActionButton } from "@/components/admin/action-button";

type ServiceActionsProps = {
  serviceId: string;
  isActive: boolean;
};

export function ServiceActions({ serviceId, isActive }: ServiceActionsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      <ActionButton
        size="sm"
        variant="outline"
        action={() => setServiceActiveAction(serviceId, !isActive)}
      >
        {isActive ? "Disable" : "Enable"}
      </ActionButton>
      <ActionButton
        size="sm"
        variant="destructive"
        action={() => deleteServiceIfUnusedAction(serviceId)}
      >
        Delete if unused
      </ActionButton>
    </div>
  );
}
