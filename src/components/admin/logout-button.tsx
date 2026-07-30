import { LogOut } from "lucide-react";

import { logoutAdminAction } from "@/app/admin/logout/actions";
import { Button } from "@/components/ui/button";

export function LogoutButton() {
  return (
    <form action={logoutAdminAction}>
      <Button type="submit" variant="ghost" className="w-full justify-start">
        <LogOut className="h-4 w-4" />
        Log out
      </Button>
    </form>
  );
}
