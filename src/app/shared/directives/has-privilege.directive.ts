import { Directive, Input, TemplateRef, ViewContainerRef } from '@angular/core';
import { SessionService } from '../../core/services/session.service';

@Directive({ selector: '[appHasPrivilege]', standalone: true })
export class HasPrivilegeDirective {
  private _flags: string[] = [];
  private _menus: Array<string|number> = [];

  constructor(
    private tpl: TemplateRef<any>,
    private vcr: ViewContainerRef,
    private session: SessionService
  ) {}

  @Input('appHasPrivilege') set setFlags(flags: string[] | string) {
    this._flags = Array.isArray(flags) ? flags : (flags ? [flags] : []);
    this.update();
  }

  @Input() set appHasPrivilegeMenus(menus: Array<string|number>) {
    this._menus = menus || [];
    this.update();
  }

  private update(): void {
    const show = (this._flags.length ? this.session.hasAnyPrivilege(this._flags) : true)
      && (this._menus.length ? this.session.hasAnyMenu(this._menus) : true);
    this.vcr.clear();
    if (show) this.vcr.createEmbeddedView(this.tpl);
  }
}


