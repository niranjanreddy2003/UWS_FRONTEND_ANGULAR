import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AdminFeedbacksComponent } from './admin-feedbacks.component';

describe('AdminFeedbacksComponent', () => {
  let component: AdminFeedbacksComponent;
  let fixture: ComponentFixture<AdminFeedbacksComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminFeedbacksComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AdminFeedbacksComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
