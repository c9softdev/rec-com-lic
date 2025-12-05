import { Routes } from '@angular/router';
import { LoginComponent } from './components/login/login.component';
import { DashboardComponent } from './components/dashboard/dashboard.component';
// import { ForgotPasswordComponent } from './components/forgot-password/forgot-password.component';
import { LayoutComponent } from './components/layout/layout.component';
import { ChangePasswordComponent } from './components/change-password/change-password.component';
import { JobCategoryComponent } from './components/job-category/job-category.component';
import { authGuard } from './core/guards/auth.guard';
import { EmployeeManagerComponent } from './components/employee-manager/employee-manager.component';
// import { CityManagementComponent } from './components/city-management/city-management.component';
import { ClientManagerComponent } from './components/client-manager/client-manager.component';
import { GrievanceComponent } from './components/grievance/grievance.component';
import { CityManagementComponent } from './components/city-management/city-management.component';
import { QualificationManagerComponent } from './components/qualification-manager/qualification-manager.component';
import { DropdownComponent } from './components/dropdown/dropdown.component';
import { ProjectManagerComponent } from './components/project-manager/project-manager.component';
import { JobseekerManagerComponent } from './components/jobseeker-manager/jobseeker-manager.component';
import { GlobalSettingInner } from './components/global-setting-inner/global-setting-inner';
import { PrintJobseekerComponent } from './shared/components/print-jobseeker/print-jobseeker.component';
import { privilegeGuard } from './core/guards/privilege.guard';
import { ArchiveManagerComponent } from './components/archive-manager/archive-manager.component';
import { SelectionProcess } from './components/selection-process/selection-process';
import { licenseGuard } from './core/guards/license.guard';
import { ErrorPageComponent } from './components/error/error-page.component';


export const routes: Routes = [
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  { path: 'login', component: LoginComponent, canActivate: [licenseGuard] },
  // { path: 'forgot', component: ForgotPasswordComponent },
  // Standalone print route outside of main layout so it does not render inside the app chrome
  { path: 'archive-manager/:id', component: ArchiveManagerComponent, canActivate: [authGuard, licenseGuard] },
  { path: 'print-resume/:id', component: PrintJobseekerComponent, canActivate: [authGuard, licenseGuard] },
  { path: 'jobseeker-edit/:id', component: JobseekerManagerComponent, canActivate: [authGuard, licenseGuard] },
  { path: 'error', component: ErrorPageComponent },
  {
    path: '',
    component: LayoutComponent,
    canActivateChild: [authGuard, licenseGuard],
    children: [
      { path: 'dashboard', component: DashboardComponent },
      { path: 'change-password', component: ChangePasswordComponent },
      { path: 'job-category', component: JobCategoryComponent, canActivate: [privilegeGuard() as any], data: { menuId: '20' } },
      { path: 'employee-manager', component: EmployeeManagerComponent, canActivate: [privilegeGuard() as any], data: { menuId: '22' } },
      { path: 'city-management', component: CityManagementComponent, canActivate: [privilegeGuard() as any], data: { menuId: '10' } },
      { path: 'client-manager', component: ClientManagerComponent, canActivate: [privilegeGuard() as any], data: { menuId: '15' } },
      // { path: 'grievances', component: GrievanceComponent, canActivate: [privilegeGuard() as any], data: { menuId: '30' } },
      { path: 'qualification', component: QualificationManagerComponent, canActivate: [privilegeGuard() as any], data: { menuId: '9' } },
      { path: 'dropdown', component: DropdownComponent, canActivate: [privilegeGuard() as any], data: { menuId: '8' } },
      { path: 'project-manager', component: ProjectManagerComponent, canActivate: [privilegeGuard() as any], data: { menuId: '26' } },
      { path: 'selection-manager', component: ProjectManagerComponent, canActivate: [privilegeGuard() as any], data: { menuId: '26', selectionId: '1' } },
      { path: 'selection-process', component: SelectionProcess, canActivate: [privilegeGuard() as any] },
      { path: 'jobseeker-manager', component: JobseekerManagerComponent, canActivate: [privilegeGuard() as any], data: { menuId: '24' } },
      { path: 'jobseeker-manager/add', component: JobseekerManagerComponent, canActivate: [privilegeGuard() as any], data: { menuId: '24', showAddForm: true } },
      { path: 'assign-cv-manager', component: JobseekerManagerComponent, canActivate: [privilegeGuard() as any], data: { menuId: '27', assignCvMode: true } },
      { path: 'setting', component: GlobalSettingInner, canActivate: [privilegeGuard() as any], data: { menuId: '3' } },
    ]
  },
  { path: '**', component: ErrorPageComponent, data: { type: '404' } }
];
