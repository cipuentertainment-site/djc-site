"use client";

import { unblockDateAction } from "@/app/admin/actions";
import { ActionButton } from "@/components/admin/action-button";

type UnblockDateButtonProps = {
  blockId: string;
};

export function UnblockDateButton({ blockId }: UnblockDateButtonProps) {
  return (
    <ActionButton
      size="sm"
      variant="outline"
      action={() => unblockDateAction(blockId)}
    >
      Unblock
    </ActionButton>
  );
}
