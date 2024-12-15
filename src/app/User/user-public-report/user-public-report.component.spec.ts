import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UserPublicReportComponent } from './user-public-report.component';

describe('UserPublicReportComponent', () => {
  let component: UserPublicReportComponent;
  let fixture: ComponentFixture<UserPublicReportComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UserPublicReportComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(UserPublicReportComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
