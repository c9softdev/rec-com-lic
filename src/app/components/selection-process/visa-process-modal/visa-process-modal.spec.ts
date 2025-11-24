import { ComponentFixture, TestBed } from '@angular/core/testing';

import { VisaProcessModal } from './visa-process-modal';

describe('VisaProcessModal', () => {
  let component: VisaProcessModal;
  let fixture: ComponentFixture<VisaProcessModal>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VisaProcessModal]
    })
    .compileComponents();

    fixture = TestBed.createComponent(VisaProcessModal);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
