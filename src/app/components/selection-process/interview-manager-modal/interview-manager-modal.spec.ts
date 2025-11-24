import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InterviewManagerModal } from './interview-manager-modal';

describe('InterviewManagerModal', () => {
  let component: InterviewManagerModal;
  let fixture: ComponentFixture<InterviewManagerModal>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InterviewManagerModal]
    })
    .compileComponents();

    fixture = TestBed.createComponent(InterviewManagerModal);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
