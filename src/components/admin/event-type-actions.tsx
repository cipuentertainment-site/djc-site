"use client";

import {
  deleteEventTypeIfUnusedAction,
  setEventTypeActiveAction,
} from "@/app/admin/actions";
import { ActionButton } from "@/components/admin/action-button";

type EventTypeActionsProps = {
  eventTypeId: string;
  isActive: boolean;
};

export function EventTypeActions({ eventTypeId, isActive }: EventTypeActionsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      <ActionButton
        size="sm"
        variant="outline"
        action={() => setEventTypeActiveAction(eventTypeId, !isActive)}
      >
        {isActive ? "Disable" : "Enable"}
      </ActionButton>
      <ActionButton
        size="sm"
        variant="destructive"
        action={() => deleteEventTypeIfUnusedAction(eventTypeId)}
      >
        Delete if unused
      </ActionButton>
    </div>
  );
}
