import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AdminLocationsComponent } from './admin-locations.component';

describe('AdminLocationsComponent', () => {
  let component: AdminLocationsComponent;
  let fixture: ComponentFixture<AdminLocationsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminLocationsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AdminLocationsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
