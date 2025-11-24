import { ComponentFixture, TestBed } from '@angular/core/testing';

import { JobProcessModal } from './job-process-modal';

describe('JobProcessModal', () => {
  let component: JobProcessModal;
  let fixture: ComponentFixture<JobProcessModal>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [JobProcessModal]
    })
    .compileComponents();

    fixture = TestBed.createComponent(JobProcessModal);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
