import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AdminPublicReportsComponent } from './admin-public-reports.component';

describe('AdminPublicReportsComponent', () => {
  let component: AdminPublicReportsComponent;
  let fixture: ComponentFixture<AdminPublicReportsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminPublicReportsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AdminPublicReportsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
