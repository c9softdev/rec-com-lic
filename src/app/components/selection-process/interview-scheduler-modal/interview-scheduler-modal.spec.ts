import { ComponentFixture, TestBed } from '@angular/core/testing';
import { InterviewSchedulerModal } from './interview-scheduler-modal';

describe('InterviewSchedulerModal', () => {
  let component: InterviewSchedulerModal;
  let fixture: ComponentFixture<InterviewSchedulerModal>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InterviewSchedulerModal]
    })
    .compileComponents();

    fixture = TestBed.createComponent(InterviewSchedulerModal);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
