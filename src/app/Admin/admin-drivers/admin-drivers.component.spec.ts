import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AdminDriversComponent } from './admin-drivers.component';

describe('AdminDriversComponent', () => {
  let component: AdminDriversComponent;
  let fixture: ComponentFixture<AdminDriversComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminDriversComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AdminDriversComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
