import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DepartureDetailsModal } from './departure-details-modal';

describe('DepartureDetailsModal', () => {
  let component: DepartureDetailsModal;
  let fixture: ComponentFixture<DepartureDetailsModal>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DepartureDetailsModal]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DepartureDetailsModal);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
