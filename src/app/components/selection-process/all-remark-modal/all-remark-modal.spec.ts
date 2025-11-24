import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AllRemarkModal } from './all-remark-modal';

describe('AllRemarkModal', () => {
  let component: AllRemarkModal;
  let fixture: ComponentFixture<AllRemarkModal>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AllRemarkModal]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AllRemarkModal);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
