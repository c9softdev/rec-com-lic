import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { SessionService } from '../services/session.service';

export function privilegeGuard(required?: { privilegeFlags?: string[]; menuIds?: Array<string|number>; }): CanActivateFn {
  return (route) => {
    const session = inject(SessionService);
    const router = inject(Router);
    // Data-driven menuId support
    const dataMenuId = (route.routeConfig?.data as any)?.menuId as string | number | undefined;
    const flagsOk = required?.privilegeFlags?.length ? session.hasAnyPrivilege(required!.privilegeFlags!) : true;
    const menuListToCheck: Array<string|number> = [];
    if (required?.menuIds?.length) menuListToCheck.push(...required.menuIds);
    if (dataMenuId !== undefined && dataMenuId !== null) menuListToCheck.push(dataMenuId);
    const menuOk = menuListToCheck.length ? session.hasAnyMenu(menuListToCheck) : true;
    if (flagsOk && menuOk) return true;
    router.navigate(['/login'], { queryParams: { unauth: '1' } });
    return false;
  };
}


