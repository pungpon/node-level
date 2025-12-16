import { Routes } from '@angular/router';

import { OrgChartComponent } from './features/org-chart';

export const routes: Routes = [
  {
    path: '',
    redirectTo: '/orgchart',
    pathMatch: 'full',
  },
  {
    path: 'orgchart',
    component: OrgChartComponent,
  },
];
