import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AdminRoutesComponent } from './admin-routes.component';

describe('AdminRoutesComponent', () => {
  let component: AdminRoutesComponent;
  let fixture: ComponentFixture<AdminRoutesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminRoutesComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AdminRoutesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
