import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EmigrationModal } from './emigration-modal';

describe('EmigrationModal', () => {
  let component: EmigrationModal;
  let fixture: ComponentFixture<EmigrationModal>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EmigrationModal]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EmigrationModal);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
